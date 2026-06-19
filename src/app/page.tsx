import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllMatches, getAllPredictions, getAllUsers, getSettingsMap } from '@/lib/dbQueries';
import TodayClient from '@/components/TodayClient';

export const revalidate = 0; // Disable static rendering for live predictions

export default async function HomePage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  const currentUserId = parseInt((session.user as any).id, 10);

  // Fetch all matches sorted by kickoff time
  const dbMatches = await getAllMatches();
  dbMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  // Fetch all predictions
  const dbPredictions = await getAllPredictions();

  // Fetch all users
  const dbUsers = await getAllUsers();

  // Fetch settings
  const settings = await getSettingsMap();

  const serverTime = new Date().toISOString();

  return (
    <TodayClient
      initialMatches={dbMatches}
      predictions={dbPredictions}
      users={dbUsers}
      currentUserId={currentUserId}
      settings={settings}
      serverTime={serverTime}
    />
  );
}
