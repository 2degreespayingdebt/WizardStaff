import { query } from '../config/db.js';
export async function findAllPlayers(options) {
    let sql = 'SELECT * FROM players WHERE 1=1';
    const params = [];
    let paramCount = 1;
    if (options?.team) {
        sql += ` AND team = $${paramCount++}`;
        params.push(options.team);
    }
    if (options?.status) {
        sql += ` AND status = $${paramCount++}`;
        params.push(options.status);
    }
    else {
        sql += ` AND status = 'active'`;
    }
    sql += ' ORDER BY adp ASC NULLS LAST';
    if (options?.limit) {
        sql += ` LIMIT $${paramCount++}`;
        params.push(options.limit);
    }
    if (options?.offset) {
        sql += ` OFFSET $${paramCount++}`;
        params.push(options.offset);
    }
    const result = await query(sql, params);
    return result.rows;
}
export async function findPlayerById(id) {
    const result = await query('SELECT * FROM players WHERE id = $1', [id]);
    return result.rows[0] || null;
}
export async function findPlayersByIds(ids) {
    if (ids.length === 0)
        return [];
    const result = await query('SELECT * FROM players WHERE id = ANY($1)', [ids]);
    return result.rows;
}
export async function findAvailablePlayers(leagueId, options) {
    // Players not drafted in this league's draft
    let sql = `
    SELECT p.* FROM players p
    WHERE p.status = 'active'
    AND p.id NOT IN (
      SELECT dp.player_id FROM draft_picks dp
      JOIN drafts d ON d.id = dp.draft_id
      WHERE d.league_id = $1 AND dp.player_id IS NOT NULL
    )
    AND p.id NOT IN (
      SELECT rs.player_id FROM roster_slots rs
      JOIN teams t ON t.id = rs.team_id
      WHERE t.league_id = $1 AND rs.player_id IS NOT NULL
    )
  `;
    const params = [leagueId];
    let paramCount = 2;
    sql += ' ORDER BY p.adp ASC NULLS LAST';
    if (options?.limit) {
        sql += ` LIMIT $${paramCount++}`;
        params.push(options.limit);
    }
    const result = await query(sql, params);
    return result.rows;
}
export async function searchPlayers(searchTerm, limit = 20) {
    const result = await query(`SELECT * FROM players 
     WHERE name ILIKE $1 OR team ILIKE $1
     ORDER BY adp ASC NULLS LAST
     LIMIT $2`, [`%${searchTerm}%`, limit]);
    return result.rows;
}
export async function getPlayerCount() {
    const result = await query('SELECT COUNT(*) as count FROM players');
    return parseInt(result.rows[0].count);
}
export async function updatePlayer(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
    }
    if (updates.profileImage !== undefined) {
        fields.push(`profile_image = $${paramCount++}`);
        values.push(updates.profileImage);
    }
    if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
    }
    if (updates.projectedPoints !== undefined) {
        fields.push(`projected_points = $${paramCount++}`);
        values.push(updates.projectedPoints);
    }
    if (fields.length === 0)
        return findPlayerById(id);
    values.push(id);
    const result = await query(`UPDATE players SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
    return result.rows[0] || null;
}
export async function createDrinker(name, description, profileImage, team, projectedPoints, adpValue) {
    // Generate a unique ID
    const id = `C${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const result = await query(`INSERT INTO players (id, name, position, team, description, profile_image, status, projected_points, adp)
     VALUES ($1, $2, 'drinker', $3, $4, $5, 'active', $6, $7)
     RETURNING *`, [id, name, team || 'DIY', description || null, profileImage || null, projectedPoints || 50, adpValue || null]);
    return result.rows[0];
}
export async function setPlayerStatus(playerId, status) {
    const result = await query(`UPDATE players SET status = $1 WHERE id = $2 RETURNING *`, [status, playerId]);
    return result.rows[0] || null;
}
export async function checkPlayerDraftedInCurrentSeason(playerId, seasonId) {
    // Check if player was drafted in this season's draft
    const result = await query(`SELECT dp.id FROM draft_picks dp
     JOIN drafts d ON d.id = dp.draft_id
     WHERE dp.player_id = $1 AND d.season_id = $2
     LIMIT 1`, [playerId, seasonId]);
    return result.rows.length > 0;
}
export async function deletePlayer(id) {
    await query('DELETE FROM players WHERE id = $1', [id]);
}
//# sourceMappingURL=player.js.map