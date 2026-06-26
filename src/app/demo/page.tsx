'use client';

import React, { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Trophy, Loader2, AlertCircle } from 'lucide-react';

export default function DemoPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startDemoSession = async () => {
      try {
        const res = (await signIn('credentials', {
          username: 'demo',
          password: 'demopassword',
          callbackUrl: '/',
          redirect: true,
        })) as any;
        
        if (res?.error) {
          setError('Failed to initialize demo session. Please try again.');
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
      }
    };

    startDemoSession();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white selection:bg-emerald-500/35">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative w-full max-w-md text-center space-y-8 z-10">
        <div className="flex flex-col items-center space-y-4">
          <div className="inline-flex items-center justify-center p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)] animate-pulse mb-2">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight uppercase">
            Prediction Pool
          </h2>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest leading-none mt-1">
            ✨ Demo Mode ✨
          </p>
        </div>

        <div className="glass-card bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-sm font-semibold justify-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 transition-all font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Retry Demo Login
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-5 py-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="space-y-1.5">
                <p className="text-sm font-extrabold text-slate-200">
                  Setting up read-only demo session...
                </p>
                <p className="text-[11px] text-slate-500 font-semibold max-w-[280px] mx-auto leading-relaxed">
                  You are logging in to explore the prediction pool features. Making modifications or voting is disabled in demo mode.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
