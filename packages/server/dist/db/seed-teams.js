import { query } from '../config/db.js';
// Seed data for testing - creates seasons with teams for Alpha and Beta
async function seed() {
    console.log('Seeding seasons and teams...');
    try {
        // Get existing users
        const existingUsers = await query('SELECT id FROM users');
        if (existingUsers.rows.length < 2) {
            console.log('Need at least 2 users. Seed users first.');
            return;
        }
        const userId = existingUsers.rows[0].id;
        const userId2 = existingUsers.rows[1].id;
        // Get existing league
        let leagueId;
        const existingLeague = await query('SELECT id FROM leagues LIMIT 1');
        if (existingLeague.rows.length === 0) {
            // Create demo league
            const leagueResult = await query(`INSERT INTO leagues (name, commissioner_id, max_teams) VALUES ($1, $2, $3) RETURNING id`, ['🍺 Drinking Buddies', userId, 10]);
            leagueId = leagueResult.rows[0].id;
            console.log('Created league:', leagueId);
        }
        else {
            leagueId = existingLeague.rows[0].id;
            // Clear existing data for this league
            await query('DELETE FROM season_teams WHERE season_id IN (SELECT id FROM seasons WHERE league_id = $1)', [leagueId]);
            await query('DELETE FROM seasons WHERE league_id = $1', [leagueId]);
            await query('DELETE FROM teams WHERE league_id = $1', [leagueId]);
        }
        console.log('Cleared existing data');
        // Create Alpha teams
        const alphaTeams = ['Steve', 'Steven', 'Mike', 'Chris', 'Dave'];
        const betaTeams = ['Beer Bros', 'Wine Wolves', 'Shot Squad', 'Keg Club', 'Bar Crew'];
        const managers = [userId, userId2, userId, userId2, userId];
        // Create Alpha teams
        const alphaTeamIds = [];
        for (let i = 0; i < alphaTeams.length; i++) {
            const result = await query(`INSERT INTO teams (league_id, manager_id, name) VALUES ($1, $2, $3) RETURNING id`, [leagueId, managers[i], alphaTeams[i]]);
            alphaTeamIds.push(result.rows[0].id);
        }
        console.log('Created Alpha teams:', alphaTeams.length);
        // Create Beta teams
        const betaTeamIds = [];
        for (let i = 0; i < betaTeams.length; i++) {
            const result = await query(`INSERT INTO teams (league_id, manager_id, name) VALUES ($1, $2, $3) RETURNING id`, [leagueId, managers[i % managers.length], betaTeams[i]]);
            betaTeamIds.push(result.rows[0].id);
        }
        console.log('Created Beta teams:', betaTeams.length);
        // Create Alpha season (active)
        const alphaResult = await query(`INSERT INTO seasons (league_id, name, is_active) VALUES ($1, $2, $3) RETURNING id`, [leagueId, 'Alpha', true]);
        const alphaSeasonId = alphaResult.rows[0].id;
        // Add teams to Alpha season
        for (let i = 0; i < alphaTeamIds.length; i++) {
            const drinkCount = Math.floor(Math.random() * 15);
            await query(`INSERT INTO season_teams (season_id, team_id, seed, drink_count) VALUES ($1, $2, $3, $4)`, [alphaSeasonId, alphaTeamIds[i], i + 1, drinkCount]);
        }
        console.log(`Created Alpha season with ${alphaTeamIds.length} teams`);
        // Create Beta season (inactive)
        const betaResult = await query(`INSERT INTO seasons (league_id, name, is_active) VALUES ($1, $2, $3) RETURNING id`, [leagueId, 'Beta', false]);
        const betaSeasonId = betaResult.rows[0].id;
        // Add teams to Beta season
        for (let i = 0; i < betaTeamIds.length; i++) {
            const drinkCount = Math.floor(Math.random() * 15);
            await query(`INSERT INTO season_teams (season_id, team_id, seed, drink_count) VALUES ($1, $2, $3, $4)`, [betaSeasonId, betaTeamIds[i], i + 1, drinkCount]);
        }
        console.log(`Created Beta season with ${betaTeamIds.length} teams`);
        console.log('');
        console.log('✅ Seed completed!');
        console.log('');
        console.log('Alpha Season teams:', alphaTeams.join(', '));
        console.log('Beta Season teams:', betaTeams.join(','));
    }
    catch (error) {
        console.error('Seed error:', error);
    }
}
seed().catch(console.error);
//# sourceMappingURL=seed-teams.js.map