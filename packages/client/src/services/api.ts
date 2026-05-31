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

  async deleteLeague(id: string): Promise<void> {
    return this.request<void>(`/leagues/${id}`, {
      method: 'DELETE',
    });
  }

  async getLeague(id: string): Promise<League> {
    return this.request<League>(`/leagues/${id}`);
  }

  async createTeam(leagueId: string, teamName: string): Promise<Team> {
    return this.request<Team>(`/leagues/${leagueId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamName }),
    });
  }

  async createTeamWithAvatar(leagueId: string, teamName: string, avatarFile?: File): Promise<Team> {
    const formData = new FormData();
    formData.append('leagueId', leagueId);
    formData.append('teamName', teamName);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    
    const token = this.getToken();
    const response = await fetch(`${API_BASE}/teams/with-avatar`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create team' }));
      throw new Error(error.error || 'Failed to create team');
    }
    
    return response.json();
  }

  async updateLeague(leagueId: string, updates: { name?: string }): Promise<League> {
    return this.request<League>(`/leagues/${leagueId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateTeam(teamId: string, teamName: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify({ teamName }),
    });
  }

  async uploadTeamAvatar(teamId: string, file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const token = this.getToken();
    const response = await fetch(`${API_BASE}/teams/${teamId}/avatar`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload avatar' }));
      throw new Error(error.error || 'Failed to upload avatar');
    }
    
    return response.json();
  }

  async updateTeamOrder(leagueId: string, order: Array<{ id: string; order: number }>): Promise<void> {
    return this.request<void>(`/leagues/${leagueId}/teams/order`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
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
    includeImage?: boolean;
  }): Promise<Player[]> {
    const params = new URLSearchParams();
    if (options?.position) params.set('position', options.position);
    if (options?.team) params.set('team', options.team);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.includeImage) params.set('includeImage', 'true');
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
    updates: { 
      profileImage?: string; 
      description?: string;
      name?: string;
      projectedPoints?: number;
    }
  ): Promise<Player> {
    return this.request<Player>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePlayer(id: string): Promise<void> {
    return this.request<void>(`/players/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadPlayerAvatar(playerId: string, file: File): Promise<Player> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_BASE}/players/${playerId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload avatar' }));
      throw new Error(error.error || 'Failed to upload avatar');
    }
    
    return response.json();
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

  // Seasons
  async getSeasons(leagueId: string): Promise<Season[]> {
    return this.request<Season[]>(`/leagues/${leagueId}/seasons`);
  }

  async createSeason(leagueId: string, name: string, isActive?: boolean): Promise<Season> {
    return this.request<Season>(`/leagues/${leagueId}/seasons`, {
      method: 'POST',
      body: JSON.stringify({ name, isActive }),
    });
  }

  async updateSeason(seasonId: string, name: string): Promise<Season> {
    return this.request<Season>(`/leagues/seasons/${seasonId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async activateSeason(seasonId: string): Promise<Season> {
    return this.request<Season>(`/leagues/seasons/${seasonId}/activate`, {
      method: 'POST',
    });
  }

  async getSeasonTeams(seasonId: string): Promise<SeasonTeam[]> {
    return this.request<SeasonTeam[]>(`/leagues/seasons/${seasonId}/teams`);
  }

  async addTeamToSeason(seasonId: string, teamId: string): Promise<void> {
    return this.request<void>(`/leagues/seasons/${seasonId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    });
  }

  async removeTeamFromSeason(seasonId: string, teamId: string): Promise<void> {
    return this.request<void>(`/leagues/seasons/${seasonId}/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  async updateSeasonTeamOrder(seasonId: string, teamId: string, order: number): Promise<void> {
    return this.request<void>(`/leagues/seasons/${seasonId}/teams/${teamId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  }

  async deleteSeason(seasonId: string): Promise<void> {
    return this.request<void>(`/leagues/seasons/${seasonId}`, {
      method: 'DELETE',
    });
  }

  // Reset draft — clear all picks and rosters
  async resetDraft(draftId: string): Promise<{ draft: any }> {
    return this.request<{ draft: any }>(`/drafts/${draftId}/reset`, {
      method: 'POST',
    });
  }

  // Get draft ID for a season (creates if not exists)
  async getOrCreateDraft(seasonId: string): Promise<{ draftId: string }> {
    return this.request<{ draftId: string }>(`/drafts/season/${seasonId}`, {
      method: 'POST',
    });
  }

  // Get player points
  async getPlayerPoints(leagueId: string, seasonId: string, playerId: string): Promise<number> {
    const params = new URLSearchParams({
      league_id: leagueId,
      season_id: seasonId,
      player_id: playerId,
    });
    const result = await this.request<{ points: number }>(`/player-points?${params}`);
    return result.points || 0;
  }

  // Update player points
  async updatePlayerPoints(leagueId: string, seasonId: string, playerId: string, points: number): Promise<{ success: boolean; points: number }> {
    return this.request<{ success: boolean; points: number }>(`/player-points`, {
      method: 'POST',
      body: JSON.stringify({ leagueId, seasonId, playerId, points }),
    });
  }
}

export const api = new ApiService();