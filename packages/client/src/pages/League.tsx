import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useRole } from '../hooks/useRole';
import type { League, Team, Season, SeasonTeam } from '../types';

type Tab = 'teams' | 'seasons' | 'leaderboard';

const MAX_DRINKS = 100;

export default function League() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  const { role } = useRole();
  
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [leaderboard, setLeaderboard] = useState<SeasonTeam[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('teams');
  
  // Team form state
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamAvatar, setTeamAvatar] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Season form state
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonName, setSeasonName] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (leagueId: string) => {
    try {
      setLoading(true);
      const data = await api.getLeague(leagueId);
      setLeague(data);
      setTeams(data.teams || []);
      
      const seasonsData = await api.getSeasons(leagueId);
      setSeasons(seasonsData);
      
      const active = seasonsData.find((s: Season) => s.isActive);
      if (active) {
        setActiveSeason(active);
        setSelectedSeasonId(active.id);
        const lb = await api.getSeasonLeaderboard(active.id);
        setLeaderboard(lb);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonTeams = async (seasonId: string) => {
    try {
      const st = await api.getSeasonTeams(seasonId);
      setSeasonTeams(st);
    } catch (err) {
      console.error('Failed to load season teams:', err);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !id) return;
    try {
      setSaving(true);
      
      // Upload avatar if selected, otherwise just create team
      let team;
      if (teamAvatar) {
        team = await api.createTeamWithAvatar(id, teamName, teamAvatar);
      } else {
        team = await api.createTeam(id, teamName);
      }
      
      setTeams([...teams, team]);
      setTeamName('');
      setTeamAvatar(null);
      setShowTeamForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim() || !editingTeam) return;
    try {
      setSaving(true);
      
      let avatarUrl = editingTeam.avatar_url;
      
      // Upload avatar if selected
      if (teamAvatar) {
        const result = await api.uploadTeamAvatar(editingTeam.id, teamAvatar);
        avatarUrl = result.avatarUrl;
      }
      
      const updated = await api.updateTeam(editingTeam.id, teamName);
      setTeams(teams.map(t => t.id === updated.id ? { ...t, ...updated, avatarUrl } : t));
      setTeamName('');
      setTeamAvatar(null);
      setEditingTeam(null);
      setShowTeamForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSeason = async () => {
    if (!seasonName.trim() || !id) return;
    try {
      setSaving(true);
      const season = await api.createSeason(id, seasonName);
      setSeasons([...seasons, season]);
      setSeasonName('');
      setShowSeasonForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSeason = async () => {
    if (!seasonName.trim() || !editingSeason) return;
    try {
      setSaving(true);
      const updated = await api.updateSeason(editingSeason.id, seasonName);
      setSeasons(seasons.map(s => s.id === updated.id ? updated : s));
      setSeasonName('');
      setEditingSeason(null);
      setShowSeasonForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateSeason = async (seasonId: string) => {
    try {
      setSaving(true);
      await api.activateSeason(seasonId);
      setSeasons(seasons.map(s => ({
        ...s,
        isActive: s.id === seasonId
      })));
      const activated = seasons.find(s => s.id === seasonId);
      if (activated) setActiveSeason({ ...activated, isActive: true });
      setSelectedSeasonId(seasonId);
      const lb = await api.getSeasonLeaderboard(seasonId);
      setLeaderboard(lb);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetSeasonTeams = async () => {
    if (!selectedSeasonId) return;
    const teamIds = teams.map(t => t.id);
    try {
      setSaving(true);
      const st = await api.setSeasonTeams(selectedSeasonId, teamIds);
      setSeasonTeams(st);
      const lb = await api.getSeasonLeaderboard(selectedSeasonId);
      setLeaderboard(lb);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSeason = async (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const selected = seasons.find(s => s.id === seasonId);
    if (selected) {
      setActiveSeason(selected);
      const lb = await api.getSeasonLeaderboard(seasonId);
      setLeaderboard(lb);
    }
  };

  const handleAddDrink = async (teamId: string) => {
    if (!selectedSeasonId) return;
    try {
      setSaving(true);
      const updated = await api.updateDrinkCount(selectedSeasonId, teamId, 1);
      setLeaderboard(leaderboard.map(t => t.teamId === teamId ? updated : t));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDrink = async (teamId: string) => {
    if (!selectedSeasonId) return;
    try {
      setSaving(true);
      const updated = await api.updateDrinkCount(selectedSeasonId, teamId, -1);
      setLeaderboard(leaderboard.map(t => t.teamId === teamId ? updated : t));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Sort leaderboard by drink count descending
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.drinkCount - a.drinkCount);

  // Get max drinks for scaling (at least 10, at most 100)
  const maxDrinks = Math.max(10, ...leaderboard.map(t => t.drinkCount), 20);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#D4A574' }}></div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'League not found'}</p>
          <Link to="/leagues" className="btn-primary">
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#023E8A' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#0077B6', borderColor: '#D4A574' }}>
        <div className="max-w-full mx-auto px-3 md:px-4 py-4">
          <div className="flex items-center gap-3 md:p-4">
            <Link to="/" className="text-sand-500 hover:text-white">Dashboard</Link>
            <Link to="/leagues" className="text-sand-500 hover:text-white">Leagues</Link>
            <button onClick={() => navigate('/leagues')} className="text-sand-500 hover:text-white">
              ← Back
            </button>
            <h1 className="text-lg md:text-xl font-bold" style={{ color: '#D4A574' }}>{league.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-2 md:px-3 md:px-4 py-4 md:py-4 md:py-8">
        <div className="card mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl md:text-xl md:text-2xl font-bold">{league.name}</h2>
          <p className="text-sand-500">
            {role === 'admin' ? '👑 Admin' : '🏄 Team Lead'} • {teams.length}/{league.maxTeams} Teams
          </p>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex border-b border-ocean-700 mb-4 md:mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3 md:px-3 md:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'teams'
                ? 'text-sand-500 border-b-2 border-sand-500'
                : 'text-sand-500 hover:text-white'
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('seasons')}
            className={`px-3 md:px-3 md:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'seasons'
                ? 'text-sand-500 border-b-2 border-sand-500'
                : 'text-sand-500 hover:text-white'
            }`}
          >
            Seasons ({seasons.length})
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 md:px-3 md:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'text-sand-500 border-b-2 border-sand-500'
                : 'text-sand-500 hover:text-white'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Teams</h3>
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setTeamName('');
                  setShowTeamForm(true);
                }}
                className="btn-primary text-sm"
                disabled={!perms.canCreateLeague}
                title={!perms.canCreateLeague ? 'Admin only' : ''}
              >
                + Add Team
              </button>
            </div>

            {showTeamForm && (
              <div className="card mb-4 border-sand-500">
                <h4 className="font-medium mb-3">
                  {editingTeam ? 'Edit Team' : 'Add New Team'}
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Team name"
                      className="flex-1"
                    />
                    <button
                      onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                      disabled={saving || !teamName.trim()}
                      className="btn-primary"
                    >
                      {saving ? 'Saving...' : editingTeam ? 'Update' : 'Add'}
                    </button>
                    <button
                      onClick={() => {
                        setShowTeamForm(false);
                        setEditingTeam(null);
                        setTeamName('');
                        setTeamAvatar(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {/* Avatar upload */}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={avatarInputRef}
                      accept="image/*"
                      onChange={(e) => setTeamAvatar(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-sm text-sand-500 hover:text-white"
                    >
                      {teamAvatar ? `📷 ${teamAvatar.name}` : '📷 Upload Avatar'}
                    </button>
                    {teamAvatar && (
                      <button
                        type="button"
                        onClick={() => setTeamAvatar(null)}
                        className="text-sm text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {teams.length === 0 ? (
              <p className="text-sand-500">No teams yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex flex-col items-center p-4 bg-ocean-800 rounded border border-ocean-700"
                  >
                    <span className="text-sand-500 text-sm">#{index + 1}</span>
                    {team.avatar_url ? (
                      <img
                        src={'http://localhost:3001' + team.avatar_url}
                        alt={team.name}
                        className="w-56 h-72 rounded-full object-cover my-3"
                      />
                    ) : (
                      <div className="w-56 h-72 rounded-full bg-ocean-700 flex items-center justify-center my-3">
                        🏈
                      </div>
                    )}
                    <p className="font-medium text-center">{team.name}</p>
                    <button
                      onClick={() => {
                        setEditingTeam(team);
                        setTeamName(team.name);
                        setShowTeamForm(true);
                      }}
                      disabled={!perms.canEditAnyTeam}
                      className="text-sm text-sand-500 hover:text-white mt-2"
                      title={!perms.canEditAnyTeam ? 'Admin only' : ''}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Seasons Tab */}
        {activeTab === 'seasons' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Seasons</h3>
              <button
                onClick={() => {
                  setEditingSeason(null);
                  setSeasonName('');
                  setShowSeasonForm(true);
                }}
                className="btn-primary text-sm"
                disabled={!perms.canCreateSeason}
                title={!perms.canCreateSeason ? 'Admin only' : ''}
              >
                + Add Season
              </button>
            </div>

            {showSeasonForm && (
              <div className="card mb-4 border-sand-500">
                <h4 className="font-medium mb-3">
                  {editingSeason ? 'Edit Season' : 'Add New Season'}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="Season name"
                    className="flex-1"
                  />
                  <button
                    onClick={editingSeason ? handleUpdateSeason : handleCreateSeason}
                    disabled={saving || !seasonName.trim()}
                    className="btn-primary"
                  >
                    {saving ? 'Saving...' : editingSeason ? 'Update' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSeasonForm(false);
                      setEditingSeason(null);
                      setSeasonName('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {seasons.length === 0 ? (
              <p className="text-sand-500">No seasons yet.</p>
            ) : (
              <div className="space-y-3">
                {seasons.map((season) => (
                  <div
                    key={season.id}
                    className={`p-3 bg-ocean-800 rounded ${
                      season.isActive ? 'border border-sand-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {season.isActive && '🏆 '}
                          {season.name}
                        </span>
                        {season.isActive && (
                          <span className="text-xs bg-sand-600 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingSeason(season);
                            setSeasonName(season.name);
                            setShowSeasonForm(true);
                          }}
                          className="text-sm text-sand-500 hover:text-white"
                        >
                          Edit
                        </button>
                        {!season.isActive && (
                          <button
                            onClick={() => handleActivateSeason(season.id)}
                            disabled={saving || !perms.canActivateSeason}
                            className="text-sm text-sand-500 hover:text-emerald-400"
                            title={!perms.canActivateSeason ? 'Admin only' : ''}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab with Bar Graph */}
        {activeTab === 'leaderboard' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🍺 Season Leaderboard</h3>
              <select
                value={selectedSeasonId || ''}
                onChange={(e) => handleSelectSeason(e.target.value)}
                className="bg-ocean-800 border border-sand-700 rounded px-2 py-1"
              >
                <option value="">Select a season...</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>

            {!selectedSeasonId ? (
              <p className="text-sand-500">Select a season to view the leaderboard</p>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-4 md:py-8">
                <p className="text-sand-500 mb-4">No teams in this season yet</p>
                <button
                  onClick={handleSetSeasonTeams}
                  disabled={saving || teams.length === 0}
                  className="btn-primary"
                >
                  Add Teams to Season
                </button>
              </div>
            ) : (
              <>
                {/* Horizontal Bar Graph */}
                <div className="space-y-4 mb-8">
                  {sortedLeaderboard.map((team, index) => {
                    const barWidth = maxDrinks > 0 ? (team.drinkCount / MAX_DRINKS) * 100 : 0;
                    const isLeading = index === 0;
                    
                    return (
                      <div key={team.teamId} className="relative">
                        {/* Team Name and Drink Count */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2">
                            {isLeading && '🥇'}
                            <span className="font-medium">{team.teamName}</span>
                          </span>
                          <span className="text-sand-500 font-mono">
                            {team.drinkCount} drinks
                          </span>
                        </div>
                        
                        {/* Bar Container */}
                        <div className="relative h-8 bg-ocean-800 rounded overflow-hidden">
                          {/* The Bar */}
                          <div 
                            className="absolute top-0 left-0 h-full rounded transition-all duration-500"
                            style={{ 
                              width: `${Math.min(barWidth, 100)}%`,
                              backgroundColor: isLeading ? '#D4A574' : '#00B4D8'
                            }}
                          />
                          
                          {/* Drink Count Label on Bar */}
                          {barWidth > 5 && (
                            <div className="absolute top-0 left-2 h-full flex items-center">
                              <span className="text-sm font-bold" style={{ color: '#023E8A' }}>
                                {team.drinkCount}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Scale Labels */}
                        <div className="flex justify-between mt-1 text-xs text-sand-500">
                          <span>0</span>
                          <span>50</span>
                          <span>100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Admin Controls - Add/Remove Drinks */}
                {perms.canEditAnyTeamDrinks && (
                  <div className="card mt-6">
                    <h4 className="font-medium mb-4">🍺 Adjust Drinks</h4>
                    <div className="space-y-2">
                      {sortedLeaderboard.map((team, index) => (
                        <div
                          key={team.teamId}
                          className="flex items-center justify-between p-3 bg-ocean-800 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl md:text-2xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </span>
                            <span className="font-medium">{team.teamName}</span>
                          </div>
                          <div className="flex items-center gap-3 md:p-4">
                            <span className="text-lg md:text-xl font-bold text-emerald-400">
                              {team.drinkCount}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleAddDrink(team.teamId)}
                                disabled={saving}
                                className="px-3 py-1 bg-sand-600 hover:bg-sand-500 rounded text-sm"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => handleRemoveDrink(team.teamId)}
                                disabled={saving || team.drinkCount <= 0}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm disabled:opacity-50"
                              >
                                -1
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}