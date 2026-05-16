import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDraftSocket } from '../hooks/useDraftSocket';
import { api } from '../services/api';
import type { Player, Season, SeasonTeam } from '../types';

export default function Draft() {
  const { id: draftIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Season selection state
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  
  const { board, loading, makePick, pauseDraft, resumeDraft } = useDraftSocket({ draftId: draftIdFromUrl || null });
  
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
  
  // Load seasons on mount
  useEffect(() => {
    async function loadSeasons() {
      try {
        // Get leagues first to find one with seasons
        const leagues = await api.getLeagues();
        if (leagues.length > 0) {
          const leagueId = leagues[0].id;
          const seasonsData = await api.getSeasons(leagueId);
          setSeasons(seasonsData);
          
          // Auto-select active season if available
          const activeSeason = seasonsData.find((s: Season) => s.isActive);
          if (activeSeason) {
            setSelectedSeasonId(activeSeason.id);
            const teams = await api.getSeasonLeaderboard(activeSeason.id);
            setSeasonTeams(teams);
          }
        }
      } catch (err) {
        console.error('Failed to load seasons:', err);
      } finally {
        setLoadingSeasons(false);
      }
    }
    loadSeasons();
  }, []);
  
  // Handle season selection
  const handleSeasonSelect = async (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    try {
      // Load teams for this season
      const teams = await api.getSeasonLeaderboard(seasonId);
      setSeasonTeams(teams);
      
      // Get or create draft for this season
      const { draftId } = await api.getOrCreateDraft(seasonId);
      navigate(`/draft/${draftId}`, { replace: true });
    } catch (err) {
      console.error('Failed to start draft:', err);
    }
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
  
  if (loading && !board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  if (!board?.draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Draft not found</p>
          <button onClick={() => navigate('/leagues')} className="btn-primary">
            Back to Leagues
          </button>
        </div>
      </div>
    );
  }
  
  const { draft, picks } = board;
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/leagues')} className="text-gray-400 hover:text-white">
              ← Back
            </button>
            <h1 className="text-lg font-bold">🍺 Live Draft</h1>
            
            {/* Season Selector */}
            <select
              value={selectedSeasonId}
              onChange={(e) => handleSeasonSelect(e.target.value)}
              disabled={loadingSeasons}
              className="ml-4 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="">Select a season...</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
            <Link to="/players/new" className="text-sm text-emerald-500 hover:text-emerald-400 ml-auto">
              + Create Custom Drinker
            </Link>
          </div>
          
          {/* Draft Status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">
                Round {draft.currentRound} • Pick {draft.currentPick}
              </p>
              <p className="font-bold text-emerald-500">
                {draft.status === 'paused' ? '⏸ Paused' : isMyTurn ? "🎯 Your Turn!" : "Waiting..."}
              </p>
            </div>
            
            {/* Pause/Resume Button */}
            {draft.status !== 'completed' && (
              <button
                onClick={() => draft.status === 'paused' ? resumeDraft() : pauseDraft()}
                disabled={loading}
                className={`px-3 py-1 rounded text-sm ${
                  draft.status === 'paused'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
              >
                {draft.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}
            
            <div className={`text-2xl font-mono ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Picks Made */}
        <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">📋 Picks Made</h3>
          
          <div className="space-y-1">
            {picks.map((pick) => (
              <div
                key={`${pick.round}-${pick.pick}`}
                className={`flex items-center justify-between py-2 px-3 rounded ${
                  pick.round === draft.currentRound && pick.pick === draft.currentPick
                    ? 'bg-emerald-900 border border-emerald-500'
                    : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-8">
                    {pick.round}.{pick.pick}
                  </span>
                  {pick.playerId ? (
                    <div className="flex items-center gap-2">
                      {/* Small avatar for drafted player */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
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
                        <p className="text-xs text-gray-400">
                          {pick.teamName}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">On the clock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Center Panel - Available Drinkers */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Available Drinkers</h3>
            <span className="text-sm text-gray-400">
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
                    ? 'bg-emerald-900 border border-emerald-500'
                    : isMyTurn
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-gray-800 opacity-50'
                }`}
              >
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => isMyTurn && setSelectedPlayer(player)}
                >
                  {/* Drinker Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 border-2 border-gray-600">
                    {player.profileImage ? (
                      <img 
                        src={player.profileImage} 
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍺
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/players/${player.id}`}
                      className="font-medium hover:text-emerald-500 block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {player.name}
                    </Link>
                    <p className="text-sm text-gray-400 truncate">
                      {player.team || 'Free Agent'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-medium text-emerald-400">
                    {player.projectedPoints?.toFixed(1) || '--'}
                  </p>
                  <p className="text-xs text-gray-400">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Panel - Teams in Season */}
        <div className="w-1/3 border-l border-gray-700 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">🍺 Season Teams</h3>
          
          {/* Show current teams in this season */}
          {seasonTeams.length > 0 ? (
            <div className="space-y-2">
              {seasonTeams.map((team, index) => (
                <div
                  key={team.teamId}
                  className="flex items-center justify-between p-2 bg-gray-800 rounded"
                >
                  <span className="text-gray-400 w-6">#{index + 1}</span>
                  <span className="font-medium">{team.teamName}</span>
                  <span className="text-emerald-400 text-sm">
                    {team.drinkCount} 🍺
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              {selectedSeasonId ? 'No teams in this season' : 'Select a season above'}
            </p>
          )}
        </div>
                  Select a drinker to draft
                </p>
              )}
            </div>
          )}
          
          {/* Roster Preview */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Your drafted drinkers will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}