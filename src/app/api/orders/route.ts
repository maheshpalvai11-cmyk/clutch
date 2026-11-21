import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore, LocalOrder, LocalOrderItem } from '@/lib/local-store';

interface OrderItemPayload {
  variantId: string;
  quantity: number;
}

interface CreateOrderBody {
  orderId?: string;
  teamId?: string;
  teamName?: string;
  campusId?: string;
  collectorName?: string;
  collectorPhone?: string;
  notes?: string;
  items: OrderItemPayload[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      let query = adminClient
        .from('orders')
        .select(`
          *,
          team:teams(*, campus:campuses(*)),
          friend:profiles(id, full_name, email),
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

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
    }

    // Local Store Fallback
    const store = getLocalStore();
    let orders = [...store.orders];

    if (session.profile.role !== 'admin') {
      orders = orders.filter((o) => o.friend_id === session.user.id);
    }

    if (campusId) {
      orders = orders.filter((o) => o.team?.campus_id === campusId);
    }

    if (status) {
      orders = orders.filter((o) => o.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          o.team?.name.toLowerCase().includes(q) ||
          o.team?.collector_name.toLowerCase().includes(q) ||
          o.team?.collector_phone.includes(q)
      );
    }

    // Hide purchase cost from friends
    if (session.profile.role !== 'admin') {
      orders = orders.map((order) => ({
        ...order,
        total_cost: 0,
        items: order.items?.map((it) => ({
          ...it,
          unit_purchase_cost: 0,
          subtotal_cost: 0,
        })),
      }));
    }

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const body: CreateOrderBody = await req.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one food item must be selected.' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();

      // Check if ordering is open
      const { data: settings } = await adminClient
        .from('event_settings')
        .select('ordering_open')
        .eq('id', 1)
        .single();

      if (session.profile.role !== 'admin' && !settings?.ordering_open) {
        return NextResponse.json(
          { error: 'Ordering is currently closed by the administrator.' },
          { status: 403 }
        );
      }

      let teamId = body.teamId;

      if (!teamId) {
        if (!body.teamName || !body.campusId || !body.collectorName || !body.collectorPhone) {
          return NextResponse.json(
            { error: 'Team name, campus, collector name, and collector phone are required.' },
            { status: 400 }
          );
        }

        const { data: existingTeam } = await adminClient
          .from('teams')
          .select('id')
          .eq('campus_id', body.campusId)
          .ilike('name', body.teamName.trim())
          .maybeSingle();

        if (existingTeam) {
          teamId = existingTeam.id;
        } else {
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

      const itemsToInsert = validatedItems.map((vi) => ({
        ...vi,
        order_id: order.id,
      }));

      await adminClient.from('order_items').insert(itemsToInsert);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        totalAmount: totalSellingPrice,
      });
    }

    // Local Store Fallback
    const store = getLocalStore();

    if (session.profile.role !== 'admin' && !store.settings.ordering_open) {
      return NextResponse.json(
        { error: 'Ordering is currently closed by the administrator.' },
        { status: 403 }
      );
    }

    let team = store.teams.find((t) => t.id === body.teamId);

    if (!team) {
      if (!body.teamName || !body.campusId || !body.collectorName || !body.collectorPhone) {
        return NextResponse.json(
          { error: 'Team name, campus, collector name, and collector phone are required.' },
          { status: 400 }
        );
      }

      team = store.teams.find(
        (t) =>
          t.campus_id === body.campusId &&
          t.name.toLowerCase() === body.teamName!.trim().toLowerCase()
      );

      if (!team) {
        const campus = store.campuses.find((c) => c.id === body.campusId);
        team = {
          id: `team-${Date.now()}`,
          name: body.teamName.trim(),
          campus_id: body.campusId,
          collector_name: body.collectorName.trim(),
          collector_phone: body.collectorPhone.trim(),
          created_by: session.user.id,
          created_at: new Date().toISOString(),
          campus,
        };
        store.teams.push(team);
      }
    }

    // Collect variants from all food items
    const allVariants = store.food_items.flatMap((fi) =>
      fi.variants.map((v) => ({ ...v, foodName: fi.name }))
    );
    const variantMap = new Map(allVariants.map((v) => [v.id, v]));

    let totalSellingPrice = 0;
    let totalPurchaseCost = 0;
    const orderId = `order-${Date.now()}`;
    const orderItems: LocalOrderItem[] = [];

    for (const it of body.items) {
      const qty = Math.floor(it.quantity);
      if (qty <= 0) continue;
      const variant = variantMap.get(it.variantId);
      if (!variant) continue;

      const subPrice = qty * variant.selling_price;
      const subCost = qty * variant.purchase_cost;
      totalSellingPrice += subPrice;
      totalPurchaseCost += subCost;

      orderItems.push({
        id: `oi-${Date.now()}-${Math.random()}`,
        order_id: orderId,
        food_variant_id: variant.id,
        food_name_snapshot: variant.foodName,
        variant_name_snapshot: variant.name,
        quantity: qty,
        unit_selling_price: variant.selling_price,
        unit_purchase_cost: variant.purchase_cost,
        subtotal_price: subPrice,
        subtotal_cost: subCost,
      });
    }

    const newOrder: LocalOrder = {
      id: orderId,
      team_id: team.id,
      friend_id: session.user.id,
      status: 'Pending',
      notes: body.notes?.trim() || '',
      total_amount: totalSellingPrice,
      total_cost: totalPurchaseCost,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team,
      friend: {
        id: session.user.id,
        full_name: session.profile.full_name,
        email: session.user.email,
      },
      items: orderItems,
    };

    store.orders.unshift(newOrder);
    saveLocalStore(store);

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
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

    if (!body.orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data: existingOrder, error: fetchErr } = await adminClient
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', body.orderId)
        .single();

      if (fetchErr || !existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (session.profile.role !== 'admin') {
        if (existingOrder.friend_id !== session.user.id) {
          return NextResponse.json({ error: 'Unauthorized to edit this order' }, { status: 403 });
        }
      }

      const variantIds = body.items.map((i) => i.variantId).filter(Boolean);
      const { data: variants } = await adminClient
        .from('food_variants')
        .select('*, food_item:food_items(*)')
        .in('id', variantIds);

      const variantMap = new Map((variants || []).map((v) => [v.id, v]));

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

      await adminClient.from('order_items').delete().eq('order_id', existingOrder.id);
      await adminClient.from('order_items').insert(validatedItems);

      const { data: updatedOrder } = await adminClient
        .from('orders')
        .update({
          total_amount: totalSellingPrice,
          total_cost: totalPurchaseCost,
          notes: body.notes !== undefined ? body.notes.trim() : existingOrder.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrder.id)
        .select()
        .single();

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const orderIndex = store.orders.findIndex((o) => o.id === body.orderId);

    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = store.orders[orderIndex];
    if (session.profile.role !== 'admin' && order.friend_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to edit this order' }, { status: 403 });
    }

    const allVariants = store.food_items.flatMap((fi) =>
      fi.variants.map((v) => ({ ...v, foodName: fi.name }))
    );
    const variantMap = new Map(allVariants.map((v) => [v.id, v]));

    let totalSellingPrice = 0;
    let totalPurchaseCost = 0;
    const orderItems: LocalOrderItem[] = [];

    for (const it of body.items) {
      const qty = Math.floor(it.quantity);
      if (qty <= 0) continue;
      const variant = variantMap.get(it.variantId);
      if (!variant) continue;

      const subPrice = qty * variant.selling_price;
      const subCost = qty * variant.purchase_cost;
      totalSellingPrice += subPrice;
      totalPurchaseCost += subCost;

      orderItems.push({
        id: `oi-${Date.now()}-${Math.random()}`,
        order_id: order.id,
        food_variant_id: variant.id,
        food_name_snapshot: variant.foodName,
        variant_name_snapshot: variant.name,
        quantity: qty,
        unit_selling_price: variant.selling_price,
        unit_purchase_cost: variant.purchase_cost,
        subtotal_price: subPrice,
        subtotal_cost: subCost,
      });
    }

    order.items = orderItems;
    order.total_amount = totalSellingPrice;
    order.total_cost = totalPurchaseCost;
    if (body.notes !== undefined) order.notes = body.notes.trim();
    order.updated_at = new Date().toISOString();

    saveLocalStore(store);
    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');

    let orderIds: string[] = [];

    if (body?.orderIds && Array.isArray(body.orderIds)) {
      orderIds = body.orderIds.map((id: unknown) => String(id)).filter(Boolean);
    } else if (body?.orderId) {
      orderIds = [String(body.orderId)];
    } else if (queryId) {
      orderIds = [queryId];
    }

    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: 'No order ID(s) provided for deletion.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();

      // Find affected team IDs before deleting orders
      const { data: targetOrders } = await adminClient
        .from('orders')
        .select('id, team_id')
        .in('id', orderIds);

      const affectedTeamIds = Array.from(
        new Set((targetOrders || []).map((o) => o.team_id).filter(Boolean))
      );

      // Delete order items and status history first in case cascade is not enabled
      await adminClient.from('order_items').delete().in('order_id', orderIds);
      await adminClient.from('order_status_history').delete().in('order_id', orderIds);

      const { error } = await adminClient
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (error) throw error;

      // Check if affected teams have any remaining orders; if not, delete the team from registered teams!
      for (const tId of affectedTeamIds) {
        const { count } = await adminClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', tId);

        if (!count || count === 0) {
          await adminClient.from('teams').delete().eq('id', tId);
        }
      }

      return NextResponse.json({
        success: true,
        count: orderIds.length,
        deletedIds: orderIds,
      });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const prevCount = store.orders.length;

    // Find affected team IDs before deleting
    const targetOrders = store.orders.filter((o) => orderIds.includes(o.id));
    const affectedTeamIds = Array.from(
      new Set(targetOrders.map((o) => o.team_id).filter(Boolean))
    );

    // Remove orders
    store.orders = store.orders.filter((o) => !orderIds.includes(o.id));
    const deletedCount = prevCount - store.orders.length;

    // Clean up teams that have no remaining orders
    for (const tId of affectedTeamIds) {
      const hasOtherOrders = store.orders.some((o) => o.team_id === tId);
      if (!hasOtherOrders) {
        store.teams = store.teams.filter((t) => t.id !== tId);
      }
    }

    saveLocalStore(store);

    return NextResponse.json({
      success: true,
      count: deletedCount,
      deletedIds: orderIds,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
