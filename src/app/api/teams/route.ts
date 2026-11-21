import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();

      // Only query teams that have placed food orders
      const { data: orderTeams } = await adminClient
        .from('orders')
        .select('team_id');

      const orderedTeamIds = Array.from(
        new Set((orderTeams || []).map((o) => o.team_id).filter(Boolean))
      );

      if (orderedTeamIds.length === 0) {
        return NextResponse.json({ teams: [] });
      }

      let query = adminClient
        .from('teams')
        .select('*, campus:campuses(*), orders:orders(id, status, total_amount, created_at)')
        .in('id', orderedTeamIds)
        .order('name', { ascending: true });

      if (campusId) {
        query = query.eq('campus_id', campusId);
      }

      const { data: teams, error } = await query;
      if (error) throw error;
      return NextResponse.json({ teams: teams || [] });
    }

    // Local Store Fallback - show only teams that have ordered food
    const store = getLocalStore();
    const teamIdsWithOrders = new Set(store.orders.map((o) => o.team_id).filter(Boolean));

    // Remove any orphaned teams from local store
    store.teams = store.teams.filter((t) => teamIdsWithOrders.has(t.id));
    saveLocalStore(store);

    let teams = store.teams
      .filter((t) => teamIdsWithOrders.has(t.id))
      .map((t) => ({
        ...t,
        campus: store.campuses.find((c) => c.id === t.campus_id),
        orders: store.orders.filter((o) => o.team_id === t.id).map((o) => ({
          id: o.id,
          status: o.status,
          total_amount: o.total_amount,
          created_at: o.created_at,
        })),
      }));

    if (campusId) {
      teams = teams.filter((t) => t.campus_id === campusId);
    }

    return NextResponse.json({ teams });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const body = await req.json().catch(() => null);
    const teamId = body?.teamId || queryId;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required for deletion.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();

      // Find all orders for this team
      const { data: teamOrders } = await adminClient
        .from('orders')
        .select('id')
        .eq('team_id', teamId);

      const orderIds = (teamOrders || []).map((o) => o.id);

      if (orderIds.length > 0) {
        await adminClient.from('order_items').delete().in('order_id', orderIds);
        await adminClient.from('order_status_history').delete().in('order_id', orderIds);
        await adminClient.from('orders').delete().in('id', orderIds);
      }

      const { error: teamErr } = await adminClient
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (teamErr) throw teamErr;
      return NextResponse.json({
        success: true,
        deletedTeamId: teamId,
        deletedOrdersCount: orderIds.length,
      });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const targetTeam = store.teams.find((t) => t.id === teamId);
    if (!targetTeam) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    const teamOrders = store.orders.filter((o) => o.team_id === teamId);
    store.orders = store.orders.filter((o) => o.team_id !== teamId);
    store.teams = store.teams.filter((t) => t.id !== teamId);
    saveLocalStore(store);

    return NextResponse.json({
      success: true,
      deletedTeamId: teamId,
      teamName: targetTeam.name,
      deletedOrdersCount: teamOrders.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
