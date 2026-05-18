import { query, getClient } from '../config/db.js';
export async function createDraft(leagueId, pickTimeSeconds = 120) {
    const result = await query(`INSERT INTO drafts (league_id, pick_time_seconds) VALUES ($1, $2) RETURNING *`, [leagueId, pickTimeSeconds]);
    return mapDraft(result.rows[0]);
}
export async function findDraftById(id) {
    const result = await query('SELECT * FROM drafts WHERE id = $1', [id]);
    return result.rows[0] ? mapDraft(result.rows[0]) : null;
}
export async function findDraftByLeague(leagueId) {
    const result = await query('SELECT * FROM drafts WHERE league_id = $1 ORDER BY created_at DESC LIMIT 1', [leagueId]);
    return result.rows[0] ? mapDraft(result.rows[0]) : null;
}
export async function findDraftBySeason(seasonId) {
    const result = await query('SELECT * FROM drafts WHERE season_id = $1 ORDER BY created_at DESC LIMIT 1', [seasonId]);
    return result.rows[0] ? mapDraft(result.rows[0]) : null;
}
export async function createDraftForSeason(leagueId, seasonId, teamIds, pickTimeSeconds = 120) {
    const result = await query(`INSERT INTO drafts (league_id, season_id, pick_time_seconds) VALUES ($1, $2, $3) RETURNING *`, [leagueId, seasonId, pickTimeSeconds]);
    return mapDraft(result.rows[0]);
}
export async function startDraft(draftId, teamIds) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        // Generate snake draft order
        const draftOrder = [];
        const totalRounds = teamIds.length;
        for (let round = 0; round < totalRounds; round++) {
            if (round % 2 === 0) {
                // Even rounds: 1, 3, 5... go in order
                draftOrder.push(...teamIds);
            }
            else {
                // Odd rounds: 2, 4, 6... go in reverse
                draftOrder.push(...[...teamIds].reverse());
            }
        }
        await client.query(`UPDATE drafts SET 
        status = 'active', 
        draft_order = $1,
        started_at = NOW() 
      WHERE id = $2`, [JSON.stringify(draftOrder), draftId]);
        // Update league status
        await client.query(`UPDATE leagues SET draft_status = 'in_progress' 
       WHERE id = (SELECT league_id FROM drafts WHERE id = $1)`, [draftId]);
        await client.query('COMMIT');
        return (await findDraftById(draftId));
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export async function makePick(draftId, teamId, playerId) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const draft = await findDraftById(draftId);
        if (!draft)
            throw new Error('Draft not found');
        if (draft.status !== 'active')
            throw new Error('Draft is not active');
        if (draft.currentManagerId !== teamId)
            throw new Error('Not your turn');
        // Get current pick number
        const currentPickNum = (draft.currentRound - 1) * draft.draftOrder.length + draft.currentPick;
        // Insert pick
        const pickResult = await client.query(`INSERT INTO draft_picks (draft_id, round, pick, team_id, player_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [draftId, draft.currentRound, draft.currentPick, teamId, playerId]);
        // Add player to team's roster
        await client.query(`INSERT INTO roster_slots (team_id, player_id, slot_type, position)
       SELECT $1, $2, 'starter', p.position
       FROM players p WHERE p.id = $2`, [teamId, playerId]);
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
            await client.query(`UPDATE drafts SET status = 'completed', current_pick = $1, current_round = $2, completed_at = NOW() WHERE id = $3`, [draft.currentPick, draft.currentRound, draftId]);
        }
        else {
            const nextManagerId = draft.draftOrder[(nextRound - 1) * draft.draftOrder.length + nextPick - 1];
            await client.query(`UPDATE drafts SET 
          current_pick = $1, 
          current_round = $2,
          current_manager_id = $3
        WHERE id = $4`, [nextPick, nextRound, nextManagerId, draftId]);
        }
        await client.query('COMMIT');
        const updatedDraft = await findDraftById(draftId);
        return { draft: updatedDraft, pick: pickResult.rows[0] };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export async function pauseDraft(draftId) {
    const draft = await findDraftById(draftId);
    if (!draft)
        throw new Error('Draft not found');
    if (draft.status !== 'active')
        throw new Error('Draft is not active');
    await query(`UPDATE drafts SET status = 'paused', paused_at = NOW() WHERE id = $1`, [draftId]);
    return (await findDraftById(draftId));
}
export async function undoPick(draftId) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const draft = await findDraftById(draftId);
        if (!draft)
            throw new Error('Draft not found');
        if (draft.status !== 'active')
            throw new Error('Draft is not active');
        // Get the most recent pick
        const recentPick = await client.query(`SELECT * FROM draft_picks WHERE draft_id = $1 ORDER BY round DESC, pick DESC LIMIT 1`, [draftId]);
        if (recentPick.rows.length === 0) {
            throw new Error('No picks to undo');
        }
        const pick = recentPick.rows[0];
        const round = pick.round;
        const pickNum = pick.pick;
        const teamId = pick.team_id;
        const playerId = pick.player_id;
        // Delete the pick
        await client.query(`DELETE FROM draft_picks WHERE id = $1`, [pick.id]);
        // Remove player from roster
        if (playerId) {
            await client.query(`DELETE FROM roster_slots WHERE team_id = $1 AND player_id = $2`, [teamId, playerId]);
        }
        // Move draft back to previous pick
        let prevPick = round === 1 && pickNum === 1 ? 1 : pickNum - 1;
        let prevRound = round;
        if (prevPick < 1) {
            // Going to previous round
            const totalTeams = draft.draftOrder.length;
            prevPick = totalTeams;
            prevRound = round - 1;
        }
        // Calculate the previous manager
        let prevManagerId = null;
        if (prevRound > 0) {
            const prevPickIndex = (prevRound - 1) * draft.draftOrder.length + prevPick - 1;
            if (prevPickIndex >= 0 && prevPickIndex < draft.draftOrder.length) {
                prevManagerId = draft.draftOrder[prevPickIndex];
            }
        }
        await client.query(`UPDATE drafts SET 
        current_pick = $1, 
        current_round = $2,
        current_manager_id = $3
      WHERE id = $4`, [prevPick, prevRound, prevManagerId, draftId]);
        await client.query('COMMIT');
        const updatedDraft = await findDraftById(draftId);
        return { draft: updatedDraft, pick: pick };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export async function resumeDraft(draftId) {
    const draft = await findDraftById(draftId);
    if (!draft)
        throw new Error('Draft not found');
    if (draft.status !== 'paused')
        throw new Error('Draft is not paused');
    await query(`UPDATE drafts SET status = 'active', paused_at = NULL WHERE id = $1`, [draftId]);
    return (await findDraftById(draftId));
}
export async function getDraftBoard(draftId) {
    const draft = await findDraftById(draftId);
    if (!draft)
        return null;
    const picksResult = await query(`SELECT dp.*, t.name as team_name, p.name as player_name, p.position as player_position, p.profile_image as player_image
     FROM draft_picks dp
     LEFT JOIN teams t ON t.id = dp.team_id
     LEFT JOIN players p ON p.id = dp.player_id
     WHERE dp.draft_id = $1
     ORDER BY dp.round, dp.pick`, [draftId]);
    // Get available players for next pick (limit to 50 for performance)
    const availableResult = await query(`SELECT p.* FROM players p
     WHERE p.status = 'active'
     AND p.id NOT IN (SELECT player_id FROM draft_picks WHERE draft_id = $1 AND player_id IS NOT NULL)
     ORDER BY p.adp ASC NULLS LAST
     LIMIT 50`, [draftId]);
    return {
        draft,
        picks: picksResult.rows,
        availablePlayers: availableResult.rows,
    };
}
function mapDraft(row) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row;
    return {
        id: r.id,
        leagueId: r.league_id,
        seasonId: r.season_id,
        status: r.status,
        currentPick: r.current_pick,
        currentRound: r.current_round,
        currentManagerId: r.current_manager_id,
        draftOrder: typeof r.draft_order === 'string' ? JSON.parse(r.draft_order) : r.draft_order,
        pickTimeSeconds: r.pick_time_seconds,
        pausedAt: r.paused_at,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
    };
}
//# sourceMappingURL=draft.js.map