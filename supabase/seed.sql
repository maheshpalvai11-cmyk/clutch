-- ==============================================================================
-- CAMPUSBITE SEED DATA
-- ==============================================================================

-- 1. SEED CAMPUSES
INSERT INTO public.campuses (name, is_active) VALUES
('Main Campus (North Wing)', true),
('Technology & Engineering Campus', true),
('Medical & Health Sciences Campus', true),
('South Campus (Arts & Science)', true),
('City Campus (MBA & Law Block)', true)
ON CONFLICT (name) DO NOTHING;

-- 2. SEED CURATED FOOD ITEMS WITH HIGH QUALITY IMAGES
-- (Unsplash food images with optimized widths)
INSERT INTO public.food_items (id, name, description, image_url, category, is_active) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Chicken Biryani',
    'Aromatic basmati rice cooked with succulent chicken pieces and traditional spices.',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    'Biryani & Rice',
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    'VEG Biryani',
    'Fragrant basmati rice layered with fresh seasonal vegetables and saffron infused spices.',
    'https://images.unsplash.com/photo-1642821373181-696a54913e9a?w=800&auto=format&fit=crop&q=80',
    'Biryani & Rice',
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    'Chicken Fried Rice',
    'Wok-tossed long-grain rice with crispy chicken bits, spring onions, and oriental sauces.',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
    'Chinese',
    true
),
(
    '44444444-4444-4444-4444-444444444444',
    'Veg Hakka Noodles',
    'Stir-fried noodles with bell peppers, shredded cabbage, carrots, and light soy sauce.',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80',
    'Chinese',
    true
),
(
    '55555555-5555-5555-5555-555555555555',
    'Paneer Butter Masala with Parotta',
    'Rich cottage cheese cubes simmered in a creamy buttery tomato gravy, served with 2 parottas.',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80',
    'Indian Gravies',
    true
),
(
    '66666666-6666-6666-6666-666666666666',
    'South Indian Veg Meals',
    'Authentic full thali with rice, sambar, rasam, kootu, poriyal, curd, and crisp papad.',
    'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=800&auto=format&fit=crop&q=80',
    'Thali',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'Crispy Chicken Burger',
    'Golden fried chicken patty topped with fresh lettuce, mayo, and pickles in a toasted brioche bun.',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    'Snacks',
    true
),
(
    '88888888-8888-8888-8888-888888888888',
    'Cold Coffee with Ice Cream',
    'Chilled blended espresso with creamy vanilla ice cream and chocolate drizzle.',
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
    'Beverages',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    category = EXCLUDED.category;

-- 3. SEED DYNAMIC SERVING VARIATIONS
-- Each item has variations with purchase cost and selling price
INSERT INTO public.food_variants (food_item_id, name, purchase_cost, selling_price, is_active) VALUES
-- Chicken Biryani: Full (₹160 cost, ₹220 sell), Single (₹100 cost, ₹140 sell)
('11111111-1111-1111-1111-111111111111', 'Full', 160.00, 220.00, true),
('11111111-1111-1111-1111-111111111111', 'Single', 100.00, 140.00, true),

-- VEG Biryani: Full (₹110 cost, ₹160 sell), Single (₹75 cost, ₹110 sell)
('22222222-2222-2222-2222-222222222222', 'Full', 110.00, 160.00, true),
('22222222-2222-2222-2222-222222222222', 'Single', 75.00, 110.00, true),

-- Chicken Fried Rice: Full (₹120 cost, ₹170 sell), Half (₹75 cost, ₹110 sell)
('33333333-3333-3333-3333-333333333333', 'Full', 120.00, 170.00, true),
('33333333-3333-3333-3333-333333333333', 'Half', 75.00, 110.00, true),

-- Veg Hakka Noodles: Full (₹90 cost, ₹130 sell), Half (₹60 cost, ₹90 sell)
('44444444-4444-4444-4444-444444444444', 'Full', 90.00, 130.00, true),
('44444444-4444-4444-4444-444444444444', 'Half', 60.00, 90.00, true),

-- Paneer Butter Masala with Parotta: Regular combo
('55555555-5555-5555-5555-555555555555', 'Regular', 100.00, 150.00, true),

-- South Indian Veg Meals: Full Meals
('66666666-6666-6666-6666-666666666666', 'Full Thali', 90.00, 130.00, true),

-- Crispy Chicken Burger: Single Burger
('77777777-7777-7777-7777-777777777777', 'Regular', 70.00, 110.00, true),

-- Cold Coffee: Glass
('88888888-8888-8888-8888-888888888888', 'Large Glass', 40.00, 70.00, true)
ON CONFLICT (food_item_id, name) DO NOTHING;
