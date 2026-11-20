import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data: friends, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('role', 'friend')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: orders } = await adminClient
        .from('orders')
        .select('id, friend_id, total_amount, status');

      const ordersMap: Record<string, { count: number; totalAmount: number }> = {};
      (orders || []).forEach((o) => {
        if (!ordersMap[o.friend_id]) {
          ordersMap[o.friend_id] = { count: 0, totalAmount: 0 };
        }
        ordersMap[o.friend_id].count += 1;
        if (o.status !== 'Cancelled') {
          ordersMap[o.friend_id].totalAmount += Number(o.total_amount) || 0;
        }
      });

      const enrichedFriends = (friends || []).map((f) => ({
        ...f,
        orderCount: ordersMap[f.id]?.count || 0,
        totalRevenue: ordersMap[f.id]?.totalAmount || 0,
      }));

      return NextResponse.json({ friends: enrichedFriends });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const friends = store.profiles.filter((p) => p.role === 'friend');
    const enriched = friends.map((f) => {
      const friendOrders = store.orders.filter((o) => o.friend_id === f.id);
      const totalRevenue = friendOrders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.total_amount, 0);

      return {
        ...f,
        orderCount: friendOrders.length,
        totalRevenue,
      };
    });

    return NextResponse.json({ friends: enriched });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
