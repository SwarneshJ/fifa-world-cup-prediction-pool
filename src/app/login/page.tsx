'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trophy, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        username: username.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid username or password.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mb-4 animate-bounce">
          <Trophy className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
          Prediction Pool
        </h2>
        <p className="mt-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
          World Cup 2026 Private Group
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-card py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-black text-slate-750 uppercase tracking-wider">
                Username
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-350 rounded-xl text-slate-900 text-sm placeholder-slate-450 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-black text-slate-750 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-350 rounded-xl text-slate-900 text-sm placeholder-slate-450 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
