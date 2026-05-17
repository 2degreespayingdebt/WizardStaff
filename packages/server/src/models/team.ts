import { query, getClient } from '../config/db.js';

export interface Team {
  id: string;
  leagueId: string;
  managerId: string | null;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface RosterSlot {
  id: string;
  teamId: string;
  playerId: string | null;
  slotType: 'starter' | 'bench' | 'ir';
  position: string;
}

export async function createTeam(
  leagueId: string,
  managerId: string,
  name: string
): Promise<Team> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Check team count
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM teams WHERE league_id = $1',
      [leagueId]
    );
    
    // Get league max_teams
    const leagueResult = await client.query(
      'SELECT max_teams FROM leagues WHERE id = $1',
      [leagueId]
    );
    
    const currentCount = parseInt(countResult.rows[0].count);
    const maxTeams = leagueResult.rows[0]?.max_teams || 10;
    
    if (currentCount >= maxTeams) {
      throw new Error('League is full');
    }
    
    // Check if user already has a team in this league (only if managerId provided and not commissioner)
    if (managerId) {
      const leagueResult = await client.query(
        'SELECT commissioner_id FROM leagues WHERE id = $1',
        [leagueId]
      );
      const commissionerId = leagueResult.rows[0]?.commissioner_id;
      
      // Only check for existing team if not the commissioner
      if (managerId !== commissionerId) {
        const existingTeam = await client.query(
          'SELECT id FROM teams WHERE league_id = $1 AND manager_id = $2',
          [leagueId, managerId]
        );
        
        if (existingTeam.rows.length > 0) {
          throw new Error('User already has a team in this league');
        }
      }
    }
    
    // Create team
    const teamResult = await client.query(
      `INSERT INTO teams (league_id, manager_id, name) VALUES ($1, $2, $3) RETURNING *`,
      [leagueId, managerId, name]
    );
    
    await client.query('COMMIT');
    return teamResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findTeamById(id: string): Promise<Team | null> {
  const result = await query('SELECT * FROM teams WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function findTeamsByLeague(leagueId: string): Promise<Team[]> {
  const result = await query(
    `SELECT t.*, u.username, u.display_name as manager_name
     FROM teams t
     LEFT JOIN users u ON u.id = t.manager_id
     WHERE t.league_id = $1
     ORDER BY t.name`,
    [leagueId]
  );
  return result.rows;
}

export async function findTeamByUserAndLeague(
  userId: string,
  leagueId: string
): Promise<Team | null> {
  const result = await query(
    'SELECT * FROM teams WHERE manager_id = $1 AND league_id = $2',
    [userId, leagueId]
  );
  return result.rows[0] || null;
}

export async function getTeamRoster(teamId: string): Promise<RosterSlot[]> {
  const result = await query(
    `SELECT rs.*, p.name as player_name, p.position as player_position, p.team as player_team
     FROM roster_slots rs
     LEFT JOIN players p ON p.id = rs.player_id
     WHERE rs.team_id = $1
     ORDER BY 
       CASE rs.slot_type
         WHEN 'starter' THEN 1
         WHEN 'bench' THEN 2
         WHEN 'ir' THEN 3
       END,
       CASE rs.position
         WHEN 'QB' THEN 1
         WHEN 'RB' THEN 2
         WHEN 'WR' THEN 3
         WHEN 'TE' THEN 4
         WHEN 'K' THEN 5
         WHEN 'DEF' THEN 6
         WHEN 'DST' THEN 6
       END`,
    [teamId]
  );
  return result.rows;
}

export async function addPlayerToRoster(
  teamId: string,
  playerId: string,
  position: string,
  slotType: 'starter' | 'bench' | 'ir' = 'bench'
): Promise<RosterSlot> {
  // Check roster limits
  if (slotType === 'starter') {
    const starters = await query(
      `SELECT position, COUNT(*) as count FROM roster_slots 
       WHERE team_id = $1 AND slot_type = 'starter' AND position = $2 
       GROUP BY position`,
      [teamId, position]
    );
    // TODO: Check against league roster settings
  }
  
  const result = await query(
    `INSERT INTO roster_slots (team_id, player_id, slot_type, position)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [teamId, playerId, slotType, position]
  );
  return result.rows[0];
}

export async function updateRosterSlot(
  slotId: string,
  playerId: string | null
): Promise<RosterSlot | null> {
  const result = await query(
    'UPDATE roster_slots SET player_id = $1 WHERE id = $2 RETURNING *',
    [playerId, slotId]
  );
  return result.rows[0] || null;
}

export async function updateTeam(
  id: string,
  updates: { teamName?: string; avatarUrl?: string }
): Promise<Team | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.teamName !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.teamName);
  }
  if (updates.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${paramCount++}`);
    values.push(updates.avatarUrl);
  }

  if (fields.length === 0) return findTeamById(id);

  values.push(id);
  const result = await query(
    `UPDATE teams SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}