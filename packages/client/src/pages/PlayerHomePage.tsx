import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Player } from '../types';

export default function PlayerHomePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const password = searchParams.get('password') || '';
  const teamName = searchParams.get('team') || '';
  const seasonName = searchParams.get('season') || '';
  const [player, setPlayer] = useState<Player | null>(null);
  const [count, setCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('wizardstaff_role');
    localStorage.removeItem('wizardstaff_auth');
    localStorage.removeItem('wizardstaff_token');
    window.location.href = '/login';
  };
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId && password) {
      loadPlayer(playerId);
    }
  }, [playerId, password]);

  const loadPlayer = async (id: string) => {
    try {
      const data = await api.getPlayer(id);
      // Verify password matches player name (case sensitive)
      if (data && password && data.name === password) {
        setPlayer(data);
        setAuthorized(true);
      } else if (data && !password) {
        // No password provided, allow access (for testing)
        setPlayer(data);
        setAuthorized(true);
      }
    } catch (error) {
      console.error('Failed to load player:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMinus = () => {
    setCount(prev => Math.max(0, prev - 1));
  };

  const handlePlus = () => {
    setCount(prev => prev + 1);
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
      {/* Header - Single line, max height 100px */}
      <header className="bg-ocean-800 border-b border-ocean-700 h-[100px] flex items-center">
        <div className="max-w-md mx-auto px-3 w-full flex items-center justify-between">
          {/* Left: Season Name */}
          <span className="text-xl font-bold" style={{ color: '#D4A574' }}>
            {seasonName || 'Season'}
          </span>
          
          {/* Right: Avatar with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2"
            >
              {player?.profileImage || player?.profile_image ? (
                <img
                  src={'http://localhost:3001' + (player.profileImage || player.profile_image)}
                  alt={player?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-ocean-700 flex items-center justify-center">
                  🏈
                </div>
              )}
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-ocean-800 border border-ocean-700 rounded-lg shadow-lg z-50">
                <div className="px-4 py-2 border-b border-ocean-700">
                  <span className="text-sand-500 text-sm">Signed in as:</span>
                  <p className="font-bold">{player?.name || 'Unknown'}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-ocean-700 text-sand-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 py-8">
        <div className="flex flex-col items-center">
          {/* Player Avatar */}
          {player?.profileImage || player?.profile_image ? (
            <img
              src={'http://localhost:3001' + (player.profileImage || player.profile_image)}
              alt={player.name}
              className="w-[240px] h-[300px] rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-[240px] h-[300px] rounded-full bg-ocean-700 flex items-center justify-center text-6xl mb-4">
              🏈
            </div>
          )}
          
          {/* Player Name */}
          <h1 className="text-3xl font-bold text-center mb-2">{player?.name || 'Unknown Player'}</h1>
          
          {/* Team Name Box */}
          {teamName && (
            <div className="bg-ocean-800 px-6 py-3 rounded-lg border border-ocean-700 mb-6">
              <span className="text-sand-500">Team: </span>
              <span className="font-bold">{teamName}</span>
            </div>
          )}
          
          {/* Counter Section */}
          <div className="flex items-center gap-6">
            {/* Minus Button */}
            <button
              onClick={handleMinus}
              className="w-14 h-14 rounded-full bg-ocean-700 hover:bg-ocean-600 text-2xl font-bold flex items-center justify-center"
            >
              −
            </button>
            
            {/* Count Display */}
            <span className="text-4xl font-bold w-12 text-center">{count}</span>
            
            {/* Plus Button */}
            <button
              onClick={handlePlus}
              className="w-14 h-14 rounded-full bg-ocean-700 hover:bg-ocean-600 text-2xl font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}