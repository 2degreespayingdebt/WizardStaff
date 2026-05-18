-- Seed draft data for existing seasons
-- This creates draft records for all seasons that have teams

-- Insert drafts for seasons that have teams
INSERT INTO drafts (league_id, season_id, status, current_pick, current_round, draft_order)
SELECT 
    s.league_id,
    s.id,
    'active',
    1,
    1,
    (
        SELECT JSONB_AGG(t.id ORDER BY st.seed)
        FROM season_teams st
        JOIN teams t ON t.id = st.team_id
        WHERE st.season_id = s.id
    )
FROM seasons s
WHERE s.is_active = true
AND s.id NOT IN (SELECT season_id FROM drafts WHERE season_id IS NOT NULL)
AND EXISTS (
    SELECT 1 FROM season_teams st WHERE st.season_id = s.id
);

-- Make the "Season 2026" draft active and initialize properly
UPDATE drafts 
SET status = 'active',
    started_at = NOW(),
    current_pick = 1,
    current_round = 1,
    current_manager_id = (
        SELECT t.id FROM teams t
        JOIN season_teams st ON st.team_id = t.id
        WHERE st.season_id = drafts.season_id
        ORDER BY st.seed ASC NULLS LAST
        LIMIT 1
    )
WHERE season_id = '77440de7-38cb-4573-987b-b1ae52f2c141';

-- Verify the data
SELECT d.id, d.league_id, d.season_id, d.status, d.current_pick, d.current_round 
FROM drafts d;
