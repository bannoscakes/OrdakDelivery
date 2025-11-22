import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="text-gradient-pink-start">Ordak</span> Delivery
          </h1>
          <p className="text-ordak-gray-400">Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <LogIn className="text-gradient-cyan-start" size={24} />
            <h2 className="text-2xl font-bold text-white">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-ordak-red-primary/10 border border-ordak-red-primary/30 rounded-lg p-3">
                <p className="text-ordak-red-primary text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ordak-gray-400 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-ordak-gray-600 focus:outline-none focus:border-gradient-cyan-start"
                placeholder="admin@ordak.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ordak-gray-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-ordak-gray-600 focus:outline-none focus:border-gradient-cyan-start"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-border">
            <p className="text-sm text-ordak-gray-500 text-center">
              Demo credentials: admin@ordak.com / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
