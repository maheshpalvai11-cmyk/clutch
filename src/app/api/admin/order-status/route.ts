import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrderStatus } from '@/types/database';

const VALID_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Delivered / Picked up',
  'Cancelled',
];

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { orderId, newStatus, notes } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(newStatus as OrderStatus)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Get current order status
    const { data: currentOrder, error: fetchErr } = await adminClient
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchErr || !currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const oldStatus = currentOrder.status;

    // 2. Update order status
    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Record in order_status_history
    await adminClient.from('order_status_history').insert({
      order_id: orderId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: session.user.id,
      notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
