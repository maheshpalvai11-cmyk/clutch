import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    // 1. Fetch friend profiles
    const { data: friends, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('role', 'friend')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Fetch order counts for each friend
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
