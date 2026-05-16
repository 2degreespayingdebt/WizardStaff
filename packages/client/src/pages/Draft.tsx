import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDraftSocket } from '../hooks/useDraftSocket';
import type { Player } from '../types';

export default function Draft() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { board, loading, makePick } = useDraftSocket({ draftId: id || null });
  
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
  const [timeLeft, setTimeLeft] = useState(60);
  
  // Reset timer when pick changes
  useEffect(() => {
    if (board?.draft) {
      setTimeLeft(board.draft.pickTimeSeconds || 60);
    }
  }, [board?.draft?.currentPick, board?.draft?.currentRound]);
  
  // Countdown effect
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
                {isMyTurn ? "🎯 Your Turn!" : "Waiting..."}
              </p>
            </div>
            <div className={`text-2xl font-mono ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Draft Board */}
        <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">Draft Board</h3>
          
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
        
        {/* Right Panel - My Team */}
        <div className="w-1/3 border-l border-gray-700 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">🍺 My Drinker</h3>
          
          {/* Make Pick Button */}
          {isMyTurn && (
            <div className="mb-4">
              {selectedPlayer ? (
                <button
                  onClick={handleMakePick}
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Selecting...' : `Draft ${selectedPlayer.name}`}
                </button>
              ) : (
                <p className="text-center text-gray-400 text-sm">
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