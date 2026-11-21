'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  ShoppingBag,
  Utensils,
  TrendingUp,
  CreditCard,
  PieChart,
  Clock,
  ArrowRight,
  Power,
  RefreshCw,
} from 'lucide-react';
import { formatINR, formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import { Order } from '@/types/database';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface DashboardStats {
  totalTeams: number;
  totalOrders: number;
  totalFoodQuantities: number;
  expectedRevenue: number;
  expectedPurchaseCost: number;
  expectedProfit: number;
  statusCounts: Record<string, number>;
  recentOrders: Order[];
  settings: {
    ordering_open: boolean;
    event_name?: string;
    announcement?: string;
  };
}

export default function AdminDashboardPage() {
  const { success, error } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingOrdering, setTogglingOrdering] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const data = await res.json();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading stats';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggleOrdering = async () => {
    if (!stats) return;
    const nextState = !stats.settings.ordering_open;
    setTogglingOrdering(true);

    try {
      const res = await fetch('/api/admin/toggle-ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordering_open: nextState }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ordering status');

      setStats((prev) =>
        prev
          ? {
              ...prev,
              settings: {
                ...prev.settings,
                ordering_open: nextState,
              },
            }
          : null
      );

      success(
        nextState
          ? 'Ordering is now OPEN for all friends.'
          : 'Ordering is now CLOSED. Friends cannot place or edit orders.',
        'Ordering Status'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle ordering';
      error(msg);
    } finally {
      setTogglingOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading CampusBite metrics...</p>
      </div>
    );
  }

  const isOrderingOpen = stats?.settings?.ordering_open ?? true;

  return (
    <div className="space-y-6">
      {/* Top Banner: Ordering Control */}
      <div
        className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm ${
          isOrderingOpen
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border-emerald-200'
            : 'bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50/50 border-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isOrderingOpen
                ? 'bg-emerald-600 shadow-emerald-600/20'
                : 'bg-rose-600 shadow-rose-600/20'
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Order Collection is{' '}
                <span className={isOrderingOpen ? 'text-emerald-700' : 'text-rose-700'}>
                  {isOrderingOpen ? 'ACTIVE & OPEN' : 'CLOSED'}
                </span>
              </h2>
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  isOrderingOpen ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isOrderingOpen
                ? 'Friends can register student teams and collect orders across campuses.'
                : 'Friends cannot submit new orders or edit existing ones. Orders are finalized for procurement.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            title="Refresh statistics"
            className="p-2.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleOrdering}
            disabled={togglingOrdering}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
              isOrderingOpen
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>
              {togglingOrdering
                ? 'Updating...'
                : isOrderingOpen
                ? 'Close Ordering'
                : 'Open Ordering'}
            </span>
          </button>
        </div>
      </div>

      {/* 6 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Teams */}
        <Link
          href="/admin/orders?tab=teams"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand-400 hover:shadow-md transition-all group cursor-pointer block"
          title="Click to view and manage registered teams"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-brand-600 transition-colors">
              Teams
            </span>
            <Users className="w-4 h-4 text-brand-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">{stats?.totalTeams || 0}</p>
            <span className="text-[10px] font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform flex items-center">
              Manage &rarr;
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Registered teams &bull; click</p>
        </Link>

        {/* Total Orders */}
        <Link
          href="/admin/orders"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer block"
          title="Click to view and manage all orders"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
              Orders
            </span>
            <ShoppingBag className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">{stats?.totalOrders || 0}</p>
            <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center">
              View &rarr;
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Submitted orders &bull; click</p>
        </Link>

        {/* Total Food Quantities */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Food Qty
            </span>
            <Utensils className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.totalFoodQuantities || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Total items ordered</p>
        </div>

        {/* Expected Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Revenue
            </span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatINR(stats?.expectedRevenue || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Selling value</p>
        </div>

        {/* Expected Purchase Cost */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cost
            </span>
            <PieChart className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-700">
            {formatINR(stats?.expectedPurchaseCost || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Procurement cost</p>
        </div>

        {/* Expected Profit */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-md shadow-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              Gross Profit
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black">{formatINR(stats?.expectedProfit || 0)}</p>
          <p className="text-[10px] text-emerald-100 mt-1">Revenue &minus; Cost</p>
        </div>
      </div>

      {/* Status Breakdown Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Order Pipeline Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Object.entries(stats?.statusCounts || {}).map(([st, count]) => (
            <div
              key={st}
              className={`p-3 rounded-xl border text-center transition-all ${getStatusBadgeClass(
                st
              )}`}
            >
              <p className="text-lg font-black">{count}</p>
              <p className="text-[11px] font-semibold mt-0.5">{st}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Food Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live orders being collected by friends across campuses
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 group"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Collector / Friend</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Time</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map((order) => {
                  const itemsCount =
                    order.items?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {order.team?.name || 'Team'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {order.team?.campus?.name || 'Main Campus'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {order.team?.collector_name || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          via {order.friend?.full_name || 'Friend'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {itemsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatINR(Number(order.total_amount))}
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
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(order.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-brand-600 hover:bg-brand-50 border border-brand-200 transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No orders placed yet</p>
            <p className="text-xs text-slate-400 mt-1">
              When friends collect orders from student teams, they will appear here in real-time.
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={() => {
            fetchStats();
          }}
        />
      )}
    </div>
  );
}
