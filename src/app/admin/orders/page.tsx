'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle,
  Truck,
  Phone,
  User,
  MapPin,
  Clock,
  Layers,
  ArrowUpDown,
  CreditCard,
  PieChart,
  TrendingUp,
  FileSpreadsheet,
  PackageCheck,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { Order, Campus, OrderStatus, Team } from '@/types/database';
import { formatINR, formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';
import { useToast } from '@/components/ui/Toast';

type ViewTab = 'all_orders' | 'procurement' | 'pickup' | 'teams';

interface ProcurementItem {
  foodName: string;
  variantName: string;
  totalQuantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
}

export default function AdminOrdersPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<ViewTab>('all_orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Bulk Selection and Deletion
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchOrdersAndCampuses = useCallback(async () => {
    try {
      const [ordersRes, campusesRes, teamsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/admin/campuses'),
        fetch('/api/teams'),
      ]);

      if (!ordersRes.ok) throw new Error('Failed to load orders');
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);

      if (campusesRes.ok) {
        const campusesData = await campusesRes.json();
        setCampuses(campusesData.campuses || []);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeamsList(teamsData.teams || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching orders';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchOrdersAndCampuses();
  }, [fetchOrdersAndCampuses]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (
        tabParam === 'teams' ||
        tabParam === 'procurement' ||
        tabParam === 'pickup' ||
        tabParam === 'all_orders'
      ) {
        setActiveTab(tabParam as ViewTab);
      }
    }
  }, []);

  // Quick Status Updater for Team Pickup table
  const handleQuickStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch('/api/admin/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      success(`Order updated to "${newStatus}"`, 'Status Updated');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      error(msg);
    }
  };

  // Selection Toggles
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectCancelled = () => {
    const cancelledIds = orders
      .filter((o) => o.status === 'Cancelled')
      .map((o) => o.id);
    setSelectedOrderIds(cancelledIds);
  };

  // Delete Handlers
  const handleDeleteSelected = async () => {
    if (selectedOrderIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedOrderIds.length} selected order(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete orders');

      success(
        `Successfully deleted ${selectedOrderIds.length} order(s).`,
        'Orders Deleted'
      );
      setOrders((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
      setSelectedOrderIds([]);
      // Refresh teams to update registered team count automatically
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeamsList(tData.teams || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      error(msg, 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingleOrder = async (orderId: string, teamName?: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete the order for "${teamName || 'this team'}"?`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete order');

      success('Order permanently deleted', 'Order Deleted');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      // Refresh teams to update registered team count automatically
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeamsList(tData.teams || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      error(msg, 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAllCancelled = async () => {
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled');
    if (cancelledOrders.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ALL ${cancelledOrders.length} cancelled order(s)? This will clean up cancelled records permanently.`
      )
    ) {
      return;
    }

    const cancelledIds = cancelledOrders.map((o) => o.id);
    setDeleting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: cancelledIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete cancelled orders');

      success(
        `Deleted all ${cancelledOrders.length} cancelled order(s).`,
        'Cleaned Up'
      );
      setOrders((prev) => prev.filter((o) => o.status !== 'Cancelled'));
      setSelectedOrderIds((prev) => prev.filter((id) => !cancelledIds.includes(id)));
      // Refresh teams to update registered team count automatically
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeamsList(tData.teams || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      error(msg, 'Error');
    } finally {
      setDeleting(false);
    }
  };

  // Team Delete Handler
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete team "${teamName}" and all its orders? This will remove the team from registered teams.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete team');

      success(
        `Team "${teamName}" and all associated orders were deleted.`,
        'Team Removed'
      );
      await fetchOrdersAndCampuses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Team deletion failed';
      error(msg, 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const cancelledOrdersCount = orders.filter((o) => o.status === 'Cancelled').length;

  // Filtered Teams for Registered Teams tab
  const filteredTeams = teamsList.filter((team) => {
    const matchesSearch =
      !searchQuery.trim() ||
      team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.collector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.collector_phone?.includes(searchQuery);

    const matchesCampus =
      !selectedCampus || team.campus_id === selectedCampus;

    return matchesSearch && matchesCampus;
  });

  // Filtered Orders for All Orders tab
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery.trim() ||
      order.team?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.team?.collector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.team?.collector_phone?.includes(searchQuery);

    const matchesCampus =
      !selectedCampus || order.team?.campus_id === selectedCampus;

    const matchesStatus =
      !selectedStatus || order.status === selectedStatus;

    return matchesSearch && matchesCampus && matchesStatus;
  });

  // Calculate Procurement Aggregations (from non-cancelled orders)
  const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
  const procurementMap = new Map<string, ProcurementItem>();

  let totalProcurementCost = 0;
  let totalProcurementRevenue = 0;
  let totalProcurementQty = 0;

  for (const order of nonCancelledOrders) {
    if (!order.items) continue;
    for (const item of order.items) {
      const key = `${item.food_name_snapshot}___${item.variant_name_snapshot}`;
      const qty = Number(item.quantity) || 0;
      const unitCost = Number(item.unit_purchase_cost) || 0;
      const unitPrice = Number(item.unit_selling_price) || 0;

      const cost = qty * unitCost;
      const revenue = qty * unitPrice;

      totalProcurementCost += cost;
      totalProcurementRevenue += revenue;
      totalProcurementQty += qty;

      if (!procurementMap.has(key)) {
        procurementMap.set(key, {
          foodName: item.food_name_snapshot,
          variantName: item.variant_name_snapshot,
          totalQuantity: 0,
          unitCost,
          unitPrice,
          totalCost: 0,
          totalRevenue: 0,
          profit: 0,
        });
      }

      const existing = procurementMap.get(key)!;
      existing.totalQuantity += qty;
      existing.totalCost += cost;
      existing.totalRevenue += revenue;
      existing.profit = existing.totalRevenue - existing.totalCost;
    }
  }

  const procurementItems = Array.from(procurementMap.values()).sort((a, b) =>
    a.foodName.localeCompare(b.foodName)
  );
  const totalProcurementProfit = totalProcurementRevenue - totalProcurementCost;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-brand-600" />
            Order Management &amp; Fulfillment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track student team orders, calculate procurement supplies, and handle campus pickups
          </p>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap items-center p-1 bg-slate-200/70 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('all_orders')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all_orders'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>All Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('procurement')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'procurement'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
            <span>Procurement Summary</span>
          </button>
          <button
            onClick={() => setActiveTab('pickup')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pickup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Team Pickup List</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Registered Teams ({teamsList.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ALL ORDERS VIEW */}
      {activeTab === 'all_orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search team or collector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Delivered / Picked up">Delivered / Picked up</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {cancelledOrdersCount > 0 && (
                <button
                  onClick={handleDeleteAllCancelled}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Delete all cancelled orders permanently"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Cancelled ({cancelledOrdersCount})</span>
                </button>
              )}

              <button
                onClick={fetchOrdersAndCampuses}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh orders list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedOrderIds.length > 0 && (
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in shadow-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-black text-rose-900 bg-rose-200/90 px-2.5 py-1 rounded-lg">
                  {selectedOrderIds.length} Selected
                </span>
                <span className="text-xs text-rose-800">
                  of {filteredOrders.length} orders
                </span>
                {cancelledOrdersCount > 0 && selectedOrderIds.length !== cancelledOrdersCount && (
                  <button
                    onClick={handleSelectCancelled}
                    className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer ml-1"
                  >
                    Select all {cancelledOrdersCount} cancelled
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {deleting
                      ? 'Deleting...'
                      : `Delete Selected (${selectedOrderIds.length})`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No orders match criteria</p>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust filters or check back once friends submit orders.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredOrders.length > 0 &&
                            selectedOrderIds.length === filteredOrders.length
                          }
                          onChange={toggleSelectAll}
                          title="Select all orders"
                          className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Collector</th>
                      <th className="py-3 px-4">Friend</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4 text-right">Selling Total</th>
                      <th className="py-3 px-4 text-right">Cost Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Time</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => {
                      const itemCount =
                        order.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            selectedOrderIds.includes(order.id)
                              ? 'bg-rose-50/40'
                              : ''
                          }`}
                        >
                          <td
                            className="py-3 px-3 text-center w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.includes(order.id)}
                              onChange={() => toggleSelectOrder(order.id)}
                              className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {order.team?.name || 'Team'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {order.team?.campus?.name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {order.team?.collector_name}
                            <span className="block text-[10px] text-slate-400">
                              {order.team?.collector_phone}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {order.friend?.full_name || 'Friend'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {itemCount}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatINR(Number(order.total_amount))}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-500">
                            {formatINR(Number(order.total_cost || 0))}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400">
                            {formatDateTime(order.created_at)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                              >
                                Manage
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSingleOrder(order.id, order.team?.name);
                                }}
                                title="Delete this order"
                                className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROCUREMENT SUMMARY VIEW */}
      {activeTab === 'procurement' && (
        <div className="space-y-5">
          {/* Procurement Financial Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Supply Qty
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {totalProcurementQty}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Across {nonCancelledOrders.length} valid orders
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Purchase Cost
              </span>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {formatINR(totalProcurementCost)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Kitchen / vendor procurement</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Expected Revenue
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatINR(totalProcurementRevenue)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Student team collections</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-md shadow-emerald-500/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Expected Profit
              </span>
              <p className="text-2xl font-black mt-1">
                {formatINR(totalProcurementProfit)}
              </p>
              <p className="text-[10px] text-emerald-100 mt-0.5">Revenue &minus; Cost</p>
            </div>
          </div>

          {/* Aggregated Procurement Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Kitchen Procurement Sheet
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aggregated quantities to order from caterers (excludes Cancelled orders)
                </p>
              </div>
              <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
                {procurementItems.length} Unique Varieties
              </span>
            </div>

            {procurementItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  No active orders to procure
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Food Item</th>
                      <th className="py-3 px-4">Variation</th>
                      <th className="py-3 px-4 text-center bg-amber-50/70 text-amber-900 font-bold">
                        Total Quantity Needed
                      </th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                      <th className="py-3 px-4 text-right font-bold text-emerald-700">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {procurementItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.foodName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700">
                            {item.variantName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-sm bg-amber-50/70 text-amber-900">
                          {item.totalQuantity}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatINR(item.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">
                          {formatINR(item.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatINR(item.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {formatINR(item.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          +{formatINR(item.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM PICKUP LIST VIEW */}
      {activeTab === 'pickup' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Campus Team Pickup Desk
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Food distribution list for team coordinators arriving at the counter
              </p>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              Distribution: Team Pickup Only
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {nonCancelledOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No pickups scheduled</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Collector Details</th>
                      <th className="py-3 px-4">Ordered Food Items &amp; Quantities</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nonCancelledOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/70 transition-colors align-top"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {order.team?.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-600" />
                            {order.team?.campus?.name || 'Main Campus'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">
                            {order.team?.collector_name}
                          </p>
                          <a
                            href={`tel:${order.team?.collector_phone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            {order.team?.collector_phone}
                          </a>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {order.items?.map((it) => (
                              <div
                                key={it.id}
                                className="inline-block mr-2 mb-1 px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-800"
                              >
                                {it.food_name_snapshot} ({it.variant_name_snapshot}):{' '}
                                <strong className="text-brand-600">{it.quantity}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {order.status !== 'Ready' &&
                              order.status !== 'Delivered / Picked up' && (
                                <button
                                  onClick={() =>
                                    handleQuickStatusChange(order.id, 'Ready')
                                  }
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                >
                                  Mark Ready
                                </button>
                              )}
                            {order.status !== 'Delivered / Picked up' && (
                              <button
                                onClick={() =>
                                  handleQuickStatusChange(
                                    order.id,
                                    'Delivered / Picked up'
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              >
                                Mark Picked Up
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REGISTERED TEAMS VIEW */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search team or collector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                Registered Teams: <span className="text-brand-600 font-black">{teamsList.length}</span>
              </span>
              <button
                onClick={fetchOrdersAndCampuses}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh teams list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Team Count Synchronization:</strong> When an admin deletes a team or all orders of a team, it automatically removes the team and reduces the registered teams count everywhere.
              </span>
            </div>
          </div>

          {/* Teams Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {filteredTeams.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No registered teams found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {teamsList.length === 0
                    ? 'No student teams have registered yet.'
                    : 'No teams match your search or campus filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Collector Details</th>
                      <th className="py-3 px-4">Associated Orders</th>
                      <th className="py-3 px-4 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeams.map((team, idx) => {
                      const teamOrders = orders.filter((o) => o.team_id === team.id);
                      return (
                        <tr
                          key={team.id}
                          className="hover:bg-slate-50/70 transition-colors align-top"
                        >
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 text-sm">
                              {team.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {team.id.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <MapPin className="w-3 h-3 text-brand-600" />
                              {team.campus?.name || 'Main Campus'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">
                              {team.collector_name}
                            </p>
                            <a
                              href={`tel:${team.collector_phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              {team.collector_phone}
                            </a>
                          </td>
                          <td className="py-3.5 px-4">
                            {teamOrders.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">
                                No active orders
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {teamOrders.map((ord) => (
                                  <button
                                    key={ord.id}
                                    onClick={() => setSelectedOrder(ord)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors cursor-pointer"
                                    title="Click to view order details"
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        ord.status === 'Cancelled'
                                          ? 'bg-rose-500'
                                          : ord.status === 'Delivered / Picked up'
                                          ? 'bg-emerald-500'
                                          : 'bg-amber-500'
                                      }`}
                                    />
                                    <span className="font-semibold">{ord.status}</span>
                                    <span className="text-slate-400">&bull;</span>
                                    <span className="font-bold text-slate-900">{formatINR(Number(ord.total_amount))}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteTeam(team.id, team.name)}
                              disabled={deleting}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                              title={`Delete team "${team.name}" and remove from registered teams`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={() => {
            fetchOrdersAndCampuses();
          }}
          onOrderDeleted={(deletedId) => {
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
            setSelectedOrderIds((prev) => prev.filter((id) => id !== deletedId));
            fetchOrdersAndCampuses();
          }}
        />
      )}
    </div>
  );
}
