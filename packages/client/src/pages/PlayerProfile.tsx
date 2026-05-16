import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Player } from '../types';

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await api.updatePlayer(player!.id, { profileImage: base64 });
      setPlayer({ ...player!, profileImage: base64 });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Player not found</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold">🍺 Drinker Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
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
              <div className="w-32 h-32 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                {player.profileImage ? (
                  <img
                    src={player.profileImage}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-gray-500">🍺</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors">
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
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h.93z" />
                  </svg>
                )}
              </label>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold">{player.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-emerald-500 font-medium">🍺 Drinker</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span>Rank: #{player.adp || 'N/A'}</span>
                <span>Proj: {player.projectedPoints?.toFixed(1) || 'N/A'} pts</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
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
                <span className="text-sm text-gray-500">
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
        </div>
      </main>
    </div>
  );
}