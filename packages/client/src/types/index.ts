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
  projectedPoints: number | null;
  adp: number | null;
  profileImage?: string | null;
  description?: string | null;
}

// Draft types
export interface Draft {
  id: string;
  leagueId: string;
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

// API Response types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}