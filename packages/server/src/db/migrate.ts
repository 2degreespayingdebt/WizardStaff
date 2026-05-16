import { query } from '../config/db.js';

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  commissioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_teams INTEGER DEFAULT 10,
  draft_status VARCHAR(20) DEFAULT 'pending' CHECK (draft_status IN ('pending', 'in_progress', 'completed')),
  draft_date TIMESTAMP WITH TIME ZONE,
  scoring_format VARCHAR(20) DEFAULT 'standard' CHECK (scoring_format IN ('standard', 'ppr', 'half-ppr')),
  roster_positions JSONB DEFAULT '[{"pos":"QB","count":1},{"pos":"RB","count":2},{"pos":"WR","count":2},{"pos":"TE","count":1},{"pos":"K","count":1},{"pos":"DEF","count":1}]'::jsonb,
  trade_deadline DATE,
  playoff_teams INTEGER DEFAULT 6,
  waiver_type VARCHAR(10) DEFAULT 'faab' CHECK (waiver_type IN ('fab', 'faab', 'rolling')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League invitations table
CREATE TABLE IF NOT EXISTS league_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  max_uses INTEGER DEFAULT 100,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, manager_id)
);

-- Players table (NFL player pool)
CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position VARCHAR(20) DEFAULT 'drinker' CHECK (position = 'drinker'),
  team VARCHAR(10),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'injured', 'out', 'suspended')),
  projected_points DECIMAL(5,1),
  adp DECIMAL(5,1),
  profile_image VARCHAR(500),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'paused', 'completed')),
  current_pick INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 1,
  current_manager_id UUID REFERENCES teams(id),
  draft_order JSONB DEFAULT '[]'::jsonb,
  pick_time_seconds INTEGER DEFAULT 60,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft picks table
CREATE TABLE IF NOT EXISTS draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  pick INTEGER NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id VARCHAR(20) REFERENCES players(id) ON DELETE SET NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(draft_id, round, pick)
);

-- Roster slots table
CREATE TABLE IF NOT EXISTS roster_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id VARCHAR(20) REFERENCES players(id) ON DELETE SET NULL,
  slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('starter', 'bench', 'ir')),
  position VARCHAR(5) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waiver claims table
CREATE TABLE IF NOT EXISTS waiver_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id VARCHAR(20) REFERENCES players(id) ON DELETE SET NULL,
  bid_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  initiator_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  receiver_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Trade items table
CREATE TABLE IF NOT EXISTS trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id VARCHAR(20) REFERENCES players(id) ON DELETE SET NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('offered', 'received'))
);

-- Weekly scores table
CREATE TABLE IF NOT EXISTS weekly_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  score DECIMAL(6,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, week)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_drafts_league ON drafts(league_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_draft ON draft_picks(draft_id);
CREATE INDEX IF NOT EXISTS idx_roster_slots_team ON roster_slots(team_id);
CREATE INDEX IF NOT EXISTS idx_waiver_claims_league ON waiver_claims(league_id);
CREATE INDEX IF NOT EXISTS idx_trades_league ON trades(league_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
`;

export async function migrate() {
  console.log('Running migrations...');
  
  try {
    await query(schema);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
migrate().catch(console.error);