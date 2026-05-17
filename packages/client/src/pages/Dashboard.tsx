import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import { api } from '../services/api';
import type { League } from '../types';

export default function Dashboard() {
  const { role, logout } = useRole();
  const navigate = useNavigate();
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
    <div className="min-h-screen" style={{ backgroundColor: '#023E8A' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#0077B6', borderColor: '#D4A574' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold" style={{ color: '#D4A574' }}>🍺 WizardStaff</h1>
            <nav className="flex gap-4 ml-8">
              <Link to="/" className="text-white hover:text-sand-500">
                Dashboard
              </Link>
              <Link to="/leagues" className="text-sand-500 hover:text-white">
                Leagues
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sand-500">
              {role === 'admin' ? '👑 Admin' : '🏄 Team Lead'}
            </span>
            <button 
              onClick={() => { logout(); navigate('/login'); }} 
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {role === 'admin' ? 'Admin' : 'Team Lead'}!</h2>
            <p className="text-sand-500">Manage your drinking draft leagues</p>
          </div>
          <Link to="/leagues" className="btn-primary">
            + Create League
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sand-500"></div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sand-500 mb-4">No leagues yet</p>
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
                      className="card hover:border-sand-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{league.name}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            league.draftStatus === 'in_progress'
                              ? 'bg-sand-600'
                              : 'bg-yellow-600'
                          }`}
                        >
                          {league.draftStatus === 'in_progress'
                            ? 'Draft Live'
                            : 'Pending'}
                        </span>
                      </div>
                      <div className="text-sm text-sand-500">
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
                      className="card hover:border-sand-500 transition-colors"
                    >
                      <h4 className="font-semibold mb-2">{league.name}</h4>
                      <div className="text-sm text-sand-500">
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