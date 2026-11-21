'use client';

import React, { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  ShoppingBag,
  Users,
  MapPin,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Lock,
  QrCode,
} from 'lucide-react';
import { FoodItem, FoodVariant, Campus, Team, Order } from '@/types/database';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { PaymentQRModal } from '@/components/payment/PaymentQRModal';

interface CartItemEntry {
  foodItemId: string;
  foodName: string;
  variantId: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

function FriendOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editOrderId = searchParams.get('orderId');
  const { success, error, info } = useToast();

  // Core Data
  const [foodMenu, setFoodMenu] = useState<FoodItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Team Registration Fields
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamName, setTeamName] = useState('');
  const [campusId, setCampusId] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [collectorPhone, setCollectorPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Serving Variation per Food Item { [foodItemId]: variantId }
  const [selectedVariantByFood, setSelectedVariantByFood] = useState<Record<string, string>>({});

  // Cart: Map of variantId -> CartItemEntry
  const [cart, setCart] = useState<Record<string, CartItemEntry>>({});

  // Order Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderingOpen, setOrderingOpen] = useState(true);

  // PhonePe QR Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    orderId?: string;
    amount: number;
    teamName: string;
    campusName?: string;
  } | null>(null);

  // 1. Fetch initial menu, campuses, and teams
  const loadInitialData = useCallback(async () => {
    try {
      const [menuRes, campusesRes, teamsRes] = await Promise.all([
        fetch('/api/menu'),
        fetch('/api/campuses'),
        fetch('/api/teams'),
      ]);

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setFoodMenu(menuData.foodItems || []);

        // Initialize default selected variant for each food item (first active variant)
        const defaults: Record<string, string> = {};
        (menuData.foodItems || []).forEach((item: FoodItem) => {
          if (item.variants && item.variants.length > 0) {
            defaults[item.id] = item.variants[0].id;
          }
        });
        setSelectedVariantByFood(defaults);
      }

      if (campusesRes.ok) {
        const campusesData = await campusesRes.json();
        const activeCampuses = campusesData.campuses || [];
        setCampuses(activeCampuses);
        if (activeCampuses.length > 0 && !campusId) {
          setCampusId(activeCampuses[0].id);
        }
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setExistingTeams(teamsData.teams || []);
      }

      // If editing an existing order
      if (editOrderId) {
        const orderRes = await fetch(`/api/orders`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const target = (orderData.orders || []).find((o: Order) => o.id === editOrderId);
          if (target) {
            setSelectedTeamId(target.team_id);
            setTeamName(target.team?.name || '');
            setCampusId(target.team?.campus_id || '');
            setCollectorName(target.team?.collector_name || '');
            setCollectorPhone(target.team?.collector_phone || '');
            setNotes(target.notes || '');

            // Reconstruct cart
            const preCart: Record<string, CartItemEntry> = {};
            target.items?.forEach((it: { food_variant_id: string | null; food_name_snapshot: string; variant_name_snapshot: string; unit_selling_price: number; quantity: number }) => {
              if (it.food_variant_id) {
                preCart[it.food_variant_id] = {
                  foodItemId: '',
                  foodName: it.food_name_snapshot,
                  variantId: it.food_variant_id,
                  variantName: it.variant_name_snapshot,
                  unitPrice: Number(it.unit_selling_price),
                  quantity: it.quantity,
                  imageUrl: '',
                };
              }
            });
            setCart(preCart);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading data';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [editOrderId, campusId, error]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Team Selection Dropdown
  const handleTeamDropdownChange = (tId: string) => {
    setSelectedTeamId(tId);
    if (!tId) {
      setTeamName('');
      setCollectorName('');
      setCollectorPhone('');
      return;
    }

    const matched = existingTeams.find((t) => t.id === tId);
    if (matched) {
      setTeamName(matched.name);
      setCampusId(matched.campus_id);
      setCollectorName(matched.collector_name);
      setCollectorPhone(matched.collector_phone);
      info(`Loaded registered team details for "${matched.name}".`);
    }
  };

  // Quantity adjustments
  const handleIncreaseQty = (item: FoodItem) => {
    const variantId = selectedVariantByFood[item.id];
    if (!variantId) return;

    const variant = item.variants?.find((v) => v.id === variantId);
    if (!variant) return;

    setCart((prev) => {
      const existing = prev[variantId];
      const newQty = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [variantId]: {
          foodItemId: item.id,
          foodName: item.name,
          variantId: variant.id,
          variantName: variant.name,
          unitPrice: Number(variant.selling_price),
          quantity: newQty,
          imageUrl: item.image_url,
        },
      };
    });
  };

  const handleDecreaseQty = (item: FoodItem) => {
    const variantId = selectedVariantByFood[item.id];
    if (!variantId || !cart[variantId]) return;

    setCart((prev) => {
      const current = prev[variantId];
      if (current.quantity <= 1) {
        const copy = { ...prev };
        delete copy[variantId];
        return copy;
      }
      return {
        ...prev,
        [variantId]: {
          ...current,
          quantity: current.quantity - 1,
        },
      };
    });
  };

  // Aggregated Cart Calculations
  const cartItemsList = useMemo(() => Object.values(cart), [cart]);

  const totalQuantity = useMemo(
    () => cartItemsList.reduce((sum, item) => sum + item.quantity, 0),
    [cartItemsList]
  );

  const totalAmount = useMemo(
    () =>
      cartItemsList.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [cartItemsList]
  );

  // Submit Order
  const handleSubmitOrder = async () => {
    if (!teamName.trim()) {
      error('Please enter the team name.');
      return;
    }

    if (!campusId) {
      error('Please select a campus.');
      return;
    }

    if (!collectorName.trim()) {
      error('Please enter the food collector name.');
      return;
    }

    if (!collectorPhone.trim()) {
      error('Please enter the collector phone number.');
      return;
    }

    if (cartItemsList.length === 0) {
      error('Please select at least one food item before placing the order.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId: editOrderId || undefined,
        teamId: selectedTeamId || undefined,
        teamName: teamName.trim(),
        campusId,
        collectorName: collectorName.trim(),
        collectorPhone: collectorPhone.trim(),
        notes: notes.trim(),
        items: cartItemsList.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      };

      const endpoint = '/api/orders';
      const method = editOrderId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit order');
      }

      const targetCampusName =
        campuses.find((c) => c.id === campusId)?.name || 'Main Campus';

      const createdOrderId = data.orderId || data.order?.id || '';

      setPaymentModalData({
        orderId: createdOrderId,
        amount: totalAmount,
        teamName: teamName.trim(),
        campusName: targetCampusName,
      });

      setReviewModalOpen(false);
      setPaymentModalOpen(true);

      success(
        `Order registered! Total bill ${formatINR(totalAmount)}. Present PhonePe QR code to student.`,
        'Order Placed'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDoneNewOrder = () => {
    setPaymentModalOpen(false);
    setPaymentModalData(null);

    // Reset all form inputs for a brand new order
    setCart({});
    setTeamName('');
    setCollectorName('');
    setCollectorPhone('');
    setNotes('');
    setSelectedTeamId('');
    if (campuses.length > 0) {
      setCampusId(campuses[0].id);
    }

    success('Payment complete! Ready for next team order.', 'New Order');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (editOrderId) {
      router.push('/friend/order');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/friend')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {editOrderId ? 'Edit Team Food Order' : 'Team Registration & Order'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Collect food orders from student teams during the event
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: TEAM REGISTRATION CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-black text-xs flex items-center justify-center">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Student Team Details</h2>
              <p className="text-[11px] text-slate-400">
                Identify the team and the student picking up food
              </p>
            </div>
          </div>

          {!editOrderId && existingTeams.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-500 hidden sm:inline">
                Or pick registered team:
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => handleTeamDropdownChange(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">-- Register New Team --</option>
                {existingTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.campus?.name})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Team Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Team Name *
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={Boolean(editOrderId)}
                placeholder="e.g. CodeWarriors, RoboTitans"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100 font-semibold"
              />
            </div>
          </div>

          {/* Campus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campus *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                required
                disabled={Boolean(editOrderId)}
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white disabled:bg-slate-100 text-xs font-semibold"
              >
                <option value="">Select Campus</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Food Collector Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Food Collector Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Siddharth M."
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-semibold"
              />
            </div>
          </div>

          {/* Collector Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Collector Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={collectorPhone}
                onChange={(e) => setCollectorPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Optional Order Notes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Special Instructions / Dietary Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Extra raita if available, pack separately"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      </div>

      {/* STEP 2: AVAILABLE FOOD MENU */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-black text-xs flex items-center justify-center">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Select Food Items</h2>
              <p className="text-[11px] text-slate-400">
                Choose serving variations and tap (+) to add quantities
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {foodMenu.length} dishes available
          </span>
        </div>

        {foodMenu.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No food items available</p>
            <p className="text-xs text-slate-400 mt-0.5">Please check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodMenu.map((item) => {
              const currentVariantId =
                selectedVariantByFood[item.id] || item.variants?.[0]?.id || '';
              const currentVariant = item.variants?.find(
                (v) => v.id === currentVariantId
              );
              const cartEntry = cart[currentVariantId];
              const quantityInCart = cartEntry?.quantity || 0;

              // Total count of this food item across all its variations in cart
              const totalItemQuantity = Object.values(cart)
                .filter((c) => c.foodItemId === item.id)
                .reduce((sum, c) => sum + c.quantity, 0);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all flex flex-col justify-between ${
                    totalItemQuantity > 0
                      ? 'border-brand-500 ring-2 ring-brand-500/10'
                      : 'border-slate-200/80 hover:border-brand-300'
                  }`}
                >
                  {/* Food Image & Badge */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                        {item.category || 'Dish'}
                      </span>
                    </div>

                    {totalItemQuantity > 0 && (
                      <div className="absolute top-3 right-3 bg-brand-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md animate-in zoom-in-75">
                        {totalItemQuantity} selected
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-bold text-white drop-shadow-sm leading-tight">
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  {/* Body: Description, Variations, Controls */}
                  <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Variations Selector Tabs */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Select Serving Variation:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.variants?.map((v) => {
                          const isSelected = v.id === currentVariantId;
                          const countForThisVariant = cart[v.id]?.quantity || 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() =>
                                setSelectedVariantByFood((prev) => ({
                                  ...prev,
                                  [item.id]: v.id,
                                }))
                              }
                              className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                                  : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <span>{v.name}</span>
                              <span className="opacity-80">
                                {formatINR(Number(v.selling_price))}
                              </span>
                              {countForThisVariant > 0 && (
                                <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center font-bold">
                                  {countForThisVariant}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price & Quantity Controls */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Selling Price
                        </span>
                        <span className="text-base font-black text-slate-900">
                          {formatINR(Number(currentVariant?.selling_price || 0))}
                        </span>
                      </div>

                      {/* Stepper (+ / -) */}
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(item)}
                          disabled={quantityInCart === 0}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="w-8 text-center text-xs font-black text-slate-900">
                          {quantityInCart}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleIncreaseQty(item)}
                          className="w-8 h-8 rounded-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center justify-center shadow-sm shadow-brand-500/30 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING BOTTOM ORDER SUMMARY BAR */}
      {cartItemsList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-2xl animate-in slide-in-from-bottom">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in cart
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xs text-slate-500">
                  Team: <strong>{teamName || 'Not Set'}</strong>
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                Total: {formatINR(totalAmount)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-700 via-indigo-600 to-brand-600 hover:from-purple-800 hover:to-brand-700 shadow-md shadow-purple-500/25 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Review &amp; Pay ({formatINR(totalAmount)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CLEAR ORDER SUMMARY REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Food Order Submission
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify items and team details before saving to database
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Team Verification Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{teamName}</span>
                  <span className="text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                    {campuses.find((c) => c.id === campusId)?.name || 'Campus'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span>Collector: <strong>{collectorName}</strong></span>
                  <span>Phone: <strong>{collectorPhone}</strong></span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Order Items Breakdown
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {cartItemsList.map((item) => (
                    <div
                      key={item.variantId}
                      className="p-3 flex items-center justify-between hover:bg-slate-50/60"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {item.foodName}{' '}
                          <span className="font-normal text-slate-500 text-[11px]">
                            ({item.variantName})
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatINR(item.unitPrice)} each
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          &times; {item.quantity}
                        </span>
                        <span className="font-black text-brand-600">
                          {formatINR(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-purple-900 block">
                    Total Amount to Collect
                  </span>
                  <span className="text-[10px] text-purple-700">
                    PhonePe QR will be displayed for {totalQuantity} items
                  </span>
                </div>
                <span className="text-xl font-black text-slate-900">
                  {formatINR(totalAmount)}
                </span>
              </div>

              {notes && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-[11px]">
                  <strong>Notes:</strong> {notes}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-indigo-600 to-brand-600 hover:from-purple-800 hover:to-brand-700 shadow-md shadow-purple-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>{submitting ? 'Placing Order...' : 'Confirm & Show PhonePe QR'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHONEPE QR PAYMENT MODAL */}
      {paymentModalData && (
        <PaymentQRModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            router.push('/friend');
          }}
          onDoneNewOrder={handleDoneNewOrder}
          amount={paymentModalData.amount}
          teamName={paymentModalData.teamName}
          campusName={paymentModalData.campusName}
          orderId={paymentModalData.orderId}
        />
      )}
    </div>
  );
}

export default function FriendOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FriendOrderForm />
    </Suspense>
  );
}
