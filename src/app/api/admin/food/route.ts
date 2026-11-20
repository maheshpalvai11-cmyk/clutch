import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFoodImage } from '@/lib/food-catalog';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';

export async function GET() {
  try {
    await requireAdmin();

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      const { data: foodItems, error: itemsError } = await adminClient
        .from('food_items')
        .select('*, variants:food_variants(*)')
        .order('name', { ascending: true });

      if (itemsError) throw itemsError;
      return NextResponse.json({ foodItems });
    }

    const store = getLocalStore();
    return NextResponse.json({ foodItems: store.food_items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, name, description, category, is_active, variants, image_url } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Food name is required' }, { status: 400 });
    }

    const selectedImageUrl = image_url?.trim() || getFoodImage(name);

    if (isSupabaseConfigured()) {
      const adminClient = createAdminClient();
      let foodItemId = id;

      if (foodItemId) {
        const updatePayload: Record<string, unknown> = {
          name: name.trim(),
          description: description?.trim() || '',
          image_url: selectedImageUrl,
          category: category?.trim() || 'General',
          updated_at: new Date().toISOString(),
        };
        if (typeof is_active === 'boolean') {
          updatePayload.is_active = is_active;
        }

        await adminClient.from('food_items').update(updatePayload).eq('id', foodItemId);
      } else {
        const { data, error } = await adminClient
          .from('food_items')
          .insert({
            name: name.trim(),
            description: description?.trim() || '',
            image_url: selectedImageUrl,
            category: category?.trim() || 'General',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        foodItemId = data.id;
      }

      if (Array.isArray(variants)) {
        for (const variant of variants) {
          if (!variant.name || !variant.name.trim()) continue;
          const purchaseCost = Math.max(0, parseFloat(variant.purchase_cost) || 0);
          const sellingPrice = Math.max(0, parseFloat(variant.selling_price) || 0);

          if (variant.id) {
            await adminClient
              .from('food_variants')
              .update({
                name: variant.name.trim(),
                purchase_cost: purchaseCost,
                selling_price: sellingPrice,
                is_active: variant.is_active !== undefined ? variant.is_active : true,
              })
              .eq('id', variant.id);
          } else {
            await adminClient.from('food_variants').insert({
              food_item_id: foodItemId,
              name: variant.name.trim(),
              purchase_cost: purchaseCost,
              selling_price: sellingPrice,
              is_active: true,
            });
          }
        }
      }

      const { data: updatedItem } = await adminClient
        .from('food_items')
        .select('*, variants:food_variants(*)')
        .eq('id', foodItemId)
        .single();

      return NextResponse.json({ success: true, foodItem: updatedItem });
    }

    // Local Store Fallback
    const store = getLocalStore();
    let item = store.food_items.find((fi) => fi.id === id);

    if (item) {
      item.name = name.trim();
      item.description = description?.trim() || '';
      item.image_url = selectedImageUrl;
      item.category = category?.trim() || 'General';
      if (typeof is_active === 'boolean') item.is_active = is_active;

      if (Array.isArray(variants)) {
        item.variants = variants.map((v) => ({
          id: v.id || `v-${Date.now()}-${Math.random()}`,
          food_item_id: item!.id,
          name: v.name.trim(),
          purchase_cost: parseFloat(v.purchase_cost) || 0,
          selling_price: parseFloat(v.selling_price) || 0,
          is_active: v.is_active !== undefined ? v.is_active : true,
        }));
      }
    } else {
      const newItemId = `f-${Date.now()}`;
      item = {
        id: newItemId,
        name: name.trim(),
        description: description?.trim() || '',
        image_url: selectedImageUrl,
        category: category?.trim() || 'General',
        is_active: true,
        variants: Array.isArray(variants)
          ? variants.map((v) => ({
              id: `v-${Date.now()}-${Math.random()}`,
              food_item_id: newItemId,
              name: v.name.trim(),
              purchase_cost: parseFloat(v.purchase_cost) || 0,
              selling_price: parseFloat(v.selling_price) || 0,
              is_active: true,
            }))
          : [
              {
                id: `v-${Date.now()}`,
                food_item_id: newItemId,
                name: 'Full',
                purchase_cost: 100,
                selling_price: 150,
                is_active: true,
              },
            ],
      };
      store.food_items.push(item);
    }

    saveLocalStore(store);
    return NextResponse.json({ success: true, foodItem: item });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
