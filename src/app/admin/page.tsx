import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllMatches, getAllUsers, getSettingsMap } from '@/lib/dbQueries';
import AdminClient from '@/components/AdminClient';

export const revalidate = 0; // Disable static rendering for admin updates

export default async function AdminPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  const isAdmin = (session.user as any).isAdmin === true;
  if (!isAdmin) {
    redirect('/');
  }

  const currentUserId = parseInt((session.user as any).id, 10);

  // Fetch all matches sorted by kickoff time
  const dbMatches = await getAllMatches();
  dbMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  // Fetch all users
  const dbUsers = await getAllUsers();
  const dbUsersMapped = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    isAdmin: u.isAdmin,
  }));

  // Fetch settings
  const settings = await getSettingsMap();

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
          Admin Dashboard
        </h1>
        <p className="text-xs text-slate-600">
          Manage match results, qualified teams, and settings
        </p>
      </div>

      <AdminClient
        initialMatches={dbMatches}
        users={dbUsersMapped}
        currentUserId={currentUserId}
        settings={settings}
      />
    </div>
  );
}
