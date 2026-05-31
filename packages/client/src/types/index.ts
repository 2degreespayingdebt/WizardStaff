// User types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// League types
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
  draftDate: string | null;
  scoringFormat: string;
  rosterPositions: RosterPosition[];
  tradeDeadline: string | null;
  playoffTeams: number;
  waiverType: string;
  settings: LeagueSettings;
  createdAt: string;
  teams?: Team[];
  inviteCode?: string;
}

// Team types
export interface Team {
  id: string;
  leagueId: string;
  managerId: string;
  name: string;
  avatar_url?: string;
  createdAt: string;
  managerName?: string;
}

export interface RosterSlot {
  id: string;
  teamId: string;
  playerId: string | null;
  slotType: 'starter' | 'bench' | 'ir';
  position: string;
  playerName?: string;
  playerPosition?: string;
  playerTeam?: string;
}

// Player types
export interface Player {
  id: string;
  name: string;
  position: 'drinker';
  team: string | null;
  status: 'active' | 'injured' | 'out' | 'suspended';
  projected_points: string | null;
  adp: string | null;
  profileImage?: string | null;  // Legacy/client-side alias for profile_image
  profile_image?: string | null;  // From API (file path)
  imageData?: string | null;  // Base64 encoded image from database
  description?: string | null;
}

// Draft types
export interface Draft {
  id: string;
  leagueId: string;
  seasonId: string | null;
  status: 'scheduled' | 'active' | 'paused' | 'completed';
  currentPick: number;
  currentRound: number;
  currentManagerId: string | null;
  draftOrder: string[];
  pickTimeSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DraftPick {
  id: string;
  draftId: string;
  round: number;
  pick: number;
  teamId: string;
  playerId: string | null;
  selectedAt: string;
  teamName?: string;
  playerName?: string;
  playerPosition?: string;
  playerImage?: string;
}

export interface DraftBoard {
  draft: Draft;
  picks: DraftPick[];
  availablePlayers: Player[];
}

// Season types
export interface Season {
  id: string;
  leagueId: string;
  name: string;
  isActive: boolean;
  draftId?: string | null;
  createdAt: string;
}

export interface SeasonTeam {
  id: string;
  seasonId: string;
  teamId: string;
  seed: number | null;
  drinkCount: number;
  teamName?: string;
  avatarUrl?: string | null;
  createdAt: string;
}

// API Response types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}