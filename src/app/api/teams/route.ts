import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      let query = adminClient
        .from('teams')
        .select('*, campus:campuses(*)')
        .order('name', { ascending: true });

      if (campusId) {
        query = query.eq('campus_id', campusId);
      }

      const { data: teams, error } = await query;
      if (error) throw error;
      return NextResponse.json({ teams });
    }

    // Local Store Fallback
    const store = getLocalStore();
    let teams = store.teams.map((t) => ({
      ...t,
      campus: store.campuses.find((c) => c.id === t.campus_id),
    }));

    if (campusId) {
      teams = teams.filter((t) => t.campus_id === campusId);
    }

    return NextResponse.json({ teams });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
