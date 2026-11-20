import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const adminClient = createAdminClient();
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');

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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
