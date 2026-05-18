import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import type { Player } from '../types';

export default function PlayerList() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
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

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete(player);
    setShowDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!playerToDelete) return;
    
    setDeleting(true);
    try {
      await api.deletePlayer(playerToDelete.id);
      setPlayers(players.filter(p => p.id !== playerToDelete.id));
      setShowDelete(false);
      setPlayerToDelete(null);
    } catch (error) {
      console.error('Failed to delete player:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDelete(false);
    setPlayerToDelete(null);
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setShowImageModal(true);
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
              <button onClick={() => navigate('/players')} className="text-white hover:text-sand-500">
                Players
              </button>
              <button onClick={() => navigate('/draft')} className="text-white hover:text-sand-500">
                Draft Room
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center p-4 bg-ocean-800 rounded border border-ocean-700"
              >
                {/* Avatar - centered, 20% larger (60 -> 72) */}
                <div className="mb-2">
                  {player.profile_image ? (
                    <img
                      src={player.profile_image}
                      alt={player.name}
                      className="w-72 h-72 rounded-full object-cover cursor-pointer hover:opacity-80"
                      onClick={() => handleImageClick(player.profile_image!)}
                    />
                  ) : (
                    <div className="w-72 h-72 rounded-full bg-ocean-700 flex items-center justify-center text-5xl">
                      🍺
                    </div>
                  )}
                </div>
                {/* Player name centered below avatar - double font size */}
                <p className="font-medium text-center text-2xl mb-2">{player.name}</p>
                {/* View and Delete buttons at bottom */}
                <div className="flex justify-between w-full mt-auto pt-2">
                  <button
                    onClick={() => navigate(`/players/${player.id}`)}
                    className="text-sand-500 hover:text-white text-sm"
                  >
                    View
                  </button>
                  {perms.isAdmin && (
                    <button
                      onClick={() => handleDeleteClick(player)}
                      disabled={deleting}
                      className="text-red-500 hover:text-red-400 text-sm"
                      title="Delete player (admin only)"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-ocean-800 p-6 rounded-lg max-w-md w-full mx-4 border border-sand-500">
              <h3 className="text-xl font-bold mb-4">Delete Player</h3>
              <p className="text-sand-500 mb-6">
                Are you sure you want to delete "{playerToDelete?.name}"? 
                <br /><br />
                This action cannot be undone.
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="btn-danger"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-size Image Modal */}
        {showImageModal && selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setShowImageModal(false)}
          >
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-sand-500"
            >
              ✕
            </button>
          </div>
        )}
      </main>
    </div>
  );
}