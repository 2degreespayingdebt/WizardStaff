import { query, getClient } from '../config/db.js';
import { Row } from '../db/types.js';

export interface LeagueSettings {
  scoringFormat: 'standard' | 'ppr' | 'half-ppr';
  rosterPositions: RosterPosition[];
  tradeDeadline: string | null;
  playoffTeams: number;
  waiverType: 'fab' | 'faab' | 'rolling';
}

export interface RosterPosition {
  pos: string;
  count: number;
}

export interface League {
  id: string;
  name: string;
  commissionerId: string;
  maxTeams: number;
  draftStatus: 'pending' | 'in_progress' | 'completed';
  draftDate: Date | null;
  scoringFormat: string;
  rosterPositions: RosterPosition[];
  tradeDeadline: Date | null;
  playoffTeams: number;
  waiverType: string;
  createdAt: Date;
}

export interface LeagueWithSettings extends League {
  settings: LeagueSettings;
}

export async function createLeague(
  name: string,
  commissionerId: string,
  options?: Partial<Pick<League, 'maxTeams' | 'scoringFormat' | 'rosterPositions'>>
): Promise<LeagueWithSettings> {
  const result = await query(
    `INSERT INTO leagues (name, commissioner_id, max_teams, scoring_format, roster_positions)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      name,
      commissionerId,
      options?.maxTeams || 10,
      options?.scoringFormat || 'standard',
      JSON.stringify(options?.rosterPositions || [
        { pos: 'QB', count: 1 },
        { pos: 'RB', count: 2 },
        { pos: 'WR', count: 2 },
        { pos: 'TE', count: 1 },
        { pos: 'K', count: 1 },
        { pos: 'DEF', count: 1 },
      ]),
    ]
  );
  return mapLeagueWithSettings(result.rows[0]);
}

export async function findLeagueById(id: string): Promise<LeagueWithSettings | null> {
  const result = await query('SELECT * FROM leagues WHERE id = $1', [id]);
  if (!result.rows[0]) return null;
  return mapLeagueWithSettings(result.rows[0]);
}

export async function findLeaguesByUser(userId: string): Promise<LeagueWithSettings[]> {
  const result = await query(
    `SELECT l.* FROM leagues l
     LEFT JOIN teams t ON t.league_id = l.id
     WHERE l.commissioner_id = $1 OR t.manager_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC`,
    [userId]
  );
  return result.rows.map(mapLeagueWithSettings);
}

export async function findLeagueByInviteCode(code: string): Promise<LeagueWithSettings | null> {
  const result = await query(
    `SELECT l.* FROM leagues l
     JOIN league_invites li ON li.league_id = l.id
     WHERE li.code = $1 AND (li.expires_at IS NULL OR li.expires_at > NOW())
     AND (li.max_uses IS NULL OR li.uses_count < li.max_uses)`,
    [code]
  );
  if (!result.rows[0]) return null;
  return mapLeagueWithSettings(result.rows[0]);
}

export async function generateInviteCode(leagueId: string): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await query(
    `INSERT INTO league_invites (league_id, code) VALUES ($1, $2)`,
    [leagueId, code]
  );
  return code;
}

export async function updateLeague(
  id: string,
  updates: Partial<Pick<League, 'name' | 'maxTeams' | 'scoringFormat' | 'draftDate' | 'draftStatus'> & { rosterPositions: string }>
): Promise<LeagueWithSettings | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.maxTeams !== undefined) {
    fields.push(`max_teams = $${paramCount++}`);
    values.push(updates.maxTeams);
  }
  if (updates.scoringFormat !== undefined) {
    fields.push(`scoring_format = $${paramCount++}`);
    values.push(updates.scoringFormat);
  }
  if (updates.draftDate !== undefined) {
    fields.push(`draft_date = $${paramCount++}`);
    values.push(updates.draftDate);
  }
  if (updates.draftStatus !== undefined) {
    fields.push(`draft_status = $${paramCount++}`);
    values.push(updates.draftStatus);
  }
  if (updates.rosterPositions !== undefined) {
    fields.push(`roster_positions = $${paramCount++}`);
    values.push(updates.rosterPositions);
  }

  if (fields.length === 0) return findLeagueById(id);

  values.push(id);
  const result = await query(
    `UPDATE leagues SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] ? mapLeagueWithSettings(result.rows[0]) : null;
}

function mapLeagueWithSettings(row: unknown): LeagueWithSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  return {
    id: r.id,
    name: r.name,
    commissionerId: r.commissioner_id,
    maxTeams: r.max_teams,
    draftStatus: r.draft_status,
    draftDate: r.draft_date,
    scoringFormat: r.scoring_format,
    rosterPositions: typeof r.roster_positions === 'string' 
      ? JSON.parse(r.roster_positions) 
      : r.roster_positions,
    tradeDeadline: r.trade_deadline,
    playoffTeams: r.playoff_teams,
    waiverType: r.waiver_type,
    createdAt: r.created_at,
    settings: {
      scoringFormat: r.scoring_format,
      rosterPositions: typeof r.roster_positions === 'string' 
        ? JSON.parse(r.roster_positions) 
        : r.roster_positions,
      tradeDeadline: r.trade_deadline,
      playoffTeams: r.playoff_teams,
      waiverType: r.waiver_type,
    },
  };
}