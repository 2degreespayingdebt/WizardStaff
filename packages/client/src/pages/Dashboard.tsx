import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { League, User } from '../types';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

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

  const activeLeagues = leagues.filter(
    (l) => l.draftStatus === 'in_progress' || l.draftStatus === 'pending'
  );

  const completedLeagues = leagues.filter((l) => l.draftStatus === 'completed');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-emerald-500">🪄 WizardStaff</h1>
            <nav className="flex gap-4 ml-8">
              <Link to="/" className="text-white hover:text-emerald-500">
                Dashboard
              </Link>
              <Link to="/leagues" className="text-gray-400 hover:text-white">
                Leagues
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{user?.displayName || user?.username}</span>
            <button onClick={logout} className="btn-secondary text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user?.displayName || user?.username}!</h2>
            <p className="text-gray-400">Manage your fantasy football leagues</p>
          </div>
          <Link to="/leagues" className="btn-primary">
            + Create League
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 mb-4">No leagues yet</p>
            <Link to="/leagues" className="btn-primary">
              Create Your First League
            </Link>
          </div>
        ) : (
          <>
            {/* Active Leagues */}
            {activeLeagues.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Active Leagues</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeLeagues.map((league) => (
                    <Link
                      key={league.id}
                      to={`/leagues/${league.id}`}
                      className="card hover:border-emerald-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{league.name}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            league.draftStatus === 'in_progress'
                              ? 'bg-emerald-600'
                              : 'bg-yellow-600'
                          }`}
                        >
                          {league.draftStatus === 'in_progress'
                            ? 'Draft Live'
                            : 'Pending'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        <p>{league.teams?.length || 0}/{league.maxTeams} Teams</p>
                        <p>{league.scoringFormat} scoring</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Leagues */}
            {completedLeagues.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Past Seasons</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedLeagues.map((league) => (
                    <Link
                      key={league.id}
                      to={`/leagues/${league.id}`}
                      className="card hover:border-emerald-500 transition-colors"
                    >
                      <h4 className="font-semibold mb-2">{league.name}</h4>
                      <div className="text-sm text-gray-400">
                        <p>{league.teams?.length || 0}/{league.maxTeams} Teams</p>
                        <p>Season Complete</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}