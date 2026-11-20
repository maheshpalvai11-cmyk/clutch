'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  DollarSign,
  Layers,
  X,
} from 'lucide-react';
import { FoodItem, FoodVariant } from '@/types/database';
import { getFoodImage } from '@/lib/food-catalog';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface VariantInput {
  id?: string;
  name: string;
  purchase_cost: number | string;
  selling_price: number | string;
  is_active?: boolean;
}

export default function AdminFoodPage() {
  const { success, error } = useToast();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Biryani & Rice');
  const [previewImage, setPreviewImage] = useState('');
  const [variants, setVariants] = useState<VariantInput[]>([
    { name: 'Full', purchase_cost: 120, selling_price: 180, is_active: true },
    { name: 'Single', purchase_cost: 80, selling_price: 120, is_active: true },
  ]);

  const fetchFoodItems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/food');
      if (!res.ok) throw new Error('Failed to load food menu');
      const data = await res.json();
      setFoodItems(data.foodItems || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching food';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchFoodItems();
  }, [fetchFoodItems]);

  // Live Automatic Image Lookup when typing food name
  const handleNameChange = (val: string) => {
    setName(val);
    if (val.trim().length >= 3) {
      const matched = getFoodImage(val);
      setPreviewImage(matched);
    }
  };

  const openAddModal = () => {
    setEditingItemId(null);
    setName('');
    setDescription('');
    setCategory('Biryani & Rice');
    setPreviewImage(getFoodImage('Biryani'));
    setVariants([
      { name: 'Full', purchase_cost: 120, selling_price: 180, is_active: true },
      { name: 'Single', purchase_cost: 80, selling_price: 120, is_active: true },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (item: FoodItem) => {
    setEditingItemId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setCategory(item.category || 'General');
    setPreviewImage(item.image_url || getFoodImage(item.name));
    setVariants(
      item.variants && item.variants.length > 0
        ? item.variants.map((v) => ({
            id: v.id,
            name: v.name,
            purchase_cost: v.purchase_cost,
            selling_price: v.selling_price,
            is_active: v.is_active,
          }))
        : [{ name: 'Regular', purchase_cost: 100, selling_price: 150, is_active: true }]
    );
    setModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { name: 'Half', purchase_cost: 60, selling_price: 90, is_active: true },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (variants.length <= 1) {
      error('A food item must have at least one serving variation.');
      return;
    }
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof VariantInput,
    value: string | number | boolean
  ) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleToggleItemActive = async (item: FoodItem) => {
    const nextState = !item.is_active;
    try {
      const res = await fetch('/api/admin/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          is_active: nextState,
        }),
      });

      if (!res.ok) throw new Error('Failed to update food status');
      success(
        `"${item.name}" is now ${nextState ? 'Available' : 'Deactivated'}.`,
        'Menu Updated'
      );
      fetchFoodItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating';
      error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Food item name is required');
      return;
    }

    if (variants.some((v) => !v.name.trim())) {
      error('All variation names must be filled out');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItemId || undefined,
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          image_url: previewImage || getFoodImage(name),
          variants: variants.map((v) => ({
            id: v.id,
            name: v.name.trim(),
            purchase_cost: parseFloat(String(v.purchase_cost)) || 0,
            selling_price: parseFloat(String(v.selling_price)) || 0,
            is_active: v.is_active !== undefined ? v.is_active : true,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save food item');

      success(
        editingItemId ? 'Food item updated successfully' : 'New food item added to menu',
        'Success'
      );
      setModalOpen(false);
      fetchFoodItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <UtensilsCrossed className="w-7 h-7 text-brand-600" />
            Food Menu Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage food dishes, dynamic serving variations, purchase costs, and selling prices
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Food Item</span>
        </button>
      </div>

      {/* Food Items List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : foodItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Food Items Configured</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Add items to make them available for friends collecting event orders.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
          >
            Add Your First Food Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {foodItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all flex flex-col ${
                item.is_active
                  ? 'border-slate-200/80 hover:shadow-md hover:border-brand-300'
                  : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              {/* Image Preview with Category Badge */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                <Image
                  src={item.image_url || getFoodImage(item.name)}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                    {item.category || 'Food Item'}
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleItemActive(item)}
                    title={item.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                      item.is_active
                        ? 'bg-emerald-500/90 text-white shadow-sm'
                        : 'bg-rose-500/90 text-white shadow-sm'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-bold text-white drop-shadow-sm leading-tight">
                    {item.name}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {item.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Serving Variations Table */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Variations
                    </span>
                    <span>Cost / Selling</span>
                  </div>

                  <div className="space-y-1.5">
                    {item.variants && item.variants.length > 0 ? (
                      item.variants.map((v: FoodVariant) => {
                        const cost = Number(v.purchase_cost) || 0;
                        const sell = Number(v.selling_price) || 0;
                        const margin = sell - cost;
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <span className="font-semibold text-slate-800">{v.name}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[11px] text-slate-400"
                                title={`Purchase Cost: ${formatINR(cost)}`}
                              >
                                Cost: {formatINR(cost)}
                              </span>
                              <span className="font-bold text-brand-600">
                                {formatINR(sell)}
                              </span>
                              <span
                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"
                                title="Expected Gross Profit per unit"
                              >
                                +{formatINR(margin)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 italic">No variations added</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {item.variants?.length || 0} variation
                    {(item.variants?.length || 0) !== 1 ? 's' : ''}
                  </span>

                  <button
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-brand-50 border border-slate-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Food Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingItemId ? 'Edit Food Item & Variations' : 'Add New Food Item'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Food Name with Auto-Image Trigger */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Food Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken Biryani, Paneer Butter Masala, Veg Fried Rice"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Suitable image is automatically matched from catalog as you type
                </p>
              </div>

              {/* Automatic Image Preview Card */}
              {previewImage && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                    <Image
                      src={previewImage}
                      alt="Matched Food Preview"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      Auto-Selected Catalog Image
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{previewImage}</p>
                    <span className="inline-block mt-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                      Cached &amp; CDN Ready
                    </span>
                  </div>
                </div>
              )}

              {/* Category & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="Biryani & Rice">Biryani &amp; Rice</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Indian Gravies">Indian Gravies</option>
                    <option value="Thali">Thali / Meals</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Served with raita and gravy"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>

              {/* Dynamic Serving Variations */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-600" />
                      Serving Variations &amp; Pricing
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Configure variations (e.g. Full, Single, Half). Friends only see selling prices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Variation</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {variants.map((v, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 items-center"
                    >
                      <div className="col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Variation Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Full / Single / Half"
                          value={v.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Cost (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={v.purchase_cost}
                          onChange={(e) =>
                            handleVariantChange(index, 'purchase_cost', e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-right"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Selling (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={v.selling_price}
                          onChange={(e) =>
                            handleVariantChange(index, 'selling_price', e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-right"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(index)}
                          title="Remove variation"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving ? 'Saving...' : editingItemId ? 'Save Changes' : 'Create Food Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
