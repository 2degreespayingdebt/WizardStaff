import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, register, error } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(formData.username, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-500 mb-2">🪄 WizardStaff</h1>
          <p className="text-gray-400">Fantasy Football Draft Platform</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  className="w-full"
                  placeholder="yourname"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="w-full"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="w-full"
                placeholder="••••••••"
              />
            </div>

            {(localError || error) && (
              <div className="text-red-500 text-sm">{localError || error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Login'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-400">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-emerald-500 hover:underline"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-emerald-500 hover:underline"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}