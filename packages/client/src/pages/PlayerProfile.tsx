import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import type { Player } from '../types';

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  const [player, setPlayer] = useState<Player | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) loadPlayer(id);
  }, [id]);

  const loadPlayer = async (playerId: string) => {
    try {
      const data = await api.getPlayer(playerId);
      setPlayer(data);
      setDescription(data.description || '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!player) return;

    setSaving(true);
    setError(null);

    try {
      await api.updatePlayer(player.id, { description });
      setPlayer({ ...player, description });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetStatus = async (status: 'active' | 'out') => {
    if (!player || saving) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await api.setPlayerStatus(player.id, status, undefined);
      setPlayer({ ...player, status: updated.status });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async () => {
      setUploading(true);
      try {
        const base64 = reader.result as string;
        await api.updatePlayer(player.id, { profileImage: base64 });
        setPlayer({ ...player, profileImage: base64 });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploading(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#D4A574' }}></div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Player not found'}</p>
          <button onClick={() => navigate(-1)} className="btn-primary">← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#023E8A' }}>
      <header className="border-b" style={{ backgroundColor: '#0077B6', borderColor: '#D4A574' }}>
        <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:p-4">
            <button onClick={() => navigate(-1)} className="text-sand-500 hover:text-white">
              ← Back
            </button>
            <h1 className="text-lg md:text-xl font-bold" style={{ color: '#D4A574' }}>🍺 Drinker Profile</h1>
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

      <main className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-200">
            Saved successfully!
          </div>
        )}

        <div className="card">
          <div className="flex items-start gap-6 mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-lg bg-ocean-700 flex items-center justify-center overflow-hidden">
                {player.profileImage ? (
                  <img
                    src={player.profileImage}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl md:text-4xl text-sand-500">🍺</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-sand-600 p-2 rounded-full cursor-pointer hover:bg-sand-700 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <span className="text-white text-xs">📷</span>
                )}
              </label>
            </div>

            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold">{player.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-sand-500 font-medium">🍺 Drinker</span>
                {player.status !== 'active' && (
                  <span className="text-xs bg-red-600 px-2 py-0.5 rounded">INACTIVE</span>
                )}
              </div>
              <div className="flex items-center gap-3 md:p-4 mt-2 text-sm text-sand-500">
                <span>Rank: #{player.adp || 'N/A'}</span>
                <span>Proj: {player.projectedPoints?.toFixed(1) || 'N/A'} pts</span>
              </div>
            </div>
          </div>

          <div className="border-t border-ocean-700 pt-6">
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <div className="flex flex-col gap-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a short description about this drinker..."
                className="w-full h-32 resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-sand-500">
                  {description.length}/500 characters
                </span>
                <button
                  onClick={handleSaveDescription}
                  disabled={saving || description === (player.description || '')}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Description'}
                </button>
              </div>
            </div>
          </div>

          {/* Admin: Player Status Controls */}
          {perms.isAdmin && (
            <div className="border-t border-ocean-700 pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-3">⚙️ Player Status (Admin Only)</h3>
              
              <div className="flex items-center gap-3 md:p-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetStatus('active')}
                    disabled={saving || player.status === 'active'}
                    className={`px-3 md:px-4 py-2 rounded font-medium ${
                      player.status === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-ocean-700 hover:bg-ocean-600'
                    }`}
                  >
                    ✓ Active
                  </button>
                  <button
                    onClick={() => handleSetStatus('out')}
                    disabled={saving || player.status === 'out'}
                    className={`px-3 md:px-4 py-2 rounded font-medium ${
                      player.status === 'out'
                        ? 'bg-red-600 text-white'
                        : 'bg-ocean-700 hover:bg-ocean-600'
                    }`}
                  >
                    ✗ Inactive
                  </button>
                </div>
                
                <span className="text-sm text-sand-500">
                  {player.status === 'active' 
                    ? 'Player is available for drafting' 
                    : 'Player is NOT available for drafting'}
                </span>
              </div>
              
              <p className="text-xs text-sand-500 mt-2">
                Note: Cannot inactivate a player who has been drafted in the current active season draft.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}