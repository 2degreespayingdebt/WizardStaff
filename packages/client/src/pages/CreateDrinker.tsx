import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function CreateDrinker() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const drinker = await api.createDrinker(name, description, profileImage || undefined);
      navigate(`/players/${drinker.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold">🍺 Create Custom Drinker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-gray-500">🍺</span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h.93z" />
                  </svg>
                </label>
              </div>
              {profileImage && (
                <button
                  type="button"
                  onClick={() => setProfileImage(null)}
                  className="text-sm text-red-500 hover:text-red-400"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full"
              placeholder="Enter drinker's name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 resize-none"
              placeholder="Write a short description..."
              maxLength={500}
            />
            <span className="text-sm text-gray-500">{description.length}/500 characters</span>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !name}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Drinker'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}