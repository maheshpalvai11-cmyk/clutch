import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('campuses')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ campuses: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, name, is_active } = body;

    const adminClient = createAdminClient();

    if (id) {
      // Update existing campus
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await adminClient
        .from('campuses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, campus: data });
    } else {
      // Create new campus
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Campus name is required' }, { status: 400 });
      }

      const { data, error } = await adminClient
        .from('campuses')
        .insert({ name: name.trim(), is_active: true })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, campus: data });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
