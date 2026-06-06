import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'teamLead' | 'player';

const ADMIN_PASSWORD = 'ZIMMER';
const PLAYER_PASSWORD = 'DUFFY';

export default function Login() {
  const navigate = useNavigate();
  const [adminPassword, setAdminPassword] = useState('');
  const [playerPassword, setPlayerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (role: UserRole, redirectPath: string) => {
    setError(null);
    setLoading(true);

    try {
      // Store the role in localStorage for app-wide access
      localStorage.setItem('wizardstaff_role', role);
      localStorage.setItem('wizardstaff_auth', 'true');
      
      // Navigate to the appropriate page
      navigate(redirectPath);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminPassword === ADMIN_PASSWORD) {
      handleLogin('admin', '/');
    } else {
      setError('Invalid admin password. Please try again.');
      setAdminPassword('');
    }
  };

  const handleTeamLeadClick = () => {
    handleLogin('teamLead', '/select-player');
  };

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (playerPassword === PLAYER_PASSWORD) {
      handleLogin('player', '/select-player');
    } else {
      setError('Invalid player password. Please try again.');
      setPlayerPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-4" style={{ backgroundColor: '#023E8A' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3" style={{ color: '#D4A574' }}>
            🍺
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            WizardStaff
          </h2>
          <p className="text-sand-500">Drinking Buddy Draft</p>
        </div>

        {/* Login Options */}
        <div className="space-y-4">
          {/* Admin Login */}
          <div className="card">
            <div className="text-center mb-4">
              <div className="text-3xl md:text-4xl mb-2">👑</div>
              <h3 className="text-lg md:text-xl font-semibold text-white">Admin</h3>
              <p className="text-sm text-sand-500">Full access to all features</p>
            </div>
            
            <form onSubmit={handleAdminSubmit} className="space-y-3">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary"
                style={{ backgroundColor: '#D4A574', color: '#023E8A' }}
              >
                {loading ? 'Logging in...' : 'Login as Admin'}
              </button>
            </form>
          </div>

          {/* Team Lead Login - No password needed */}
          <div className="card opacity-50">
            <div className="text-center mb-4">
              <div className="text-3xl md:text-4xl mb-2">🏄</div>
              <h3 className="text-lg md:text-xl font-semibold text-white">Team Lead</h3>
              <p className="text-sm text-sand-500">Limited access for team management</p>
            </div>
            
            <button
              disabled={true}
              className="w-full btn-primary cursor-not-allowed"
              style={{ backgroundColor: '#666', color: '#ccc' }}
            >
              Deactivated
            </button>
          </div>

          {/* Player Login */}
          <div className="card">
            <div className="text-center mb-4">
              <div className="text-3xl md:text-4xl mb-2">🍺</div>
              <h3 className="text-lg md:text-xl font-semibold text-white">Player</h3>
              <p className="text-sm text-sand-500">View only access for the draft</p>
            </div>
            
            <form onSubmit={handlePlayerSubmit} className="space-y-3">
              <input
                type="password"
                value={playerPassword}
                onChange={(e) => setPlayerPassword(e.target.value)}
                placeholder="Enter player password"
                className="w-full"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary"
                style={{ backgroundColor: '#90E0EF', color: '#023E8A' }}
              >
                {loading ? 'Logging in...' : 'Login as Player'}
              </button>
            </form>
          </div>

          {error && (
            <p className="text-center text-red-400 text-sm mt-4">{error}</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sand-500 text-sm mt-8">
          Use your assigned password to access the draft
        </p>
      </div>
    </div>
  );
}