import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import type { League, Team, Season, SeasonTeam } from '../types';

type Tab = 'teams' | 'seasons' | 'leaderboard';

export default function League() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [leaderboard, setLeaderboard] = useState<SeasonTeam[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('teams');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  
  // Team form state
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  
  // Season form state
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonName, setSeasonName] = useState('');

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
        loadLeaderboard(active.id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (seasonId: string) => {
    try {
      const lb = await api.getSeasonLeaderboard(seasonId);
      setLeaderboard(lb);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  // Team handlers
  const handleCreateTeam = async () => {
    if (!teamName.trim() || !id) return;
    try {
      setSaving(true);
      const team = await api.createTeam(id, teamName);
      setTeams([...teams, team]);
      setTeamName('');
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
      const updated = await api.updateTeam(editingTeam.id, teamName);
      setTeams(teams.map(t => t.id === updated.id ? updated : t));
      setTeamName('');
      setEditingTeam(null);
      setShowTeamForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Season handlers
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
      await loadLeaderboard(seasonId);
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
      await loadLeaderboard(selectedSeasonId);
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
      await loadLeaderboard(seasonId);
    }
  };

  // Drink count handlers
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sand-500"></div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'League not found'}</p>
          <Link to="/leagues" className="btn-primary">
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-ocean-800 border-b border-ocean-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/leagues')} className="text-sand-500 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold">{league.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* League Info */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold">{league.name}</h2>
          <p className="text-sand-500">
            🍺 {teams.length}/{league.maxTeams} Teams
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ocean-700 mb-6">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'teams'
                ? 'text-sand-500 border-b-2 border-sand-500'
                : 'text-sand-500 hover:text-white'
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('seasons')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'seasons'
                ? 'text-sand-500 border-b-2 border-sand-500'
                : 'text-sand-500 hover:text-white'
            }`}
          >
            Seasons ({seasons.length})
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 font-medium ${
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

            {/* Team Form */}
            {showTeamForm && (
              <div className="card mb-4 border-sand-500">
                <h4 className="font-medium mb-3">
                  {editingTeam ? 'Edit Team' : 'Add New Team'}
                </h4>
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
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Teams List */}
            {teams.length === 0 ? (
              <p className="text-sand-500">No teams yet. Add your first team!</p>
            ) : (
              <div className="space-y-2">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 bg-ocean-800 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sand-500 w-6">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-sand-500">
                          {team.managerName || 'Unknown Manager'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTeam(team);
                          setTeamName(team.name);
                          setShowTeamForm(true);
                        }}
                        disabled={!perms.canEditAnyTeam}
                        className="text-sm text-sand-500 hover:text-white"
                        title={!perms.canEditAnyTeam ? 'Admin only' : ''}
                      >
                        Edit
                      </button>
                    </div>
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

            {/* Season Form */}
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
                    placeholder="Season name (e.g., Summer 2024)"
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

            {/* Seasons List */}
            {seasons.length === 0 ? (
              <p className="text-sand-500">No seasons yet. Add your first season!</p>
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

                    {/* Season Teams */}
                    {selectedSeasonId === season.id && (
                      <div className="mt-3 pt-3 border-t border-ocean-700">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm text-sand-500">Teams in Season</p>
                          <button
                            onClick={handleSetSeasonTeams}
                            disabled={saving}
                            className="text-sm text-sand-500 hover:text-emerald-400"
                          >
                            Set All Teams
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Select season */}
            {seasons.length > 0 && (
              <div className="mt-4">
                <label className="text-sm text-sand-500">
                  Select season to view/edit:
                </label>
                <select
                  value={selectedSeasonId || ''}
                  onChange={(e) => handleSelectSeason(e.target.value)}
                  className="ml-2 bg-ocean-800 border border-ocean-700 rounded px-2 py-1"
                >
                  <option value="">Select a season...</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🍺 Drink Leaderboard</h3>
              <select
                value={selectedSeasonId || ''}
                onChange={(e) => handleSelectSeason(e.target.value)}
                className="bg-ocean-800 border border-ocean-700 rounded px-2 py-1"
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
              <div className="text-center py-8">
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
              <div className="space-y-2">
                {leaderboard.map((team, index) => (
                  <div
                    key={team.teamId}
                    className={`flex items-center justify-between p-4 bg-ocean-800 rounded ${
                      index === 0 ? 'border-2 border-yellow-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-bold w-10 ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-amber-600' :
                        'text-sand-500'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div>
                        <p className="font-medium text-lg">{team.teamName}</p>
                        <p className="text-sm text-sand-500">
                          {activeSeason?.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-emerald-400">{team.drinkCount}</p>
                        <p className="text-xs text-sand-500">drinks</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleAddDrink(team.teamId)}
                          disabled={saving || !perms.canEditAnyTeamDrinks}
                          className="px-3 py-1 bg-sand-600 hover:bg-sand-500 rounded text-sm disabled:opacity-50"
                          title={!perms.canEditAnyTeamDrinks ? 'Admin only' : ''}
                        >
                          +1 🍺
                        </button>
                        <button
                          onClick={() => handleRemoveDrink(team.teamId)}
                          disabled={saving || team.drinkCount <= 0 || !perms.canEditAnyTeamDrinks}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm disabled:opacity-50"
                          title={!perms.canEditAnyTeamDrinks ? 'Admin only' : ''}
                        >
                          -1 🍺
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}