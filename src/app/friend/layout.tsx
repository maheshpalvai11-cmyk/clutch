import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth-check';
import { FriendNav } from '@/components/friend/FriendNav';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore } from '@/lib/local-store';
import { Megaphone, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FriendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  let isOrderingOpen = true;
  let announcement = 'Welcome to CampusBite! Orders are currently being accepted.';

  if (isSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      const { data: settings } = await adminClient
        .from('event_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (settings) {
        isOrderingOpen = settings.ordering_open ?? true;
        announcement = settings.announcement;
      }
    } catch {
      // Fallback
    }
  } else {
    const store = getLocalStore();
    isOrderingOpen = store.settings.ordering_open;
    announcement = store.settings.announcement;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <FriendNav friendName={session.profile.full_name} />

      {/* Notice Banner */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
        {!isOrderingOpen ? (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong className="font-bold">Ordering is currently CLOSED by the admin.</strong>
              <span className="block sm:inline sm:ml-1 text-rose-700">
                You can review previously submitted orders below, but new order submissions and edits are paused.
              </span>
            </div>
          </div>
        ) : announcement ? (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shadow-sm">
            <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{announcement}</span>
          </div>
        ) : null}
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
