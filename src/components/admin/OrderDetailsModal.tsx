'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '@/types/database';
import { formatINR, formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import { X, Check, Phone, MapPin, User, Clock, AlertTriangle, Trash2, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { PaymentQRModal } from '@/components/payment/PaymentQRModal';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusUpdated: (updatedOrder: Order) => void;
  onOrderDeleted?: (orderId: string) => void;
}

const ALL_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Delivered / Picked up',
  'Cancelled',
];

export function OrderDetailsModal({
  order,
  onClose,
  onStatusUpdated,
  onOrderDeleted,
}: OrderDetailsModalProps) {
  const { success, error } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    order?.status || 'Pending'
  );
  const [updating, setUpdating] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  if (!order) return null;

  const handleUpdateStatus = async () => {
    if (selectedStatus === order.status) {
      onClose();
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          newStatus: selectedStatus,
          notes: statusNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      success(`Order status updated to ${selectedStatus}`, 'Updated');
      onStatusUpdated({ ...order, status: selectedStatus });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      error(msg, 'Error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          newStatus: 'Cancelled',
          notes: 'Cancelled by Administrator',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');

      success('Order cancelled successfully', 'Cancelled');
      onStatusUpdated({ ...order, status: 'Cancelled' });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel';
      error(msg, 'Error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirm(`Are you sure you want to permanently delete the order for "${order.team?.name || 'this team'}"? This action cannot be undone.`)) {
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete order');

      success('Order permanently deleted', 'Order Deleted');
      if (onOrderDeleted) {
        onOrderDeleted(order.id);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete order';
      error(msg, 'Error');
    } finally {
      setUpdating(false);
    }
  };

  const totalCost = Number(order.total_cost) || 0;
  const totalRevenue = Number(order.total_amount) || 0;
  const profit = totalRevenue - totalCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                Order for {order.team?.name || 'Team'}
              </h3>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Placed on {formatDateTime(order.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Team & Collector Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                <strong className="text-slate-900">Campus:</strong>{' '}
                {order.team?.campus?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                <strong className="text-slate-900">Collector:</strong>{' '}
                {order.team?.collector_name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-900">Phone:</strong>{' '}
                <a
                  href={`tel:${order.team?.collector_phone}`}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  {order.team?.collector_phone || 'N/A'}
                </a>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong className="text-slate-900">Collected by Friend:</strong>{' '}
                {order.friend?.full_name || 'Assigned Friend'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Food Items Breakdown
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item &amp; Variation</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.food_name_snapshot}{' '}
                        <span className="text-[11px] font-normal text-slate-500">
                          ({item.variant_name_snapshot})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {formatINR(Number(item.unit_selling_price))}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {formatINR(Number(item.unit_purchase_cost || 0))}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatINR(Number(item.subtotal_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Financial Snapshot */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
            <div>
              <p className="text-[11px] font-semibold text-amber-800">Total Revenue</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatINR(totalRevenue)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-800">Purchase Cost</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">
                {formatINR(totalCost)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-800">Gross Profit</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">
                {formatINR(profit)}
              </p>
            </div>
          </div>

          {order.notes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <strong className="text-slate-800">Notes:</strong> {order.notes}
            </div>
          )}

          {/* Change Status Control */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Update Order Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    selectedStatus === st
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Optional status notes (e.g., 'Handed to collector at North Block')"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            {order.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 hover:bg-amber-50 border border-amber-200 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDeleteOrder}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              title="Permanently remove order"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Order</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
              title="Show student PhonePe payment QR"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>PhonePe QR</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUpdateStatus}
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{updating ? 'Saving...' : 'Save Status'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PHONEPE QR MODAL */}
      <PaymentQRModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onDoneNewOrder={() => setQrOpen(false)}
        amount={totalRevenue}
        teamName={order.team?.name || 'Student Team'}
        campusName={order.team?.campus?.name}
        orderId={order.id}
      />
    </div>
  );
}
