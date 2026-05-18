import { query } from '../config/db.js';
export async function createLeague(name, commissionerId, options) {
    const result = await query(`INSERT INTO leagues (name, commissioner_id, max_teams, scoring_format, roster_positions)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [
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
    ]);
    return mapLeagueWithSettings(result.rows[0]);
}
export async function findLeagueById(id) {
    const result = await query('SELECT * FROM leagues WHERE id = $1', [id]);
    if (!result.rows[0])
        return null;
    return mapLeagueWithSettings(result.rows[0]);
}
export async function findAllLeagues() {
    const result = await query(`SELECT * FROM leagues ORDER BY created_at DESC`);
    return result.rows.map(mapLeagueWithSettings);
}
export async function findLeaguesByUser(userId) {
    const result = await query(`SELECT l.* FROM leagues l
     LEFT JOIN teams t ON t.league_id = l.id
     WHERE l.commissioner_id = $1 OR t.manager_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC`, [userId]);
    return result.rows.map(mapLeagueWithSettings);
}
export async function findLeagueByInviteCode(code) {
    const result = await query(`SELECT l.* FROM leagues l
     JOIN league_invites li ON li.league_id = l.id
     WHERE li.code = $1 AND (li.expires_at IS NULL OR li.expires_at > NOW())
     AND (li.max_uses IS NULL OR li.uses_count < li.max_uses)`, [code]);
    if (!result.rows[0])
        return null;
    return mapLeagueWithSettings(result.rows[0]);
}
export async function generateInviteCode(leagueId) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await query(`INSERT INTO league_invites (league_id, code) VALUES ($1, $2)`, [leagueId, code]);
    return code;
}
export async function updateLeague(id, updates) {
    const fields = [];
    const values = [];
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
    if (fields.length === 0)
        return findLeagueById(id);
    values.push(id);
    const result = await query(`UPDATE leagues SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
    return result.rows[0] ? mapLeagueWithSettings(result.rows[0]) : null;
}
function mapLeagueWithSettings(row) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row;
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
export async function deleteLeague(id) {
    await query('DELETE FROM leagues WHERE id = $1', [id]);
}
//# sourceMappingURL=league.js.map