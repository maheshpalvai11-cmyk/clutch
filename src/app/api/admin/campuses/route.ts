import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';

export async function GET() {
  try {
    await requireAdmin();

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('campuses')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ campuses: data });
    }

    const store = getLocalStore();
    return NextResponse.json({ campuses: store.campuses });
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

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();

      if (id) {
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
    }

    // Local Store Fallback
    const store = getLocalStore();

    if (id) {
      const campus = store.campuses.find((c) => c.id === id);
      if (!campus) return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
      if (name !== undefined) campus.name = name.trim();
      if (is_active !== undefined) campus.is_active = is_active;
      saveLocalStore(store);
      return NextResponse.json({ success: true, campus });
    } else {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Campus name is required' }, { status: 400 });
      }
      const newCampus = {
        id: `c-${Date.now()}`,
        name: name.trim(),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      store.campuses.push(newCampus);
      saveLocalStore(store);
      return NextResponse.json({ success: true, campus: newCampus });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
