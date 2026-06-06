import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import type { Season, SeasonTeam, Team, DraftPick, Player } from '../types';

export default function SeasonPage() {
  const { leagueId, seasonId } = useParams<{ leagueId: string; seasonId: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  
  const [season, setSeason] = useState<Season | null>(null);
  const [league, setLeague] = useState<any>(null);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftedPlayers, setDraftedPlayers] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Drag state
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);
  
  // Edit state
  const [editing, setEditing] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  
  // Team management
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  
  useEffect(() => {
    if (leagueId && seasonId) loadData();
  }, [leagueId, seasonId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leagueData, seasonData] = await Promise.all([
        api.getLeague(leagueId!),
        api.getSeasons(leagueId!)
      ]);
      
      setLeague(leagueData);
      const found = seasonData.find((s: Season) => s.id === seasonId);
      setSeason(found || null);
      if (found) setSeasonName(found.name);
      
      // Load season teams
      const st = await api.getSeasonTeams(seasonId!);
      setSeasonTeams(st);
      
      // Load all league teams for adding
      setTeams(leagueData.teams || []);
      
      // Load draft ID for this season
      let draftId = null;
      try {
        const draftResult = await api.getOrCreateDraft(seasonId!);
        draftId = draftResult.draftId;
      } catch (err) {
        // No draft yet, that's ok
      }
      
      // Load draft board for drafted players (if draft exists)
      if (draftId) {
        const board = await api.getDraftBoard(draftId);
        if (board?.picks) {
          // Filter to only drafted players (with playerId) and sort alphabetically
          const drafted = board.picks
            .filter(p => p.playerId)
            .sort((a, b) => (a.playerName || '').localeCompare(b.playerName || ''));
          setDraftedPlayers(drafted);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!seasonName.trim() || !season) return;
    
    try {
      setSaving(true);
      const updated = await api.updateSeason(season.id, seasonName.trim());
      setSeason(updated);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTeam = async () => {
    if (!selectedTeamId || !season) return;
    
    try {
      setSaving(true);
      await api.addTeamToSeason(season.id, selectedTeamId);
      const st = await api.getSeasonTeams(season.id);
      setSeasonTeams(st);
      setShowAddTeam(false);
      setSelectedTeamId('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!season) return;
    
    try {
      setSaving(true);
      await api.removeTeamFromSeason(season.id, teamId);
      const st = await api.getSeasonTeams(season.id);
      setSeasonTeams(st);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
    setDragOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex: number) => {
    const dragIndex = dragItemRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      dragItemRef.current = null;
      return;
    }

    // Reorder locally first for immediate feedback
    const newTeams = [...seasonTeams];
    const [draggedItem] = newTeams.splice(dragIndex, 1);
    newTeams.splice(dropIndex, 0, draggedItem);
    setSeasonTeams(newTeams);
    setDragOverIndex(null);
    dragItemRef.current = null;

    // Persist the new order to the database
    saveTeamOrder(newTeams);
  };

  const saveTeamOrder = async (orderedTeams: SeasonTeam[]) => {
    if (!season) return;
    
    try {
      setSaving(true);
      // Update order for each team
      for (let i = 0; i < orderedTeams.length; i++) {
        await api.updateSeasonTeamOrder(season.id, orderedTeams[i].teamId, i + 1);
      }
      // Reload to get fresh data
      const st = await api.getSeasonTeams(season.id);
      setSeasonTeams(st);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate available teams (in league but not in this season)
  const teamIdsInSeason = new Set(seasonTeams.map(t => t.teamId));
  const availableTeams = teams.filter(t => !teamIdsInSeason.has(t.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#D4A574' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#023E8A' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#0077B6', borderColor: '#D4A574' }}>
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/leagues/${leagueId}`)} className="text-sand-500 hover:text-white">
              ← Back
            </button>
            <h1 className="text-lg md:text-xl font-bold" style={{ color: '#D4A574' }}>
              {league?.name || 'League'} / {season?.name || 'Season'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                localStorage.removeItem('wizardstaff_role');
                localStorage.removeItem('wizardstaff_auth');
                navigate('/login');
              }} 
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {season && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  {season.name}
                  {season.isActive && <span className="ml-2 text-sm bg-sand-600 px-2 py-0.5 rounded">Active</span>}
                </h2>
                <p className="text-sand-500 text-sm">
                  Created: {new Date(season.createdAt).toLocaleDateString()}
                </p>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="btn-primary">
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    className="input"
                  />
                  <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setSeasonName(season.name); }} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Season Teams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Teams in Season ({seasonTeams.length})</h3>
            {!showAddTeam ? (
              <button 
                onClick={() => setShowAddTeam(true)} 
                className="btn-secondary text-sm"
                disabled={availableTeams.length === 0}
              >
                + Add Team
              </button>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="bg-ocean-800 border border-ocean-700 rounded px-2 py-1"
                >
                  <option value="">Select team...</option>
                  {availableTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <button 
                  onClick={handleAddTeam} 
                  disabled={saving || !selectedTeamId}
                  className="btn-primary text-sm"
                >
                  Add
                </button>
                <button 
                  onClick={() => { setShowAddTeam(false); setSelectedTeamId(''); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {seasonTeams.length === 0 ? (
            <p className="text-sand-500">No teams in this season yet.</p>
          ) : (
            <div className="space-y-2">
              {seasonTeams.map((st, idx) => (
                <div
                  key={st.id || st.teamId}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(idx)}
                  className={`
                    flex items-center justify-between bg-ocean-800 p-3 rounded cursor-move border border-ocean-700
                    transition-all duration-200
                    ${dragOverIndex === idx ? 'ring-2 ring-sand-500 scale-[1.02]' : ''}
                    ${dragItemRef.current === idx ? 'opacity-50' : ''}
                  `}
                  style={{ touchAction: 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sand-500 font-bold w-6">#{idx + 1}</span>
                    {st.avatarUrl ? (
                      <img
                        src={st.avatarUrl}
                        alt={st.teamName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-ocean-700 flex items-center justify-center text-xl">
                        🏈
                      </div>
                    )}
                    <span className="font-medium">{st.teamName}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeam(st.teamId)}
                    disabled={saving}
                    className="text-sand-500 hover:text-white font-semibold text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drafted Players */}
        {draftedPlayers.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold mb-4">Drafted Players ({draftedPlayers.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {draftedPlayers.map((pick) => (
                <div
                  key={pick.id}
                  className="bg-ocean-800 rounded-lg p-3 flex flex-col items-center"
                >
                  {(pick as any).playerImage || (pick as any).player_image ? (
                    <img
                      src={((pick as any).playerImage || (pick as any).player_image)}
                      alt={pick.playerName}
                      className="w-16 h-16 rounded-full object-cover mb-2"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-ocean-700 flex items-center justify-center text-2xl mb-2">
                      🏈
                    </div>
                  )}
                  <span className="text-sm font-medium text-center">{pick.playerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}