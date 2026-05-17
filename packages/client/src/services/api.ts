import type { User, League, Team, Player, DraftBoard, Season, SeasonTeam, AuthResponse } from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('wizardstaff_token', token);
    } else {
      localStorage.removeItem('wizardstaff_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('wizardstaff_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(
    username: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, displayName }),
    });
    this.setToken(result.token);
    return result;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Leagues
  async getLeagues(): Promise<League[]> {
    return this.request<League[]>('/leagues');
  }

  async getLeague(id: string): Promise<League> {
    return this.request<League>(`/leagues/${id}`);
  }

  async createLeague(data: {
    name: string;
    maxTeams?: number;
    scoringFormat?: string;
  }): Promise<League> {
    return this.request<League>('/leagues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinLeague(code: string): Promise<{ league: League; team: Team }> {
    return this.request<{ league: League; team: Team }>('/leagues/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Teams
  async getTeam(id: string): Promise<{ team: Team; roster: unknown[] }> {
    return this.request<{ team: Team; roster: unknown[] }>(`/teams/${id}`);
  }

  // Players
  async getPlayers(options?: {
    position?: string;
    team?: string;
    limit?: number;
  }): Promise<Player[]> {
    const params = new URLSearchParams();
    if (options?.position) params.set('position', options.position);
    if (options?.team) params.set('team', options.team);
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    return this.request<Player[]>(`/players${query ? `?${query}` : ''}`);
  }

  async searchPlayers(query: string, limit = 20): Promise<Player[]> {
    return this.request<Player[]>(`/players/search?q=${query}&limit=${limit}`);
  }

  async getAvailablePlayers(leagueId: string): Promise<Player[]> {
    return this.request<Player[]>(`/players/available/${leagueId}`);
  }

  async getPlayer(id: string): Promise<Player> {
    return this.request<Player>(`/players/${id}`);
  }

  async updatePlayer(
    id: string,
    updates: { profileImage?: string; description?: string }
  ): Promise<Player> {
    return this.request<Player>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async setPlayerStatus(
    id: string,
    status: 'active' | 'injured' | 'out' | 'suspended',
    seasonId?: string
  ): Promise<Player> {
    return this.request<Player>(`/players/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, seasonId }),
    });
  }

  async createDrinker(
    name: string,
    description?: string,
    profileImage?: string
  ): Promise<Player> {
    return this.request<Player>('/players', {
      method: 'POST',
      body: JSON.stringify({ name, description, profileImage }),
    });
  }

  async bulkImportPlayers(
    players: Array<{
      name: string;
      description?: string;
      team?: string;
      profileImage?: string;
      projectedPoints?: number;
      adp?: number;
    }>
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    return this.request<{ created: number; failed: number; errors: string[] }>('/players/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ players }),
    });
  }

  // Drafts
  async getDraftBoard(draftId: string): Promise<DraftBoard> {
    return this.request<DraftBoard>(`/drafts/${draftId}/board`);
  }

  // Season Leaderboard
  async getSeasonLeaderboard(seasonId: string): Promise<SeasonTeam[]> {
    return this.request<SeasonTeam[]>(`/leagues/seasons/${seasonId}/leaderboard`);
  }

  async updateDrinkCount(
    seasonId: string,
    teamId: string,
    change: number
  ): Promise<SeasonTeam> {
    return this.request<SeasonTeam>(`/leagues/seasons/${seasonId}/teams/${teamId}/drinks`, {
      method: 'POST',
      body: JSON.stringify({ change }),
    });
  }

  // Get draft ID for a season (creates if not exists)
  async getOrCreateDraft(seasonId: string): Promise<{ draftId: string }> {
    return this.request<{ draftId: string }>(`/drafts/season/${seasonId}`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();