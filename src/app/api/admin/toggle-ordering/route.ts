import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { ordering_open, announcement, event_name } = body;

    if (typeof ordering_open !== 'boolean') {
      return NextResponse.json({ error: 'ordering_open boolean is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const updatePayload: Record<string, unknown> = {
        ordering_open,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id,
      };

      if (announcement !== undefined) updatePayload.announcement = announcement;
      if (event_name !== undefined) updatePayload.event_name = event_name;

      const { data, error } = await adminClient
        .from('event_settings')
        .upsert({ id: 1, ...updatePayload }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, settings: data });
    }

    // Local Store Fallback
    const store = getLocalStore();
    store.settings.ordering_open = ordering_open;
    if (announcement !== undefined) store.settings.announcement = announcement;
    if (event_name !== undefined) store.settings.event_name = event_name;
    saveLocalStore(store);

    return NextResponse.json({ success: true, settings: store.settings });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
