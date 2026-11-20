'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  User,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Profile, Order } from '@/types/database';
import { formatINR, formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';
import { useToast } from '@/components/ui/Toast';

interface EnrichedFriend extends Profile {
  orderCount: number;
  totalRevenue: number;
}

export default function AdminFriendsPage() {
  const { success, error } = useToast();
  const [friends, setFriends] = useState<EnrichedFriend[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Friend Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // View Friend's Orders Modal
  const [inspectFriend, setInspectFriend] = useState<EnrichedFriend | null>(null);
  const [friendOrders, setFriendOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/friends');
      if (!res.ok) throw new Error('Failed to load friends');
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading friends';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleToggleStatus = async (friend: EnrichedFriend) => {
    const nextStatus = !friend.is_active;
    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: friend.id, isActive: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      success(
        `Account for ${friend.full_name} is now ${nextStatus ? 'Activated' : 'Deactivated'}.`,
        'User Status'
      );
      fetchFriends();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating status';
      error(msg);
    }
  };

  const handleCreateFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      error('All fields are required');
      return;
    }

    if (password.length < 6) {
      error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create friend account');

      success(`Friend account for "${fullName}" created successfully!`, 'Account Created');
      setAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      fetchFriends();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Creation failed';
      error(msg);
    } finally {
      setCreating(false);
    }
  };

  const openFriendOrders = async (friend: EnrichedFriend) => {
    setInspectFriend(friend);
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?friendId=${friend.id}`);
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      // Filter for this friend's orders specifically
      const orders = (data.orders || []).filter(
        (o: Order) => o.friend_id === friend.id
      );
      setFriendOrders(orders);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      error(msg);
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            Friend Account Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create friend accounts, manage their login access, and track orders they collected
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Friend Account</span>
        </button>
      </div>

      {/* Friends Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Friend Accounts Yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Add friend accounts so they can log in and register team orders across campuses.
            </p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
            >
              Create Friend Account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Friend Name</th>
                  <th className="py-3 px-4">Login Email</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Orders Collected</th>
                  <th className="py-3 px-4 text-right">Revenue Value</th>
                  <th className="py-3 px-4 text-right">Created</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {friends.map((friend) => (
                  <tr key={friend.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {friend.full_name?.charAt(0)?.toUpperCase() || 'F'}
                      </div>
                      <span>{friend.full_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {friend.email}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(friend)}
                        title={friend.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          friend.is_active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {friend.is_active ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {friend.orderCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatINR(friend.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      {formatDateTime(friend.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openFriendOrders(friend)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>View Orders</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Friend Account Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900">Create Friend Account</h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFriend} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Friend Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="rahul@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password * (min 6 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Friend will use this email and password to log in.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Friend's Orders Drawer / Modal */}
      {inspectFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Orders Collected by {inspectFriend.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{inspectFriend.email}</p>
              </div>
              <button
                onClick={() => setInspectFriend(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {loadingOrders ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : friendOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">
                    No orders submitted yet by {inspectFriend.full_name}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {friendOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="p-3.5 rounded-xl border border-slate-200/80 hover:border-brand-300 bg-white hover:bg-slate-50/50 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {order.team?.name || 'Team'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({order.team?.campus?.name || 'Campus'})
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>Collector: {order.team?.collector_name}</span>
                          <span>&bull;</span>
                          <span>{formatDateTime(order.created_at)}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">
                          {formatINR(Number(order.total_amount))}
                        </p>
                        <span className="text-[11px] font-semibold text-brand-600 hover:underline">
                          View details &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/70">
              <button
                onClick={() => setInspectFriend(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={() => {
            if (inspectFriend) openFriendOrders(inspectFriend);
            fetchFriends();
          }}
        />
      )}
    </div>
  );
}
