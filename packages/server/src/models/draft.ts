import { query, getClient } from '../config/db.js';

export interface Draft {
  id: string;
  leagueId: string;
  status: 'scheduled' | 'active' | 'paused' | 'completed';
  currentPick: number;
  currentRound: number;
  currentManagerId: string | null;
  draftOrder: string[];
  pickTimeSeconds: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface DraftPick {
  id: string;
  draftId: string;
  round: number;
  pick: number;
  teamId: string;
  playerId: string | null;
  selectedAt: Date;
}

export async function createDraft(leagueId: string, pickTimeSeconds = 60): Promise<Draft> {
  const result = await query(
    `INSERT INTO drafts (league_id, pick_time_seconds) VALUES ($1, $2) RETURNING *`,
    [leagueId, pickTimeSeconds]
  );
  return mapDraft(result.rows[0]);
}

export async function findDraftById(id: string): Promise<Draft | null> {
  const result = await query('SELECT * FROM drafts WHERE id = $1', [id]);
  return result.rows[0] ? mapDraft(result.rows[0]) : null;
}

export async function findDraftByLeague(leagueId: string): Promise<Draft | null> {
  const result = await query(
    'SELECT * FROM drafts WHERE league_id = $1 ORDER BY created_at DESC LIMIT 1',
    [leagueId]
  );
  return result.rows[0] ? mapDraft(result.rows[0]) : null;
}

export async function startDraft(draftId: string, teamIds: string[]): Promise<Draft> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Generate snake draft order
    const draftOrder: string[] = [];
    const totalRounds = teamIds.length;
    
    for (let round = 0; round < totalRounds; round++) {
      if (round % 2 === 0) {
        // Even rounds: 1, 3, 5... go in order
        draftOrder.push(...teamIds);
      } else {
        // Odd rounds: 2, 4, 6... go in reverse
        draftOrder.push(...[...teamIds].reverse());
      }
    }
    
    await client.query(
      `UPDATE drafts SET 
        status = 'active', 
        draft_order = $1,
        started_at = NOW() 
      WHERE id = $2`,
      [JSON.stringify(draftOrder), draftId]
    );
    
    // Update league status
    await client.query(
      `UPDATE leagues SET draft_status = 'in_progress' 
       WHERE id = (SELECT league_id FROM drafts WHERE id = $1)`,
      [draftId]
    );
    
    await client.query('COMMIT');
    
    return (await findDraftById(draftId))!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function makePick(
  draftId: string,
  teamId: string,
  playerId: string
): Promise<{ draft: Draft; pick: DraftPick }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const draft = await findDraftById(draftId);
    if (!draft) throw new Error('Draft not found');
    if (draft.status !== 'active') throw new Error('Draft is not active');
    if (draft.currentManagerId !== teamId) throw new Error('Not your turn');
    
    // Get current pick number
    const currentPickNum = (draft.currentRound - 1) * draft.draftOrder.length + draft.currentPick;
    
    // Insert pick
    const pickResult = await client.query(
      `INSERT INTO draft_picks (draft_id, round, pick, team_id, player_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [draftId, draft.currentRound, draft.currentPick, teamId, playerId]
    );
    
    // Add player to team's roster
    await client.query(
      `INSERT INTO roster_slots (team_id, player_id, slot_type, position)
       SELECT $1, $2, 'starter', p.position
       FROM players p WHERE p.id = $2`,
      [teamId, playerId]
    );
    
    // Determine next pick
    let nextPick = draft.currentPick + 1;
    let nextRound = draft.currentRound;
    
    if (nextPick > draft.draftOrder.length) {
      nextPick = 1;
      nextRound++;
    }
    
    // Check if draft is complete
    const totalPicks = draft.draftOrder.length * draft.draftOrder.length;
    const isComplete = (nextRound - 1) * draft.draftOrder.length + nextPick > totalPicks;
    
    if (isComplete) {
      await client.query(
        `UPDATE drafts SET status = 'completed', current_pick = $1, current_round = $2, completed_at = NOW() WHERE id = $3`,
        [draft.currentPick, draft.currentRound, draftId]
      );
    } else {
      const nextManagerId = draft.draftOrder[(nextRound - 1) * draft.draftOrder.length + nextPick - 1];
      
      await client.query(
        `UPDATE drafts SET 
          current_pick = $1, 
          current_round = $2,
          current_manager_id = $3
        WHERE id = $4`,
        [nextPick, nextRound, nextManagerId, draftId]
      );
    }
    
    await client.query('COMMIT');
    
    const updatedDraft = await findDraftById(draftId);
    return { draft: updatedDraft!, pick: pickResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getDraftBoard(draftId: string): Promise<{
  draft: Draft;
  picks: DraftPick[];
  availablePlayers: unknown[];
}> {
  const draft = await findDraftById(draftId);
  if (!draft) throw new Error('Draft not found');
  
  const picksResult = await query(
    `SELECT dp.*, t.name as team_name, p.name as player_name, p.position as player_position, p.profile_image as player_image
     FROM draft_picks dp
     LEFT JOIN teams t ON t.id = dp.team_id
     LEFT JOIN players p ON p.id = dp.player_id
     WHERE dp.draft_id = $1
     ORDER BY dp.round, dp.pick`,
    [draftId]
  );
  
  // Get available players for next pick (limit to 50 for performance)
  const availableResult = await query(
    `SELECT p.* FROM players p
     WHERE p.status = 'active'
     AND p.id NOT IN (SELECT player_id FROM draft_picks WHERE draft_id = $1 AND player_id IS NOT NULL)
     ORDER BY p.adp ASC NULLS LAST
     LIMIT 50`,
    [draftId]
  );
  
  return {
    draft,
    picks: picksResult.rows,
    availablePlayers: availableResult.rows,
  };
}

function mapDraft(row: unknown): Draft {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  return {
    id: r.id,
    leagueId: r.league_id,
    status: r.status,
    currentPick: r.current_pick,
    currentRound: r.current_round,
    currentManagerId: r.current_manager_id,
    draftOrder: typeof r.draft_order === 'string' ? JSON.parse(r.draft_order) : r.draft_order,
    pickTimeSeconds: r.pick_time_seconds,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };
}