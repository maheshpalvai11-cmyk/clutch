import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth-check';
import { AdminNav } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  if (session.profile.role !== 'admin') {
    redirect('/friend');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AdminNav adminName={session.profile.full_name} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
