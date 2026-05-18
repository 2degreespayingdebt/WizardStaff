import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDraftSocket } from '../hooks/useDraftSocket';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../services/api';
import type { Player, League, Season, SeasonTeam } from '../types';

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
  
  const { board, loading, makePick, pauseDraft, resumeDraft, undoPick } = useDraftSocket({ draftId: draftIdFromUrl || null });
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
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
    
    return players;
  }, [board?.availablePlayers, searchQuery]);
  
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
  
  // Get picks for a specific team
  const getTeamPicks = (teamId: string) => {
    if (!board?.picks) return [];
    return board.picks.filter(p => p.teamId === teamId);
  };
  
  // Reset timer when pick changes
  useEffect(() => {
    if (board?.draft) {
      setTimeLeft(board.draft.pickTimeSeconds || 120);
    }
  }, [board?.draft?.currentPick, board?.draft?.currentRound]);
  
  // Countdown effect (pauses when draft is paused)
  useEffect(() => {
    if (!board?.draft || board.draft.status !== 'active') return;
    if (timeLeft <= 0) return;
    
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, board?.draft?.status]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isMyTurn = true; // TODO: Check if current user's team
  
  const handleMakePick = () => {
    if (!selectedPlayer || !board?.draft?.currentManagerId) return;
    makePick(board.draft.currentManagerId, selectedPlayer.id);
    setSelectedPlayer(null);
  };
  
  // Show loading spinner while connecting to draft
  if (draftIdFromUrl && !board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sand-500"></div>
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
                  onChange={(e) => {
                    const seasonId = e.target.value;
                    setSelectedSeasonId(seasonId);
                    if (seasonId) {
                      handleContinue();
                    }
                  }}
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
  
  const { draft, picks } = board;
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-ocean-800 border-b border-ocean-700">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 md:p-4">
            <Link to="/" className="text-sand-500 hover:text-white">Dashboard</Link>
            <Link to="/leagues" className="text-sand-500 hover:text-white">Leagues</Link>
            <Link to="/draft" className="text-white hover:text-sand-500">Draft Room</Link>
            <h1 className="text-lg font-bold">🍺 Live Draft</h1>
            
            {/* Current Season Display */}
            {selectedSeasonId && (
              <span className="ml-4 text-sand-500">
                {seasons.find(s => s.id === selectedSeasonId)?.name || 'Season'}
              </span>
            )}
          </div>
          
          {/* Draft Status & Logout */}
          <div className="flex items-center gap-3 md:p-4">
            <div className="text-right">
              <p className="text-sm text-sand-500">
                Round {draft.currentRound} • Pick {draft.currentPick}
              </p>
              <p className="font-bold text-sand-500">
                {draft.status === 'paused' ? '⏸ Paused' : isMyTurn ? "🎯 Your Turn!" : "Waiting..."}
              </p>
            </div>
            
            {/* Pause/Resume Button */}
            {draft.status !== 'completed' && (
              <button
                onClick={() => draft.status === 'paused' ? resumeDraft() : pauseDraft()}
                disabled={loading || !perms.canPauseDraft}
                className={`px-3 py-1 rounded text-sm ${
                  draft.status === 'paused'
                    ? 'bg-sand-600 hover:bg-sand-500'
                    : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
                title={!perms.canPauseDraft ? 'Admin only' : ''}
              >
                {draft.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}
            
            {/* Undo Button */}
            {draft.status !== 'completed' && picks.length > 0 && (
              <button
                onClick={() => undoPick()}
                disabled={loading || !perms.canUndoPick}
                className="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50"
                title={!perms.canUndoPick ? 'Admin only' : ''}
              >
                ↩ Undo
              </button>
            )}
            
            {/* Logout Button */}
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
            
            <div className={`text-xl md:text-2xl font-mono ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
        
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
        <div className={`w-full md:w-1/3 border-r border-ocean-700 p-3 md:p-4 overflow-y-auto ${
          mobileTab !== 'picks' ? 'hidden md:block' : ''
        }`}>
          <h3 className="font-semibold mb-4">📋 Picks Made</h3>
          
          <div className="space-y-1">
            {picks.map((pick) => (
              <div
                key={`${pick.round}-${pick.pick}`}
                className={`flex items-center justify-between py-2 px-3 rounded ${
                  pick.round === draft.currentRound && pick.pick === draft.currentPick
                    ? 'bg-sand-900 border border-sand-500'
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
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0">
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
                        <p className="text-xs text-sand-500">
                          {pick.teamName}
                        </p>
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
            <h3 className="font-semibold">Available Drinkers</h3>
            <span className="text-sm text-sand-500">
              {availablePlayers.length} available
            </span>
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
                    : isMyTurn
                    ? 'bg-ocean-800 hover:bg-ocean-700'
                    : 'bg-ocean-800 opacity-50'
                }`}
              >
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => isMyTurn && setSelectedPlayer(player)}
                >
                  {/* Drinker Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0 border-2 border-gray-600">
                    {player.profileImage ? (
                      <img 
                        src={player.profileImage} 
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl md:text-2xl">
                        🍺
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/players/${player.id}`}
                      className="font-medium hover:text-sand-500 block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {player.name}
                    </Link>
                    <p className="text-sm text-sand-500 truncate">
                      {player.team || 'Free Agent'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-medium text-emerald-400">
                    {player.projectedPoints?.toFixed(1) || '--'}
                  </p>
                  <p className="text-xs text-sand-500">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Panel - Team Rosters */}
        <div className={`w-full md:w-1/3 border-l border-ocean-700 p-3 md:p-4 overflow-y-auto ${
          mobileTab !== 'teams' ? 'hidden md:block' : ''
        }`}>
          <h3 className="font-semibold mb-4">👥 Team Rosters</h3>
          
          {seasonTeams.length > 0 ? (
            <div className="space-y-2">
              {/* Team List - Click to view their picks */}
              {seasonTeams.map((team, index) => {
                const teamPicks = getTeamPicks(team.teamId);
                const isSelected = selectedTeamId === team.teamId;
                
                return (
                  <div key={team.teamId}>
                    {/* Team Header - Click to expand */}
                    <button
                      onClick={() => setSelectedTeamId(isSelected ? null : team.teamId)}
                      className={`w-full flex items-center justify-between p-2 rounded text-left ${
                        isSelected ? 'bg-sand-900 border border-sand-500' : 'bg-ocean-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sand-500 w-6">#{index + 1}</span>
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
                    
                    {/* Team's Picks - Shown when expanded */}
                    {isSelected && (
                      <div className="mt-1 ml-4 space-y-1">
                        {teamPicks.length === 0 ? (
                          <p className="text-sand-500 text-sm py-1">No picks yet</p>
                        ) : (
                          teamPicks.map((pick, i) => (
                            <div
                              key={pick.id}
                              className="flex items-center gap-2 py-1 px-2 bg-gray-750 rounded text-sm"
                            >
                              <span className="text-sand-500 w-8">
                                {pick.round}.{pick.pick}
                              </span>
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-ocean-700 flex-shrink-0">
                                {pick.playerImage ? (
                                  <img 
                                    src={pick.playerImage} 
                                    alt={pick.playerName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">
                                    🍺
                                  </div>
                                )}
                              </div>
                              <span className="truncate">{pick.playerName}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sand-500 text-sm">
              {selectedSeasonId ? 'No teams in this season' : 'Select a season above'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}