import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { ordering_open, announcement, event_name } = body;

    if (typeof ordering_open !== 'boolean') {
      return NextResponse.json({ error: 'ordering_open boolean is required' }, { status: 400 });
    }

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
