import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import { api } from '../services/api';
import type { League, Season, DraftPick } from '../types';

export default function SelectPlayer() {
  const navigate = useNavigate();
  const { role, logout } = useRole();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [draftedPlayers, setDraftedPlayers] = useState<DraftPick[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<DraftPick | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Load leagues on mount
  useEffect(() => {
    loadLeagues();
  }, []);

  // Load seasons when league is selected
  useEffect(() => {
    if (selectedLeagueId) {
      loadSeasons(selectedLeagueId);
    } else {
      setSeasons([]);
      setSelectedSeasonId('');
    }
  }, [selectedLeagueId]);

  // Load drafted players when season is selected
  useEffect(() => {
    if (selectedSeasonId) {
      loadDraftedPlayers(selectedSeasonId);
    } else {
      setDraftedPlayers([]);
    }
  }, [selectedSeasonId]);

  const loadLeagues = async () => {
    try {
      const data = await api.getLeagues();
      setLeagues(data);
    } catch (error) {
      console.error('Failed to load leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasons = async (leagueId: string) => {
    try {
      const data = await api.getSeasons(leagueId);
      setSeasons(data);
    } catch (error) {
      console.error('Failed to load seasons:', error);
    }
  };

  const loadDraftedPlayers = async (seasonId: string) => {
    try {
      // Get or create draft for this season
      const { draftId } = await api.getOrCreateDraft(seasonId);
      // Get draft board with picks
      const board = await api.getDraftBoard(draftId);
      if (board?.picks) {
        // Filter to only drafted players (with playerId) and sort alphabetically
        const drafted = board.picks
          .filter(p => p.playerId)
          .sort((a, b) => (a.playerName || '').localeCompare(b.playerName || ''));
        setDraftedPlayers(drafted);
      }
    } catch (error) {
      console.error('Failed to load drafted players:', error);
      setDraftedPlayers([]);
    }
  };

  const handleLeagueChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLeagueId(e.target.value);
    setSelectedSeasonId('');
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(e.target.value);
  };

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
        <div className="max-w-md mx-auto px-3 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold" style={{ color: '#D4A574' }}>🍺 WizardStaff</h1>
          <button 
            onClick={() => { logout(); window.location.href = '/login'; }} 
            className="btn-secondary text-xs px-2 py-1"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 py-4">
        <div className="card pb-6">
          <h2 className="text-xl font-bold mb-4">Select a Player</h2>
          
          {/* League Dropdown */}
          <div className="mb-4">
            <label htmlFor="league-select" className="block text-sm font-medium mb-2">
              Select a League
            </label>
            <select
              id="league-select"
              value={selectedLeagueId}
              onChange={handleLeagueChange}
              className="w-full h-12 text-base"
            >
              <option value="">-- Select a League --</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </div>

          {/* Season Dropdown */}
          <div className="mb-4">
            <label htmlFor="season-select" className="block text-sm font-medium mb-2">
              Select a Season
            </label>
            <select
              id="season-select"
              value={selectedSeasonId}
              onChange={handleSeasonChange}
              disabled={!selectedLeagueId}
              className="w-full h-12 text-base"
            >
              <option value="">-- Select a Season --</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Drafted Players Section - Mobile optimized */}
          {selectedSeasonId && draftedPlayers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-base font-semibold mb-3">Drafted Players ({draftedPlayers.length})</h3>
              <div className="grid grid-cols-2 gap-6">
                {draftedPlayers.map((pick) => (
                  <button
                    key={pick.id}
                    onClick={() => { setSelectedPlayer(pick); setPassword(''); }}
                    className="bg-ocean-800 rounded-lg p-2 flex flex-col items-center border-2 border-transparent focus:border-sand-500 focus:outline-none"
                  >
                    {(pick as any).playerImage || (pick as any).player_image ? (
                      <img
                        src={'http://localhost:3001' + ((pick as any).playerImage || (pick as any).player_image)}
                        alt={pick.playerName}
                        className="w-[120px] h-[150px] rounded-full object-cover object-center mb-1"
                      />
                    ) : (
                      <div className="w-[120px] h-[150px] rounded-full bg-ocean-700 flex items-center justify-center text-4xl mb-1">
                        🏈
                      </div>
                    )}
                    <span className="text-xs font-medium text-center leading-tight">{pick.playerName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {selectedSeasonId && draftedPlayers.length === 0 && (
            <p className="text-sand-500 text-center text-sm mt-4">No players drafted yet.</p>
          )}
        </div>

        {/* Player Modal */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-ocean-900 rounded-lg w-full max-w-sm p-4 relative">
              {/* Close X button */}
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-2 right-2 text-sand-500 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
              
              {/* Player Avatar */}
              <div className="flex flex-col items-center mb-4">
                {(selectedPlayer as any).playerImage || (selectedPlayer as any).player_image ? (
                  <img
                    src={'http://localhost:3001' + ((selectedPlayer as any).playerImage || (selectedPlayer as any).player_image)}
                    alt={selectedPlayer.playerName}
                    className="w-24 h-24 rounded-full object-cover mb-2"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-ocean-700 flex items-center justify-center text-4xl mb-2">
                    🏈
                  </div>
                )}
                <h3 className="text-lg font-bold text-center">{selectedPlayer.playerName}</h3>
              </div>
              
              {/* Password Input */}
              <div className="mb-4">
                <label htmlFor="password-input" className="block text-sm font-medium mb-2">
                  Enter your password
                </label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-12 text-base"
                />
              </div>
              
              {/* Login As Button */}
              <button
                onClick={() => {
                  if (password === selectedPlayer.playerName) {
                    // Navigate to PlayerHomePage with player ID, password, and team name
                    const teamName = (selectedPlayer as any).teamName || '';
                    navigate(`/player/${selectedPlayer.playerId}?password=${encodeURIComponent(password)}&team=${encodeURIComponent(teamName)}`);
                  } else {
                    alert('Incorrect password. Please enter the player name.');
                  }
                }}
                disabled={!password}
                className="w-full btn-primary"
              >
                Login as {selectedPlayer.playerName}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}