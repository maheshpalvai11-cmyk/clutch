import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFoodImage } from '@/lib/food-catalog';

export async function GET() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    const { data: foodItems, error: itemsError } = await adminClient
      .from('food_items')
      .select('*, variants:food_variants(*)')
      .order('name', { ascending: true });

    if (itemsError) throw itemsError;
    return NextResponse.json({ foodItems });
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

    // Automatic food image selection if not explicitly provided
    const selectedImageUrl = image_url?.trim() || getFoodImage(name);

    const adminClient = createAdminClient();

    let foodItemId = id;

    if (foodItemId) {
      // Update existing food item
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

      const { data, error } = await adminClient
        .from('food_items')
        .update(updatePayload)
        .eq('id', foodItemId)
        .select()
        .single();

      if (error) throw error;
    } else {
      // Create new food item
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

    // Process serving variations if provided
    if (Array.isArray(variants)) {
      for (const variant of variants) {
        if (!variant.name || !variant.name.trim()) continue;

        const purchaseCost = Math.max(0, parseFloat(variant.purchase_cost) || 0);
        const sellingPrice = Math.max(0, parseFloat(variant.selling_price) || 0);

        if (variant.id) {
          // Update existing variant
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
          // Insert new variant
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

    // Fetch updated food item with variants
    const { data: updatedItem } = await adminClient
      .from('food_items')
      .select('*, variants:food_variants(*)')
      .eq('id', foodItemId)
      .single();

    return NextResponse.json({ success: true, foodItem: updatedItem });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
