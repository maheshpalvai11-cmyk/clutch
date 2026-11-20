import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data: campuses, error } = await adminClient
        .from('campuses')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ campuses });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const activeCampuses = store.campuses.filter((c) => c.is_active);
    return NextResponse.json({ campuses: activeCampuses });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
