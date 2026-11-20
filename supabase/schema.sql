-- ==============================================================================
-- CAMPUSBITE SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'friend')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CAMPUSES TABLE
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FOOD ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'Main Course',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FOOD VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.food_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Full', 'Single', 'Half'
    purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(food_item_id, name)
);

-- 5. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE RESTRICT,
    collector_name TEXT NOT NULL,
    collector_phone TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_team_per_campus UNIQUE (campus_id, name)
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered / Picked up', 'Cancelled')),
    notes TEXT DEFAULT '',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    food_variant_id UUID REFERENCES public.food_variants(id) ON DELETE SET NULL,
    food_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_selling_price NUMERIC(10, 2) NOT NULL CHECK (unit_selling_price >= 0),
    unit_purchase_cost NUMERIC(10, 2) NOT NULL CHECK (unit_purchase_cost >= 0),
    subtotal_price NUMERIC(10, 2) NOT NULL CHECK (subtotal_price >= 0),
    subtotal_cost NUMERIC(10, 2) NOT NULL CHECK (subtotal_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. EVENT SETTINGS TABLE (Singleton)
CREATE TABLE IF NOT EXISTS public.event_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    ordering_open BOOLEAN NOT NULL DEFAULT true,
    event_name TEXT NOT NULL DEFAULT 'CampusBite Fest',
    announcement TEXT DEFAULT 'Welcome to CampusBite! Orders are currently being accepted.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ensure the singleton settings row exists
INSERT INTO public.event_settings (id, ordering_open, event_name, announcement)
VALUES (1, true, 'CampusBite Event', 'Welcome! Food order collection is active.')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_food_variants_food_item ON public.food_variants(food_item_id);
CREATE INDEX IF NOT EXISTS idx_teams_campus ON public.teams(campus_id);
CREATE INDEX IF NOT EXISTS idx_orders_team ON public.orders(team_id);
CREATE INDEX IF NOT EXISTS idx_orders_friend ON public.orders(friend_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);

-- ==============================================================================
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_ordering_open()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT ordering_open FROM public.event_settings WHERE id = 1),
        true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- 2. Campuses Policies
CREATE POLICY "Authenticated users can view campuses"
    ON public.campuses FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage campuses"
    ON public.campuses FOR ALL
    USING (public.is_admin());

-- 3. Food Items Policies
CREATE POLICY "Authenticated users can view food items"
    ON public.food_items FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage food items"
    ON public.food_items FOR ALL
    USING (public.is_admin());

-- 4. Food Variants Policies
CREATE POLICY "Authenticated users can view food variants"
    ON public.food_variants FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage food variants"
    ON public.food_variants FOR ALL
    USING (public.is_admin());

-- 5. Teams Policies
CREATE POLICY "Authenticated users can view all teams"
    ON public.teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create teams"
    ON public.teams FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins or creators can update teams"
    ON public.teams FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR created_by = auth.uid());

-- 6. Orders Policies
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    USING (public.is_admin());

CREATE POLICY "Friends can view their own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (friend_id = auth.uid());

CREATE POLICY "Friends can create orders when ordering is open"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (
        friend_id = auth.uid() AND
        public.is_ordering_open()
    );

CREATE POLICY "Friends can edit their own orders when ordering is open and pending"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (
        friend_id = auth.uid() AND
        public.is_ordering_open() AND
        status = 'Pending'
    )
    WITH CHECK (
        friend_id = auth.uid() AND
        public.is_ordering_open() AND
        status = 'Pending'
    );

-- 7. Order Items Policies
CREATE POLICY "Admins have full access to order items"
    ON public.order_items FOR ALL
    USING (public.is_admin());

CREATE POLICY "Friends can view order items for their orders"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.friend_id = auth.uid()
        )
    );

CREATE POLICY "Friends can manage order items when ordering is open"
    ON public.order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_ordering_open() AND
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.friend_id = auth.uid()
            AND orders.status = 'Pending'
        )
    );

CREATE POLICY "Friends can delete/update items when ordering is open"
    ON public.order_items FOR DELETE
    TO authenticated
    USING (
        public.is_ordering_open() AND
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.friend_id = auth.uid()
            AND orders.status = 'Pending'
        )
    );

-- 8. Order Status History Policies
CREATE POLICY "Admins have full access to status history"
    ON public.order_status_history FOR ALL
    USING (public.is_admin());

CREATE POLICY "Friends can view history for their own orders"
    ON public.order_status_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_history.order_id AND orders.friend_id = auth.uid()
        )
    );

-- 9. Event Settings Policies
CREATE POLICY "Authenticated users can view event settings"
    ON public.event_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can update event settings"
    ON public.event_settings FOR UPDATE
    USING (public.is_admin());

-- ==============================================================================
-- SAFE CLIENT-FACING VIEW FOR FOOD VARIANTS (Hides purchase cost from friends)
-- ==============================================================================
CREATE OR REPLACE VIEW public.food_menu_view AS
SELECT 
    fi.id AS food_id,
    fi.name AS food_name,
    fi.description,
    fi.image_url,
    fi.category,
    fi.is_active AS food_active,
    fv.id AS variant_id,
    fv.name AS variant_name,
    fv.selling_price,
    fv.is_active AS variant_active
FROM public.food_items fi
JOIN public.food_variants fv ON fi.id = fv.food_item_id
WHERE fi.is_active = true AND fv.is_active = true;
