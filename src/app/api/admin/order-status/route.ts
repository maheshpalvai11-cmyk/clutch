import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';
import { OrderStatus } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data: updatedOrder, error } = await adminClient
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    order.status = newStatus as OrderStatus;
    order.updated_at = new Date().toISOString();
    saveLocalStore(store);

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
