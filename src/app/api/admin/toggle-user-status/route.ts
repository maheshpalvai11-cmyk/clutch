import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'userId and isActive are required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, profile: data });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const profile = store.profiles.find((p) => p.id === userId);
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    profile.is_active = isActive;
    profile.updated_at = new Date().toISOString();
    saveLocalStore(store);

    return NextResponse.json({ success: true, profile });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
