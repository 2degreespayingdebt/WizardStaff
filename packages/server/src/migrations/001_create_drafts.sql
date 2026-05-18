-- Fantasy Football Draft System Schema
-- Based on snake draft best practices

-- Main drafts table
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
);

-- Draft picks table
CREATE TABLE IF NOT EXISTS draft_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL,
    round INTEGER NOT NULL,
    pick INTEGER NOT NULL,
    team_id UUID NOT NULL,
    player_id UUID,
    selected_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drafts_league ON drafts(league_id);
CREATE INDEX IF NOT EXISTS idx_drafts_season ON drafts(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_draft ON draft_picks(draft_id);
