import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStandings } from '@/app/actions';
import { Trophy, CheckCircle2, XCircle, Award } from 'lucide-react';

export const revalidate = 0; // Live leaderboard calculation

export default async function StandingsPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  const standings = await getStandings();

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
          Leaderboard
        </h1>
        <p className="text-xs text-slate-600">
          Standings & rankings of the private pool
        </p>
      </div>

      {/* Leaderboard Card List */}
      <div className="space-y-3">
        {standings.map((user, index) => {
          const rank = index + 1;
          const isCurrentUser = (session.user as any).id === String(user.userId);
          
          let rankBadgeBg = 'bg-slate-900 border-slate-800 text-slate-400';
          let rankIcon = null;

          if (rank === 1) {
            rankBadgeBg = 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold';
            rankIcon = <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />;
          } else if (rank === 2) {
            rankBadgeBg = 'bg-slate-300 text-slate-950 border-slate-200 font-extrabold';
          } else if (rank === 3) {
            rankBadgeBg = 'bg-amber-700 text-white border-amber-600 font-extrabold';
          }

          return (
            <div
              key={user.userId}
              className={`glass-card rounded-2xl border p-4 flex items-center justify-between shadow-md transition-all ${
                isCurrentUser
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/5'
                  : 'border-slate-200'
              }`}
            >
              {/* Left Side: Rank, Avatar/Badge, Name */}
              <div className="flex items-center gap-3 w-7/12">
                <div
                  className={`w-7 h-7 flex items-center justify-center text-xs rounded-lg border font-bold ${rankBadgeBg}`}
                >
                  {rank}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-bold truncate leading-tight ${
                        isCurrentUser ? 'text-emerald-700' : 'text-slate-800'
                      }`}
                    >
                      {user.name}
                    </span>
                    {rankIcon}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    @{user.username} {user.isAdmin && '• Admin'}
                  </span>
                </div>
              </div>

              {/* Right Side: Points */}
              <div className="flex items-center text-right w-5/12 justify-end shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-widest leading-none">
                    Points
                  </span>
                  <span className="text-xl font-black text-amber-500 dark:text-amber-400 leading-normal mt-0.5">
                    {user.totalPoints}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules Info Alert */}
      <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-900/30 text-xs text-emerald-950 dark:text-emerald-250 space-y-2">
        <h4 className="font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500 animate-pulse" /> Scoring Rules
        </h4>
        <ul className="list-disc list-inside space-y-1 text-[11px] font-medium">
          <li>Correct Match Outcome (Win/Draw/Away): <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">+1 point</span></li>
          <li>Incorrect prediction: <span className="text-rose-500 font-semibold">0 points</span></li>
        </ul>
      </div>
    </div>
  );
}
