import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'teamLead';

const ADMIN_PASSWORD = 'ZIMMER';
const TEAM_LEAD_PASSWORD = 'Surfside';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (role: UserRole) => {
    setError(null);
    setLoading(true);

    try {
      // Store the role in localStorage for app-wide access
      localStorage.setItem('wizardstaff_role', role);
      localStorage.setItem('wizardstaff_auth', 'true');
      
      // Navigate to dashboard
      navigate('/');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    
    const correctPassword = role === 'admin' ? ADMIN_PASSWORD : TEAM_LEAD_PASSWORD;
    
    if (password === correctPassword) {
      handleLogin(role);
    } else {
      setError('Invalid password. Please try again.');
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
            
            <form onSubmit={(e) => handleSubmit(e, 'admin')} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Team Lead Login */}
          <div className="card">
            <div className="text-center mb-4">
              <div className="text-3xl md:text-4xl mb-2">🏄</div>
              <h3 className="text-lg md:text-xl font-semibold text-white">Team Lead</h3>
              <p className="text-sm text-sand-500">Limited access for team management</p>
            </div>
            
            <form onSubmit={(e) => handleSubmit(e, 'teamLead')} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter team lead password"
                className="w-full"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary"
                style={{ backgroundColor: '#00B4D8', color: '#023E8A' }}
              >
                {loading ? 'Logging in...' : 'Login as Team Lead'}
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