import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useRole } from '../hooks/useRole';
import type { League } from '../types';

export default function Leagues() {
  const navigate = useNavigate();
  const { role } = useRole();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leagueToDelete, setLeagueToDelete] = useState<League | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const league = await api.createLeague({
        name: formData.name,
      });
      navigate(`/leagues/${league.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { league } = await api.joinLeague(joinCode);
      navigate(`/leagues/${league.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (league: League) => {
    setLeagueToDelete(league);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!leagueToDelete) return;
    
    setError(null);
    setSubmitting(true);
    
    try {
      await api.deleteLeague(leagueToDelete.id);
      setLeagues(leagues.filter(l => l.id !== leagueToDelete.id));
      setShowDeleteModal(false);
      setLeagueToDelete(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setLeagueToDelete(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-ocean-800 border-b border-ocean-700">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:p-4">
            <h1 className="text-lg md:text-xl font-bold text-sand-500">🪄 WizardStaff</h1>
            <nav className="flex gap-3 md:p-4 ml-8">
              <Link to="/" className="text-sand-500 hover:text-white">
                Dashboard
              </Link>
              <Link to="/leagues" className="text-white hover:text-sand-500">
                Leagues
              </Link>
              <Link to="/players" className="text-white hover:text-sand-500">
                Players
              </Link>
            </nav>
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

      <main className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Leagues</h2>
            <p className="text-sand-500">Create or join a fantasy football league</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowJoin(false);
                setShowCreate(!showCreate);
              }}
              className="btn-secondary"
            >
              {showCreate ? 'Cancel' : 'Create League'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setShowJoin(!showJoin);
              }}
              className="btn-primary"
            >
              {showJoin ? 'Cancel' : 'Join League'}
            </button>
          </div>
        </div>

        {/* Create League Form */}
        {showCreate && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold mb-4">Create New League</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-sand-500 mb-1">League Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full"
                  placeholder="My Fantasy League"
                />
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create League'}
              </button>
            </form>
          </div>
        )}

        {/* Join League Form */}
        {showJoin && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold mb-4">Join League</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm text-sand-500 mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  className="w-full"
                  placeholder="ABCD12"
                />
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary disabled:opacity-50"
              >
                {submitting ? 'Joining...' : 'Join League'}
              </button>
            </form>
          </div>
        )}

        {/* League List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sand-500"></div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sand-500">
              No leagues yet. Create or join one to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map((league) => (
              <div 
                key={league.id} 
                className="card cursor-pointer hover:ring-2 hover:ring-sand-500"
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{league.name}</h3>
                    <div className="text-sm text-sand-500">
                      <span>{league.teams?.length || 0} Teams</span>
                      <span className="mx-2">•</span>
                      <span>Created: {new Date(league.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        league.draftStatus === 'in_progress'
                          ? 'bg-sand-600'
                          : league.draftStatus === 'completed'
                          ? 'bg-gray-600'
                          : 'bg-yellow-600'
                      }`}
                    >
                      {league.draftStatus === 'in_progress'
                        ? 'Draft Live'
                        : league.draftStatus === 'completed'
                        ? 'Completed'
                        : 'Pending'}
                    </span>
                    <button
                      onClick={() => navigate(`/leagues/${league.id}`)}
                      className="btn-secondary"
                    >
                      View
                    </button>
                    {role === 'admin' && (
                      <button
                        onClick={() => handleDeleteClick(league)}
                        disabled={submitting}
                        className="text-red-500 hover:text-red-400 text-sm"
                        title="Delete league (admin only)"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-ocean-800 p-6 rounded-lg max-w-md w-full mx-4 border border-sand-500">
              <h3 className="text-xl font-bold mb-4">Delete League</h3>
              <p className="text-sand-500 mb-6">
                Are you sure you want to delete "{leagueToDelete?.name}"? 
                <br /><br />
                This action cannot be undone. Teams will remain in the database.
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="btn-danger"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}