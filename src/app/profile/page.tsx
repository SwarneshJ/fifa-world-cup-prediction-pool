import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileClient from '@/components/ProfileClient';

export default async function ProfilePage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
          My Account
        </h1>
        <p className="text-xs text-slate-600">
          Manage your account settings & password
        </p>
      </div>

      <ProfileClient />
    </div>
  );
}
