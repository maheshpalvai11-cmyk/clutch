import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

interface OrderItemPayload {
  variantId: string;
  quantity: number;
}

interface CreateOrderBody {
  orderId?: string; // If updating
  teamId?: string; // If selecting existing team
  teamName?: string; // If registering new team
  campusId?: string;
  collectorName?: string;
  collectorPhone?: string;
  notes?: string;
  items: OrderItemPayload[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const adminClient = createAdminClient();
    const { searchParams } = new URL(req.url);

    const campusId = searchParams.get('campusId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = adminClient
      .from('orders')
      .select(`
        *,
        team:teams(*, campus:campuses(*)),
        friend:profiles(id, full_name, email),
        items:order_items(*)
      `)
      .order('created_at', { ascending: false });

    // Friends can only fetch their own orders
    if (session.profile.role !== 'admin') {
      query = query.eq('friend_id', session.user.id);
    }

    if (campusId) {
      query = query.eq('team.campus_id', campusId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    // Filter by team name or collector if search query present
    let filtered = orders || [];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.team?.name?.toLowerCase().includes(q) ||
          o.team?.collector_name?.toLowerCase().includes(q) ||
          o.team?.collector_phone?.includes(q)
      );
    }

    // If caller is a friend, strip financial purchase costs for privacy
    if (session.profile.role !== 'admin') {
      filtered = filtered.map((order) => ({
        ...order,
        total_cost: undefined,
        items: order.items?.map((item: Record<string, unknown>) => ({
          ...item,
          unit_purchase_cost: undefined,
          subtotal_cost: undefined,
        })),
      }));
    }

    return NextResponse.json({ orders: filtered });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const body: CreateOrderBody = await req.json();
    const adminClient = createAdminClient();

    // 1. Check if ordering is open
    const { data: settings } = await adminClient
      .from('event_settings')
      .select('ordering_open')
      .eq('id', 1)
      .single();

    const isOrderingOpen = settings?.ordering_open ?? true;

    // Friends cannot order when ordering is closed
    if (session.profile.role !== 'admin' && !isOrderingOpen) {
      return NextResponse.json(
        { error: 'Ordering is currently closed by the administrator.' },
        { status: 403 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one food item must be selected.' }, { status: 400 });
    }

    // 2. Resolve Team (Find or Create)
    let teamId = body.teamId;

    if (!teamId) {
      if (!body.teamName || !body.campusId || !body.collectorName || !body.collectorPhone) {
        return NextResponse.json(
          { error: 'Team name, campus, collector name, and collector phone are required.' },
          { status: 400 }
        );
      }

      // Check if team already exists for this campus (unique constraint: campus_id + team name)
      const { data: existingTeam } = await adminClient
        .from('teams')
        .select('id')
        .eq('campus_id', body.campusId)
        .ilike('name', body.teamName.trim())
        .maybeSingle();

      if (existingTeam) {
        teamId = existingTeam.id;
      } else {
        // Create new team
        const { data: newTeam, error: teamErr } = await adminClient
          .from('teams')
          .insert({
            name: body.teamName.trim(),
            campus_id: body.campusId,
            collector_name: body.collectorName.trim(),
            collector_phone: body.collectorPhone.trim(),
            created_by: session.user.id,
          })
          .select()
          .single();

        if (teamErr) throw teamErr;
        teamId = newTeam.id;
      }
    }

    // 3. Fetch all requested variants from DB to safely recalculate prices on the server
    const variantIds = body.items.map((i) => i.variantId).filter(Boolean);
    const { data: variants, error: varErr } = await adminClient
      .from('food_variants')
      .select('*, food_item:food_items(*)')
      .in('id', variantIds);

    if (varErr || !variants) {
      return NextResponse.json({ error: 'Failed to verify food items.' }, { status: 400 });
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // 4. Calculate server-side totals & snapshots
    let totalSellingPrice = 0;
    let totalPurchaseCost = 0;

    const validatedItems = [];

    for (const item of body.items) {
      const quantity = Math.floor(item.quantity);
      if (quantity <= 0) continue;

      const variant = variantMap.get(item.variantId);
      if (!variant) {
        return NextResponse.json(
          { error: `Variant ID ${item.variantId} was not found.` },
          { status: 400 }
        );
      }

      const unitSelling = Number(variant.selling_price);
      const unitCost = Number(variant.purchase_cost);
      const itemSubtotalPrice = quantity * unitSelling;
      const itemSubtotalCost = quantity * unitCost;

      totalSellingPrice += itemSubtotalPrice;
      totalPurchaseCost += itemSubtotalCost;

      validatedItems.push({
        food_variant_id: variant.id,
        food_name_snapshot: variant.food_item?.name || 'Food Item',
        variant_name_snapshot: variant.name,
        quantity,
        unit_selling_price: unitSelling,
        unit_purchase_cost: unitCost,
        subtotal_price: itemSubtotalPrice,
        subtotal_cost: itemSubtotalCost,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one valid item with positive quantity.' },
        { status: 400 }
      );
    }

    // 5. Create Order Record
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .insert({
        team_id: teamId,
        friend_id: session.user.id,
        status: 'Pending',
        notes: body.notes?.trim() || '',
        total_amount: totalSellingPrice,
        total_cost: totalPurchaseCost,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 6. Insert Order Items
    const itemsToInsert = validatedItems.map((vi) => ({
      ...vi,
      order_id: order.id,
    }));

    const { error: itemsErr } = await adminClient.from('order_items').insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    // 7. Record initial status history
    await adminClient.from('order_status_history').insert({
      order_id: order.id,
      old_status: null,
      new_status: 'Pending',
      changed_by: session.user.id,
      notes: 'Initial order created',
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      totalAmount: totalSellingPrice,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireUser();
    const body: CreateOrderBody = await req.json();
    const adminClient = createAdminClient();

    if (!body.orderId) {
      return NextResponse.json({ error: 'orderId is required for editing' }, { status: 400 });
    }

    // Check order existence and permissions
    const { data: existingOrder, error: fetchErr } = await adminClient
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', body.orderId)
      .single();

    if (fetchErr || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If friend is editing:
    if (session.profile.role !== 'admin') {
      if (existingOrder.friend_id !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized to edit this order' }, { status: 403 });
      }

      // Check if ordering is open
      const { data: settings } = await adminClient
        .from('event_settings')
        .select('ordering_open')
        .eq('id', 1)
        .single();

      if (!settings?.ordering_open) {
        return NextResponse.json(
          { error: 'Ordering is closed. Orders can no longer be edited.' },
          { status: 403 }
        );
      }

      if (existingOrder.status !== 'Pending') {
        return NextResponse.json(
          { error: `Cannot edit order once it has transitioned to ${existingOrder.status}.` },
          { status: 400 }
        );
      }
    }

    // Recalculate prices from DB
    const variantIds = body.items.map((i) => i.variantId).filter(Boolean);
    const { data: variants, error: varErr } = await adminClient
      .from('food_variants')
      .select('*, food_item:food_items(*)')
      .in('id', variantIds);

    if (varErr || !variants) {
      return NextResponse.json({ error: 'Failed to verify food items.' }, { status: 400 });
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    let totalSellingPrice = 0;
    let totalPurchaseCost = 0;
    const validatedItems = [];

    for (const item of body.items) {
      const quantity = Math.floor(item.quantity);
      if (quantity <= 0) continue;

      const variant = variantMap.get(item.variantId);
      if (!variant) continue;

      const unitSelling = Number(variant.selling_price);
      const unitCost = Number(variant.purchase_cost);
      const itemSubtotalPrice = quantity * unitSelling;
      const itemSubtotalCost = quantity * unitCost;

      totalSellingPrice += itemSubtotalPrice;
      totalPurchaseCost += itemSubtotalCost;

      validatedItems.push({
        order_id: existingOrder.id,
        food_variant_id: variant.id,
        food_name_snapshot: variant.food_item?.name || 'Food Item',
        variant_name_snapshot: variant.name,
        quantity,
        unit_selling_price: unitSelling,
        unit_purchase_cost: unitCost,
        subtotal_price: itemSubtotalPrice,
        subtotal_cost: itemSubtotalCost,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item with quantity > 0' },
        { status: 400 }
      );
    }

    // Delete old items and insert updated items
    await adminClient.from('order_items').delete().eq('order_id', existingOrder.id);
    await adminClient.from('order_items').insert(validatedItems);

    // Update order totals & notes
    const updatePayload: Record<string, unknown> = {
      total_amount: totalSellingPrice,
      total_cost: totalPurchaseCost,
      updated_at: new Date().toISOString(),
    };

    if (body.notes !== undefined) {
      updatePayload.notes = body.notes.trim();
    }

    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update(updatePayload)
      .eq('id', existingOrder.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Log update in history
    await adminClient.from('order_status_history').insert({
      order_id: existingOrder.id,
      old_status: existingOrder.status,
      new_status: existingOrder.status,
      changed_by: session.user.id,
      notes: `Order items updated by ${session.profile.full_name}`,
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
