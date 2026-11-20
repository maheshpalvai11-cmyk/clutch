import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    const adminClient = createAdminClient();

    const { data: foodItems, error } = await adminClient
      .from('food_items')
      .select('*, variants:food_variants(*)')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const isAdmin = session?.profile?.role === 'admin';

    // Format and sanitize output (hide purchase costs from friends)
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
