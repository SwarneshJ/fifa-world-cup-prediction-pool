import { auth, signOut } from '@/lib/auth';
import { LogOut, Trophy } from 'lucide-react';

export default async function Header() {
  const session = await auth();
  if (!session || !session.user) return null;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-800 dark:border-slate-800 h-14 flex items-center justify-between px-4 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-bold text-base tracking-wider text-slate-950 dark:text-slate-100 uppercase">2026 Pool</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-slate-700 bg-slate-200 dark:text-slate-300 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-800 font-medium">
          {session.user.name}
        </span>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
