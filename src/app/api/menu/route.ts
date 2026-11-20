import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    const isAdmin = session?.profile?.role === 'admin';

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data: foodItems, error } = await adminClient
        .from('food_items')
        .select('*, variants:food_variants(*)')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      const sanitized = (foodItems || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        category: item.category,
        is_active: item.is_active,
        variants: (item.variants || [])
          .filter((v: { is_active: boolean }) => v.is_active)
          .map((v: { id: string; name: string; selling_price: number; purchase_cost?: number; is_active: boolean }) => ({
            id: v.id,
            name: v.name,
            selling_price: Number(v.selling_price),
            ...(isAdmin ? { purchase_cost: Number(v.purchase_cost) } : {}),
            is_active: v.is_active,
          })),
      }));

      return NextResponse.json({ foodItems: sanitized });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const sanitized = store.food_items
      .filter((fi) => fi.is_active)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        category: item.category,
        is_active: item.is_active,
        variants: item.variants
          .filter((v) => v.is_active)
          .map((v) => ({
            id: v.id,
            name: v.name,
            selling_price: v.selling_price,
            ...(isAdmin ? { purchase_cost: v.purchase_cost } : {}),
            is_active: v.is_active,
          })),
      }));

    return NextResponse.json({ foodItems: sanitized });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
