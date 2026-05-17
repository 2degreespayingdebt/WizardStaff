import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Player } from '../types';

export default function PlayerList() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Always refresh data when page loads
  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const data = await api.getPlayers();
      // Sort alphabetically by name
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setPlayers(sorted);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-ocean-800 border-b border-ocean-700">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:p-4">
            <h1 className="text-lg md:text-xl font-bold text-sand-500">🪄 WizardStaff</h1>
            <nav className="flex gap-3 md:p-4 ml-8">
              <button onClick={() => navigate('/')} className="text-sand-500 hover:text-white">
                Dashboard
              </button>
              <button onClick={() => navigate('/leagues')} className="text-sand-500 hover:text-white">
                Leagues
              </button>
              <button className="text-white hover:text-sand-500">
                Players
              </button>
            </nav>
          </div>
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
      </header>

      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-6">Players</h2>
        
        <div className="flex gap-4 mb-6">
          <button onClick={() => navigate('/players/new')} className="btn-primary">
            Create Drinker
          </button>
          <button onClick={() => navigate('/players/bulk-import')} className="btn-secondary">
            Bulk Import
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sand-500"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12 text-sand-500">
            No players yet. Create some drinkers to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-4 bg-ocean-800 rounded border border-ocean-700"
              >
                {player.profile_image ? (
                    <img
                      src={player.profile_image}
                      alt={player.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                  <div className="w-12 h-12 rounded-full bg-ocean-700 flex items-center justify-center">
                    🍺
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{player.name}</p>
                  <p className="text-sm text-sand-500">
                    {player.position}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/players/${player.id}`)}
                  className="text-sand-500 hover:text-white text-sm"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}