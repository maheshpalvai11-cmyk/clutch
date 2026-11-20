import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    // 1. Total teams
    const { count: totalTeams } = await adminClient
      .from('teams')
      .select('*', { count: 'exact', head: true });

    // 2. Fetch all orders with items and team for calculations
    const { data: orders, error: ordersErr } = await adminClient
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        total_cost,
        created_at,
        team:teams(name, campus:campuses(name)),
        friend:profiles(full_name),
        items:order_items(quantity, food_name_snapshot, variant_name_snapshot, subtotal_price, subtotal_cost)
      `)
      .order('created_at', { ascending: false });

    if (ordersErr) throw ordersErr;

    const allOrders = orders || [];
    const nonCancelledOrders = allOrders.filter((o) => o.status !== 'Cancelled');

    const totalOrders = allOrders.length;

    let expectedRevenue = 0;
    let expectedPurchaseCost = 0;
    let totalFoodQuantities = 0;

    for (const order of nonCancelledOrders) {
      expectedRevenue += Number(order.total_amount) || 0;
      expectedPurchaseCost += Number(order.total_cost) || 0;

      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          totalFoodQuantities += Number(item.quantity) || 0;
        }
      }
    }

    const expectedProfit = expectedRevenue - expectedPurchaseCost;

    // Status breakdown
    const statusCounts: Record<string, number> = {
      Pending: 0,
      Confirmed: 0,
      Preparing: 0,
      Ready: 0,
      'Delivered / Picked up': 0,
      Cancelled: 0,
    };

    allOrders.forEach((o) => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status] += 1;
      }
    });

    // Event settings
    const { data: settings } = await adminClient
      .from('event_settings')
      .select('*')
      .eq('id', 1)
      .single();

    return NextResponse.json({
      totalTeams: totalTeams || 0,
      totalOrders,
      totalFoodQuantities,
      expectedRevenue,
      expectedPurchaseCost,
      expectedProfit,
      statusCounts,
      recentOrders: allOrders.slice(0, 8),
      settings: settings || { ordering_open: true },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
