'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  PlusCircle,
  Clock,
  Phone,
  User,
  MapPin,
  Edit,
  Lock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Order } from '@/types/database';
import { formatINR, formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function FriendMyOrdersPage() {
  const { error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);

  const fetchMyOrders = useCallback(async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/admin/stats'), // will return 403 for friend or we can check ordering from event_settings
      ]);

      if (!ordersRes.ok) throw new Error('Failed to load orders');
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setIsOrderingOpen(statsData.settings?.ordering_open ?? true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching orders';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  const totalAmountCollected = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const totalFoodItemsCount = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce(
      (sum, o) =>
        sum + (o.items?.reduce((iSum, it) => iSum + it.quantity, 0) || 0),
      0
    );

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-brand-600" />
            My Submitted Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Orders you collected from student teams across campuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMyOrders}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/friend/order"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Take New Order</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
            Orders Collected
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {orders.length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
            Food Items
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalFoodItemsCount}
          </p>
        </div>

        <div className="bg-gradient-to-br from-brand-600 to-amber-500 p-4 rounded-2xl text-white shadow-md shadow-brand-500/20">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100">
            Total Value
          </span>
          <p className="text-xl sm:text-2xl font-black mt-1">
            {formatINR(totalAmountCollected)}
          </p>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">You haven&apos;t taken any orders yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Visit a student team, register their campus &amp; name, and pick their food items.
          </p>
          <Link
            href="/friend/order"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Take Your First Order</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {orders.map((order) => {
            const canEdit = isOrderingOpen && order.status === 'Pending';
            return (
              <div
                key={order.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-brand-300 transition-all space-y-4"
              >
                {/* Header: Team & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        {order.team?.name || 'Student Team'}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      <span>{order.team?.campus?.name || 'Main Campus'}</span>
                      <span className="text-slate-300">&bull;</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(order.created_at)}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Order Total
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        {formatINR(Number(order.total_amount))}
                      </span>
                    </div>

                    {canEdit ? (
                      <Link
                        href={`/friend/order?orderId=${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Order</span>
                      </Link>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200"
                        title={
                          !isOrderingOpen
                            ? 'Ordering closed by admin'
                            : 'Order has transitioned past Pending status'
                        }
                      >
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Collector details & Items Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Collector Info */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Food Collector
                    </span>
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-brand-600" />
                      {order.team?.collector_name || 'N/A'}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <a
                        href={`tel:${order.team?.collector_phone}`}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        {order.team?.collector_phone || 'N/A'}
                      </a>
                    </p>
                  </div>

                  {/* Items summary */}
                  <div className="md:col-span-2 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Ordered Items
                    </span>
                    <div className="space-y-1">
                      {order.items?.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 text-slate-700"
                        >
                          <span className="font-medium">
                            {it.food_name_snapshot}{' '}
                            <span className="text-slate-400 text-[11px]">
                              ({it.variant_name_snapshot})
                            </span>
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">
                              &times; {it.quantity}
                            </span>
                            <span className="font-bold text-brand-700">
                              {formatINR(Number(it.subtotal_price))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        Note: {order.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
