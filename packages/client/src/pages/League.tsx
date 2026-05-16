import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { League, Team, Draft } from '../types';

export default function League() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadLeague(id);
  }, [id]);

  const loadLeague = async (leagueId: string) => {
    try {
      const data = await api.getLeague(leagueId);
      setLeague(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startDraft = async () => {
    if (!league || !league.teams || league.teams.length < 2) return;
    
    try {
      // TODO: Call API to start draft
      const draftId = 'demo-draft-id'; // Temporary
      navigate(`/draft/${draftId}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'League not found'}</p>
          <Link to="/leagues" className="btn-primary">
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  const isCommissioner = false; // TODO: Check if current user is commissioner

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/leagues')} className="text-gray-400 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold">{league.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* League Info */}
        <div className="card mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{league.name}</h2>
              <p className="text-gray-400">
                {league.scoringFormat} • {league.maxTeams} Teams
              </p>
            </div>
            <span
              className={`text-lg px-3 py-1 rounded ${
                league.draftStatus === 'in_progress'
                  ? 'bg-emerald-600'
                  : league.draftStatus === 'completed'
                  ? 'bg-gray-600'
                  : 'bg-yellow-600'
              }`}
            >
              {league.draftStatus === 'in_progress'
                ? '🏈 Draft Live'
                : league.draftStatus === 'completed'
                ? '✓ Completed'
                : '⏳ Pending Draft'}
            </span>
          </div>

          {/* League Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Scoring</p>
              <p className="font-medium">{league.scoringFormat}</p>
            </div>
            <div>
              <p className="text-gray-400">Teams</p>
              <p className="font-medium">{league.teams?.length || 0}/{league.maxTeams}</p>
            </div>
            <div>
              <p className="text-gray-400">Playoff Teams</p>
              <p className="font-medium">{league.settings.playoffTeams}</p>
            </div>
            <div>
              <p className="text-gray-400">Waivers</p>
              <p className="font-medium uppercase">{league.settings.waiverType}</p>
            </div>
          </div>
        </div>

        {/* Start Draft Button (Commissioner) */}
        {isCommissioner && league.draftStatus === 'pending' && league.teams && league.teams.length >= 2 && (
          <div className="card mb-8 border-emerald-500">
            <p className="text-gray-400 mb-4">
              You have enough teams to start the draft!
            </p>
            <button onClick={startDraft} className="btn-primary">
              🏈 Start Draft
            </button>
          </div>
        )}

        {/* Teams List */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Teams ({league.teams?.length || 0})</h3>
          
          {(!league.teams || league.teams.length === 0) ? (
            <p className="text-gray-400">No teams yet. Invite friends to join!</p>
          ) : (
            <div className="space-y-3">
              {league.teams.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 w-6">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-sm text-gray-400">
                        {team.managerName || 'Unknown Manager'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/teams/${team.id}`)}
                    className="btn-secondary text-sm"
                  >
                    View Roster
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Section */}
        {league.inviteCode && (
          <div className="card mt-8">
            <h3 className="text-lg font-semibold mb-2">Invite Friends</h3>
            <p className="text-gray-400 text-sm mb-2">
              Share this code to invite others:
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xl font-mono bg-gray-700 px-4 py-2 rounded">
                {league.inviteCode}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(league.inviteCode!)}
                className="btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}