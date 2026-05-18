/**
 * Draft Database Setup Script
 * 
 * This script creates necessary draft database records for the application
 * Run with: npx tsx src/seedDrafts.ts
 */

import { query } from './config/db.js';

async function setupDrafts() {
  console.log('Setting up draft database...');
  
  try {
    // Create drafts table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        league_id UUID NOT NULL,
        season_id UUID,
        status VARCHAR(20) DEFAULT 'scheduled',
        current_pick INTEGER DEFAULT 1,
        current_round INTEGER DEFAULT 1,
        current_manager_id UUID,
        draft_order JSONB DEFAULT '[]',
        pick_time_seconds INTEGER DEFAULT 120,
        paused_at TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ drafts table created');
    
    // Create draft_picks table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS draft_picks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        draft_id UUID NOT NULL,
        round INTEGER NOT NULL,
        pick INTEGER NOT NULL,
        team_id UUID NOT NULL,
        player_id UUID,
        selected_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ draft_picks table created');
    
    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_drafts_league ON drafts(league_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_drafts_season ON drafts(season_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_draft_picks_draft ON draft_picks(draft_id)`);
    console.log('✓ indexes created');
    
    // Get active seasons
    const seasons = await query(`
      SELECT s.id as season_id, s.league_id, s.is_active, s.name,
             (SELECT COUNT(*) FROM season_teams st WHERE st.season_id = s.id) as team_count
      FROM seasons s
      WHERE s.is_active = true
    `);
    
    console.log(`\nFound ${seasons.rows.length} active season(s)`);
    
    for (const season of seasons.rows) {
      console.log(`\nProcessing: ${season.name} (${season.team_count} teams)`);
      
      // Check if draft already exists using a simpler query
      const existing = await query(
        `SELECT id FROM drafts WHERE season_id = '${season.season_id}'`
      );
      
      if (existing.rows.length > 0) {
        console.log(`  - Draft already exists, skipping`);
        continue;
      }
      
      // Get teams for this season ordered by seed
      const teams = await query(`
        SELECT t.id, t.name, st.seed
        FROM season_teams st
        JOIN teams t ON t.id = st.team_id
        WHERE st.season_id = '${season.season_id}'
        ORDER BY st.seed ASC NULLS LAST
      `);
      
      if (teams.rows.length < 2) {
        console.log(`  - Not enough teams (need 2+), skipping`);
        continue;
      }
      
      // Build draft order with snake pattern
      const draftOrder: string[] = [];
      for (let round = 0; round < teams.rows.length; round++) {
        if (round % 2 === 0) {
          // Even rounds: forward order
          draftOrder.push(...teams.rows.map(t => t.id));
        } else {
          // Odd rounds: reverse order
          draftOrder.push(...[...teams.rows].reverse().map(t => t.id));
        }
      }
      
      // Create the draft
      const result = await query(`
        INSERT INTO drafts (league_id, season_id, status, current_pick, current_round, 
                         current_manager_id, draft_order, pick_time_seconds, started_at)
        VALUES ('${season.league_id}', '${season.season_id}', 'active', 1, 1, $1, $2, 120, NOW())
        RETURNING id, status
      `, [
        teams.rows[0].id, // First team by seed picks first
        JSON.stringify(draftOrder)
      ]);
      
      if (result.rows && result.rows.length > 0) {
        console.log(`  ✓ Created draft: ${result.rows[0].id}`);
        console.log(`    Status: ${result.rows[0].status}`);
        console.log(`    Teams: ${teams.rows.length}`);
        console.log(`    Draft order generated (snake pattern)`);
      } else {
        console.log(`  ✓ Draft created`);
      }
    }
    
    // List all drafts
    const allDrafts = await query(`
      SELECT d.id, d.season_id, d.status, d.current_round, d.current_pick,
             s.name as season_name
      FROM drafts d
      LEFT JOIN seasons s ON s.id = d.season_id
      ORDER BY d.created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n=== Draft Summary ===`);
    console.log(`Total drafts: ${allDrafts.rows.length}`);
    for (const d of allDrafts.rows) {
      console.log(`  - ${d.season_name}: ${d.status} (Round ${d.current_round}, Pick ${d.current_pick})`);
    }
    
    console.log('\n✅ Draft setup complete!');
    
  } catch (error) {
    console.error('Error setting up drafts:', error);
    throw error;
  }
  
  process.exit(0);
}

// Run
setupDrafts();
