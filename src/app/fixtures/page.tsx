import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllMatches, getAllPredictions, getAllUsers, getSettingsMap } from '@/lib/dbQueries';
import FixturesClient from '@/components/FixturesClient';

export const revalidate = 0; // Disable static cache for live predictions

export default async function FixturesPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  const currentUserId = parseInt((session.user as any).id, 10);

  // Fetch all matches sorted by kickoff time
  const dbMatches = await getAllMatches();
  dbMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  // Fetch predictions for this user
  const allPredictions = await getAllPredictions();
  const userPredictions = allPredictions.filter((p) => p.userId === currentUserId);

  // Fetch users
  const dbUsers = await getAllUsers();

  // Fetch settings
  const settings = await getSettingsMap();

  const serverTime = new Date().toISOString();

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
          Match Schedule
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Browse and predict matches in advance
        </p>
      </div>

      <FixturesClient
        initialMatches={dbMatches}
        predictions={userPredictions}
        users={dbUsers}
        currentUserId={currentUserId}
        settings={settings}
        serverTime={serverTime}
      />
    </div>
  );
}
