import { query, getClient } from '../config/db.js';

export interface Season {
  id: string;
  leagueId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

export interface SeasonTeam {
  id: string;
  seasonId: string;
  teamId: string;
  seed: number | null;
  drinkCount: number;
  teamName?: string;
  createdAt: Date;
}

export async function createSeason(leagueId: string, name: string): Promise<Season> {
  const result = await query(
    `INSERT INTO seasons (league_id, name) VALUES ($1, $2) RETURNING *`,
    [leagueId, name]
  );
  return mapSeason(result.rows[0]);
}

export async function findSeasonById(id: string): Promise<Season | null> {
  const result = await query('SELECT * FROM seasons WHERE id = $1', [id]);
  return result.rows[0] ? mapSeason(result.rows[0]) : null;
}

export async function findSeasonsByLeague(leagueId: string): Promise<Season[]> {
  const result = await query(
    'SELECT * FROM seasons WHERE league_id = $1 ORDER BY created_at DESC',
    [leagueId]
  );
  return result.rows.map(mapSeason);
}

export async function updateSeason(id: string, name: string): Promise<Season> {
  const result = await query(
    `UPDATE seasons SET name = $1 WHERE id = $2 RETURNING *`,
    [name, id]
  );
  return mapSeason(result.rows[0]);
}

export async function setActiveSeason(seasonId: string): Promise<Season> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const seasonResult = await client.query('SELECT league_id FROM seasons WHERE id = $1', [seasonId]);
    if (seasonResult.rows.length === 0) throw new Error('Season not found');
    const leagueId = seasonResult.rows[0].league_id;
    
    await client.query(
      `UPDATE seasons SET is_active = false WHERE league_id = $1`,
      [leagueId]
    );
    
    await client.query(
      `UPDATE seasons SET is_active = true WHERE id = $1`,
      [seasonId]
    );
    
    await client.query('COMMIT');
    
    return (await findSeasonById(seasonId))!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addTeamToSeason(
  seasonId: string,
  teamId: string,
  seed?: number
): Promise<SeasonTeam> {
  const result = await query(
    `INSERT INTO season_teams (season_id, team_id, seed) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (season_id, team_id) 
     DO UPDATE SET seed = $3
     RETURNING *`,
    [seasonId, teamId, seed || null]
  );
  return mapSeasonTeam(result.rows[0]);
}

export async function removeTeamFromSeason(seasonId: string, teamId: string): Promise<void> {
  await query(
    `DELETE FROM season_teams WHERE season_id = $1 AND team_id = $2`,
    [seasonId, teamId]
  );
}

export async function getSeasonTeams(seasonId: string): Promise<SeasonTeam[]> {
  const result = await query(
    `SELECT st.*, t.name as team_name
     FROM season_teams st
     JOIN teams t ON t.id = st.team_id
     WHERE st.season_id = $1
     ORDER BY st.seed ASC NULLS LAST, t.name ASC`,
    [seasonId]
  );
  return result.rows.map(mapSeasonTeam);
}

export async function setSeasonTeams(
  seasonId: string,
  teamIds: string[]
): Promise<SeasonTeam[]> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM season_teams WHERE season_id = $1', [seasonId]);
    
    for (let i = 0; i < teamIds.length; i++) {
      await client.query(
        `INSERT INTO season_teams (season_id, team_id, seed, drink_count) VALUES ($1, $2, $3, 0)`,
        [seasonId, teamIds[i], i + 1]
      );
    }
    
    await client.query('COMMIT');
    
    return await getSeasonTeams(seasonId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDrinkCount(
  seasonId: string,
  teamId: string,
  change: number
): Promise<SeasonTeam> {
  const result = await query(
    `UPDATE season_teams 
     SET drink_count = drink_count + $1 
     WHERE season_id = $2 AND team_id = $3 
     RETURNING *`,
    [change, seasonId, teamId]
  );
  return mapSeasonTeam(result.rows[0]);
}

export async function getSeasonLeaderboard(seasonId: string): Promise<SeasonTeam[]> {
  const result = await query(
    `SELECT st.*, t.name as team_name
     FROM season_teams st
     JOIN teams t ON t.id = st.team_id
     WHERE st.season_id = $1
     ORDER BY st.drink_count DESC, st.seed ASC NULLS LAST`,
    [seasonId]
  );
  return result.rows.map(mapSeasonTeam);
}

function mapSeason(row: unknown): Season {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  return {
    id: r.id,
    leagueId: r.league_id,
    name: r.name,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

function mapSeasonTeam(row: unknown): SeasonTeam {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  return {
    id: r.id,
    seasonId: r.season_id,
    teamId: r.team_id,
    seed: r.seed,
    drinkCount: r.drink_count || 0,
    teamName: r.team_name,
    createdAt: r.created_at,
  };
}