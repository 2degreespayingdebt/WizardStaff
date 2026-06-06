import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDraftSocket } from '../hooks/useDraftSocket';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../services/api';
import type { Player, League, Season, SeasonTeam, DraftPick } from '../types';

export default function Draft() {
  const { id: draftIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  
  // League and season selection state (for when no draft is active)
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [loadingSelections, setLoadingSelections] = useState(true);
  
  // Draft state
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'picks' | 'available' | 'teams'>('available');
  
  const { board, loading, makePick, pauseDraft, resumeDraft, undoPick, startDraft, error: draftError, initialized, saveDraft } = useDraftSocket({ draftId: draftIdFromUrl || null });

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [pendingDraftPlayer, setPendingDraftPlayer] = useState<Player | null>(null);
  const [localPicks, setLocalPicks] = useState<DraftPick[]>([]);
  const [viewingPick, setViewingPick] = useState<DraftPick | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter available players by search
  const availablePlayers = useMemo(() => {
    if (!board?.availablePlayers) return [];

    let players = board.availablePlayers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      players = players.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.team?.toLowerCase().includes(query)
      );
    }

    // Exclude locally drafted players too
    const draftedIds = new Set(localPicks.map(lp => lp.playerId));
    players = players.filter(p => !draftedIds.has(p.id));

    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [board?.availablePlayers, searchQuery, localPicks]);
  
  // Countdown timer - syncs when pick changes
  const [timeLeft, setTimeLeft] = useState(120);
  
  // Load leagues on mount (when no draft is active)
  useEffect(() => {
    async function loadLeagues() {
      try {
        const data = await api.getLeagues();
        // Sort alphabetically by name
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setLeagues(sorted);
        if (sorted.length > 0) {
          setSelectedLeagueId(sorted[0].id);
        }
      } catch (err) {
        console.error('Failed to load leagues:', err);
      } finally {
        setLoadingSelections(false);
      }
    }
    loadLeagues();
  }, []);
  
  // Load seasons when league changes
  useEffect(() => {
    async function loadSeasons() {
      if (!selectedLeagueId) {
        setSeasons([]);
        return;
      }
      try {
        const data = await api.getSeasons(selectedLeagueId);
        // Sort alphabetically by name
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setSeasons(sorted);
        setSelectedSeasonId('');
      } catch (err) {
        console.error('Failed to load seasons:', err);
      }
    }
    loadSeasons();
  }, [selectedLeagueId]);
  
  // Handle season selection - create/navigate to draft
  const handleSeasonSelect = async (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setSelectedTeamId(null);
    try {
      const teams = await api.getSeasonLeaderboard(seasonId);
      setSeasonTeams(teams);
      const { draftId } = await api.getOrCreateDraft(seasonId);
      navigate(`/draft/${draftId}`, { replace: true });
    } catch (err) {
      console.error('Failed to start draft:', err);
    }
  };

  const [continuing, setContinuing] = useState(false);

  const handleContinue = async () => {
    if (!selectedSeasonId || !selectedLeagueId) {
      alert('Please select both a league and a season');
      return;
    }
    
    setContinuing(true);
    try {
      // Get or create draft for the selected season
      const { draftId } = await api.getOrCreateDraft(selectedSeasonId);
      navigate(`/draft/${draftId}`, { replace: true });
    } catch (err) {
      console.error('Failed to start draft:', err);
      alert('Failed to start draft');
    } finally {
      setContinuing(false);
    }
  };
  
  // Get picks for a specific team (filters both server picks + local optimistics by teamId)
  const getTeamPicks = (teamId: string) => {
    const serverPicks = board?.picks ?? [];
    const filteredServerPicks = serverPicks.filter(p => p.teamId === teamId);
    const filteredLocalPicks = localPicks.filter(lp => lp.teamId === teamId);
    return [...filteredServerPicks, ...filteredLocalPicks];
  };
  
  // Reset timer when pick changes
  useEffect(() => {
    if (board?.draft) {
      setTimeLeft(board.draft.pickTimeSeconds || 120);
    }
  }, [board?.draft?.currentPick, board?.draft?.currentRound]);
  
  // Load season teams when draft board loads (handles direct URL navigation too)
  useEffect(() => {
    async function loadTeams() {
      const sid = selectedSeasonId || board?.draft?.seasonId;
      if (!sid) return;
      try {
        const teams = await api.getSeasonTeams(sid);
        const sorted = [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
        setSeasonTeams(sorted);
      } catch (err) {
        console.error('Failed to load season teams:', err);
      }
    }
    loadTeams();
  }, [selectedSeasonId, board?.draft?.seasonId]);

  // Countdown effect (only runs when draft is active, not scheduled)
  useEffect(() => {
    if (!board?.draft) return;
    if (board.draft.status !== 'active') return;
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, board?.draft?.status]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isMyTurn = true; // TODO: Check if current user's team
  
  const handleMakePick = () => {
    if (!selectedPlayer) return;
    makePick('', selectedPlayer.id);
    setSelectedPlayer(null);
  };
  
  // Show loading spinner while connecting to draft
  if (draftIdFromUrl && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: '#D4A574' }}></div>
          <p className="text-sand-500 text-sm">Loading draft...</p>
          {draftError && <p className="text-red-400 text-xs mt-2">{draftError}</p>}
        </div>
      </div>
    );
  }
  
  // Show selection modal when: no draft in URL AND no board/draft loaded
  const hasDraftId = !!draftIdFromUrl;
  const showModal = !hasDraftId || !board?.draft;
  
  if (showModal) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        {/* Header */}
        <header className="bg-ocean-800 border-b border-ocean-700 fixed top-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 md:p-4">
              <Link to="/" className="text-sand-500 hover:text-white">Dashboard</Link>
              <Link to="/leagues" className="text-sand-500 hover:text-white">Leagues</Link>
              <Link to="/draft" className="text-white hover:text-sand-500">Draft Room</Link>
              <h1 className="text-lg font-bold">🍺 Live Draft</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('wizardstaff_role');
                  localStorage.removeItem('wizardstaff_auth');
                  localStorage.removeItem('wizardstaff_token');
                  navigate('/login');
                }}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        
        {/* Selection Panel */}
        <div className="mt-20 bg-ocean-800 p-6 rounded-lg border border-ocean-700 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold mb-4">Select League & Season</h2>
          <p className="text-sand-500 mb-6">Choose a league and season to view or start a draft.</p>
          
          {loadingSelections ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sand-500"></div>
            </div>
          ) : (
            <>
              {/* League Dropdown */}
              <div className="mb-4">
                <label className="block text-sm text-sand-500 mb-2">League</label>
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  className="w-full bg-ocean-700 border border-ocean-600 rounded px-3 py-2"
                >
                  <option value="">Select a league...</option>
                  {leagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Season Dropdown */}
              <div className="mb-6">
                <label className="block text-sm text-sand-500 mb-2">Season</label>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  disabled={!selectedLeagueId}
                  className="w-full bg-ocean-700 border border-ocean-600 rounded px-3 py-2 disabled:opacity-50"
                >
                  <option value="">Select a season...</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} {season.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Bottom buttons */}
              <div className="flex justify-between items-center">
                <Link to="/leagues" className="text-sand-500 hover:text-white">
                  ← Back to Leagues
                </Link>
                <button
                  onClick={() => handleContinue()}
                  disabled={!selectedSeasonId || !selectedLeagueId || continuing}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {continuing ? 'Loading...' : 'Continue'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  
  const { draft, picks: serverPicks } = board;
  
  return (
    <div className="min-h-screen">
      {/* Header — 40% shorter, centered branding, compact controls */}
      <header className="bg-ocean-800 border-b border-ocean-700">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between">

          {/* Left: Compact Nav */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sand-500 hover:text-white text-sm">Dashboard</Link>
            <Link to="/leagues" className="text-sand-500 hover:text-white text-sm">Leagues</Link>
            <Link to="/draft" className="text-white hover:text-sand-500 text-sm">Draft Room</Link>
          </div>

          {/* Center: League + Season Branding */}
          <div className="text-center">
            <h1 className="text-base font-bold text-sand-500 leading-tight">
              🍺 {selectedSeasonId ? (seasons.find(s => s.id === selectedSeasonId)?.name || 'Draft') : 'Live Draft'}
            </h1>
          </div>

          {/* Right: Draft Controls */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-sand-500">
                R{draft.currentRound} · P{draft.currentPick}
              </p>
              <p className="text-xs font-bold text-sand-500">
                {draft.status === 'paused' ? '⏸ Paused' : draft.status === 'scheduled' ? 'Ready' : isMyTurn ? "🎯 Your Turn!" : "Waiting"}
              </p>
            </div>

            {/* Start/Pause Toggle Button */}
            {draft.status !== 'completed' && (
              <button
                onClick={() => {
                  if (draft.status === 'scheduled') {
                    startDraft();
                  } else if (draft.status === 'paused') {
                    resumeDraft();
                  } else {
                    pauseDraft();
                  }
                }}
                disabled={loading || !perms.canPauseDraft}
                className={`px-2 py-1 rounded text-xs ${
                  draft.status === 'scheduled'
                    ? 'bg-green-600 hover:bg-green-500'
                    : draft.status === 'paused'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
                title={!perms.canPauseDraft ? 'Admin only' : ''}
              >
                {draft.status === 'scheduled'
                  ? '▶ Start'
                  : draft.status === 'paused'
                  ? '▶ Resume'
                  : '⏸ Pause'}
              </button>
            )}

            {/* Undo Button */}
            {draft.status !== 'completed' && localPicks.length + serverPicks.length > 0 && (
              <button
                onClick={() => {
                  if (localPicks.length > 0) {
                    // Optimistically undo the last local pick
                    setLocalPicks(prev => prev.slice(0, -1));
                  } else {
                    // Server pick — call undo API
                    undoPick();
                  }
                }}
                disabled={loading || !perms.canUndoPick}
                className="px-2 py-1 rounded text-xs bg-sand-600 hover:bg-sand-500 disabled:opacity-50"
                title={!perms.canUndoPick ? 'Admin only' : ''}
              >
                ↩
              </button>
            )}

            {/* Reset Button */}
            <button
              onClick={async () => {
                if (!draftIdFromUrl) return;
                if (!confirm('Are you sure you want to reset the draft? All picks will be cleared.')) return;
                try {
                  await api.resetDraft(draftIdFromUrl);
                  setLocalPicks([]);
                  window.location.reload();
                } catch (err) {
                  console.error('Reset error:', err);
                }
              }}
              disabled={loading || !perms.canUndoPick}
              className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50"
              title={!perms.canUndoPick ? 'Admin only' : ''}
            >
              🔄 Reset
            </button>

            {/* Save Button - Always visible to finalize draft to rosters */}
            <button
              onClick={async () => {
                // Save local picks first
                if (localPicks.length > 0) {
                  const toSave = localPicks.map(lp => ({
                    teamId: lp.teamId,
                    playerId: lp.playerId || '',
                    round: lp.round,
                    pick: lp.pick,
                  }));
                  await saveDraft(toSave);
                  setLocalPicks([]);
                }
                // Then reload to refresh the board
                window.location.reload();
              }}
              disabled={loading}
              className="px-2 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
              title="Save all draft picks to team rosters"
            >
              💾 Save
            </button>

            {/* Timer */}
            <div className={`font-mono text-lg ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-col md:flex-row h-[calc(100vh-52px)]">
        
        {/* Mobile: Tab buttons instead of 3 columns */}
        <div className="md:hidden flex border-b border-ocean-700">
          <button
            onClick={() => setMobileTab('picks')}
            className={`flex-1 py-3 px-2 text-sm font-medium ${
              mobileTab === 'picks' ? 'bg-ocean-700 text-sand-500' : 'text-sand-500'
            }`}
          >
            📋 Picks
          </button>
          <button
            onClick={() => setMobileTab('available')}
            className={`flex-1 py-3 px-2 text-sm font-medium ${
              mobileTab === 'available' ? 'bg-ocean-700 text-sand-500' : 'text-sand-500'
            }`}
          >
            🍺 Available
          </button>
          <button
            onClick={() => setMobileTab('teams')}
            className={`flex-1 py-3 px-2 text-sm font-medium ${
              mobileTab === 'teams' ? 'bg-ocean-700 text-sand-500' : 'text-sand-500'
            }`}
          >
            👥 Teams
          </button>
        </div>
        
        {/* Left Panel - Picks Made - Desktop */}
        <div className={`w-[19%] border-r border-ocean-700 p-3 md:p-4 overflow-y-auto ${
          mobileTab !== 'picks' ? 'hidden md:block' : ''
        }`}>
          <h3 className="font-semibold mb-4">📋 Picks Made</h3>
          
          <div className="space-y-1">
            {[...serverPicks, ...localPicks].map((pick) => (
              <div
                key={`${pick.round}-${pick.pick}`}
                onClick={() => pick.playerId && setViewingPick(pick)}
                className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors ${
                  pick.round === draft.currentRound && pick.pick === draft.currentPick
                    ? 'bg-sand-900 border border-sand-500'
                    : pick.playerId
                    ? 'bg-amber-900/40 border border-amber-700 hover:bg-amber-800/50'
                    : 'bg-ocean-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sand-500 text-sm w-8">
                    {pick.round}.{pick.pick}
                  </span>
                  {pick.playerId ? (
                    <div className="flex items-center gap-2">
                      {/* Small avatar for drafted player */}
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0">
                        {pick.playerImage ? (
                          <img
                            src={pick.playerImage}
                            alt={pick.playerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">
                            🍺
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{pick.playerName}</p>
                        <p className="text-xs font-bold" style={{ color: '#D4A574' }}>Drafted</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sand-500 text-sm">On the clock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Center Panel - Available Drinkers */}
        <div className={`flex-1 p-3 md:p-4 overflow-y-auto ${
          mobileTab !== 'available' ? 'hidden md:block' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">Available Drinkers</h3>
              <span className="text-sm text-sand-500">
                {availablePlayers.length} available
              </span>
            </div>
          </div>
          
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drinkers..."
              className="w-full"
            />
          </div>
          
          {/* Drinker List */}
          <div className="grid grid-cols-1 gap-2">
            {availablePlayers.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                  selectedPlayer?.id === player.id
                    ? 'bg-sand-900 border border-sand-500'
                    : 'bg-ocean-800 hover:bg-ocean-700'
                }`}
              >
                <div
                  className="flex items-center gap-3 flex-1"
                  onClick={() => setSelectedPlayer(player)}
                >
                  {/* Drinker Avatar */}
                  <div className="w-48 h-48 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0 border-2 border-gray-600">
                    {player.profileImage ? (
                      <img
                        src={player.profileImage}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍺
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium hover:text-sand-500 block truncate">{player.name}</span>
                    <p className="text-sm text-sand-500 truncate">{player.team || 'Free Agent'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-medium text-emerald-400">
                    {player.projected_points ? Number(player.projected_points).toFixed(1) : '--'}
                  </p>
                  <p className="text-xs text-sand-500">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Panel - Team Rosters */}
        <div className={`w-[49%] border-l border-ocean-700 p-3 md:p-4 overflow-y-auto ${
          mobileTab !== 'teams' ? 'hidden md:block' : ''
        }`}>
          <h3 className="font-semibold mb-4">👥 Team Rosters</h3>
          
          {seasonTeams.length > 0 ? (
            <div className="space-y-0 divide-y divide-ocean-700">
              {/* Team List - Click to view their picks */}
              {seasonTeams.map((team) => {
                const teamPicks = getTeamPicks(team.teamId);
                const isSelected = selectedTeamId === team.teamId;

                return (
                  <div key={team.teamId} className="pt-2 first:pt-0 pb-2">
                    {/* Team Header - Click to expand */}
                    <button
                      onClick={() => setSelectedTeamId(isSelected ? null : team.teamId)}
                      className={`w-full flex items-center justify-between p-2 rounded text-left ${
                        isSelected ? 'bg-sand-900 border border-sand-500' : 'bg-ocean-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sand-500 w-6">#{team.seed ?? '?'}</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0">
                          {team.avatarUrl ? (
                            <img src={team.avatarUrl} alt={team.teamName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">👥</div>
                          )}
                        </div>
                        <span className="font-medium">{team.teamName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-sm">
                          {teamPicks.length} 🍺
                        </span>
                        <span className="text-sand-500">
                          {isSelected ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {/* Team Roster - Always visible below header */}
                    {teamPicks.length === 0 ? (
                      <p className="text-sand-500 text-xs pl-12 py-1">No picks yet</p>
                    ) : (
                      <div className="pl-10 pt-1 flex flex-wrap gap-3">
                        {teamPicks.map((pick) => (
                          <div key={pick.id} className="flex flex-col items-center gap-1">
                            <div className="w-36 h-36 rounded-full overflow-hidden bg-ocean-700">
                              {pick.playerImage ? (
                                <img src={pick.playerImage} alt={pick.playerName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">🍺</div>
                              )}
                            </div>
                            <span className="text-xs text-sand-500 text-center leading-tight">{pick.playerName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sand-500 text-sm">
              {selectedSeasonId ? 'No teams in this season' : 'Loading teams...'}
            </p>
          )}
        </div>
      </div>

      {/* Player Detail Modal — shown in view mode OR draft mode */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-ocean-800 rounded-lg border border-ocean-700 max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-1.5 border-b border-ocean-700">
              <h3 className="font-bold text-xl">🍺 Drinker Details</h3>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-sand-500 hover:text-white active:text-sand-400 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body — 100% larger */}
            <div className="p-6">
              <div className="flex flex-col items-center gap-6">
                {/* Large Avatar — 200% larger */}
                <div className="w-80 h-80 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0 border-2 border-gray-600">
                  {selectedPlayer.profileImage ? (
                    <img
                      src={selectedPlayer.profileImage}
                      alt={selectedPlayer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🍺
                    </div>
                  )}
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-4xl font-bold">{selectedPlayer.name}</h4>
                  <p className="text-xl text-sand-500">{selectedPlayer.team || 'Free Agent'}</p>
                  <p className="text-base text-sand-500">
                    Rank: #{selectedPlayer.adp || 'N/A'}
                  </p>
                  <p className="text-base text-sand-500">
                    Projected: {selectedPlayer.projected_points ? Number(selectedPlayer.projected_points).toFixed(1) : '--'} pts
                  </p>
                  {selectedPlayer.description && (
                    <p className="text-base text-sand-400 mt-2 italic">
                      "{selectedPlayer.description}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col gap-2 p-4 border-t border-ocean-700">
              {draftError && (
                <p className="text-sm text-red-400 bg-red-900/30 p-2 rounded">{draftError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-4 py-2 rounded bg-ocean-700 hover:bg-ocean-600"
                >
                  Close
                </button>
                {board?.draft && board.draft.status !== 'completed' && (
                  <button
                    onClick={() => {
                      setPendingDraftPlayer(selectedPlayer);
                      setSelectedPlayer(null);
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-50"
                  >
                    Draft
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Pick Modal — click a pick in Picks Made column */}
      {viewingPick && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPick(null)}
        >
          <div
            className="bg-ocean-800 rounded-lg border border-ocean-700 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-1.5 border-b border-ocean-700">
              <h3 className="font-bold text-lg">🍺 Drafted Drinker</h3>
              <button
                onClick={() => setViewingPick(null)}
                className="text-sand-500 hover:text-white active:text-sand-400 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-center gap-6">
                {/* Large Avatar */}
                <div className="w-32 h-32 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0">
                  {viewingPick.playerImage ? (
                    <img
                      src={viewingPick.playerImage}
                      alt={viewingPick.playerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🍺
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold">{viewingPick.playerName}</h4>
                  <p className="text-sm text-sand-500 mt-1">
                    Drafted #{viewingPick.round}.{viewingPick.pick}
                  </p>
                  {viewingPick.teamName && (
                    <p className="text-sm text-sand-500 mt-1">
                      Team: {viewingPick.teamName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-ocean-700">
              <button
                onClick={() => setViewingPick(null)}
                className="px-4 py-2 rounded bg-ocean-700 hover:bg-ocean-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Draft: Select Team Modal */}
      {pendingDraftPlayer && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPendingDraftPlayer(null)}
        >
          <div
            className="bg-ocean-800 rounded-lg border border-ocean-700 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-1.5 border-b border-ocean-700">
              <h3 className="font-bold text-lg">🍺 Confirm Draft</h3>
              <button
                onClick={() => setPendingDraftPlayer(null)}
                className="text-sand-500 hover:text-white active:text-sand-400 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {/* Player being drafted */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-ocean-700">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0">
                  {pendingDraftPlayer.profileImage ? (
                    <img src={pendingDraftPlayer.profileImage} alt={pendingDraftPlayer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍺</div>
                  )}
                </div>
                <div>
                  <p className="font-bold">{pendingDraftPlayer.name}</p>
                  <p className="text-sm text-sand-500">{pendingDraftPlayer.team || 'Free Agent'}</p>
                </div>
              </div>
              <p className="text-sm text-sand-500 mb-3">Select the team that drafted this player:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...seasonTeams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999)).map((team) => (
                  <button
                    key={team.teamId}
                    onClick={() => {
                      // Optimistic update: add pick to local state immediately
                      const round = board?.draft?.currentRound ?? 1;
                      const pick = (board?.picks?.length ?? 0) + localPicks.length + 1;
                      const newPick: DraftPick = {
                        id: `temp-${Date.now()}`,
                        draftId: board?.draft?.id ?? '',
                        round,
                        pick,
                        teamId: team.teamId,
                        playerId: pendingDraftPlayer.id,
                        selectedAt: new Date().toISOString(),
                        teamName: team.teamName,
                        playerName: pendingDraftPlayer.name,
                        playerImage: pendingDraftPlayer.profileImage ?? undefined,
                      };
                      setLocalPicks(prev => [...prev, newPick]);
                      setPendingDraftPlayer(null);
                      makePick(team.teamId, pendingDraftPlayer.id);
                    }}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 bg-ocean-700 hover:bg-ocean-600 rounded text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-ocean-600 flex-shrink-0">
                      {team.avatarUrl ? (
                        <img src={team.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">👥</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">#{team.seed ?? '?'} {team.teamName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-ocean-700">
              <button
                onClick={() => setPendingDraftPlayer(null)}
                className="px-4 py-2 rounded bg-ocean-700 hover:bg-ocean-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}