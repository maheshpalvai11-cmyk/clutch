# CampusBite — College Event Food Order Management Platform

CampusBite is a full-stack, mobile-first food order management platform designed for college festivals, hackathons, and symposiums. It enables organizers and assigned friends to seamlessly register student teams across multiple campuses, collect dynamic food orders, calculate procurement quantities, track fulfillment at the pickup desk, and analyze financial margins in real time.

---

## 🌟 Key Features

### 1. Dual-Role Authentication & Access Control
- **Admin**:
  - Full control over dashboard metrics, food items, campus locations, friend accounts, and orders.
  - Master **Open / Close Ordering** switch that enforces order freezes on the backend.
  - Full financial oversight: view expected revenue, vendor procurement purchase costs, and gross margins.
- **Friends (Order Collectors)**:
  - Log in with assigned email and password.
  - Register student teams and collect food orders across dynamic campuses.
  - View and edit their own submitted orders while ordering is open and pending.
  - **Financial Privacy**: Purchase costs and profit figures are strictly shielded from friends both in the UI and via server-side sanitization.

### 2. Intelligent Automatic Food Image Matching
- No manual image uploads required.
- Matches entered food names (e.g. *Chicken Biryani*, *VEG BRIYANI*, *Chicken Fried Rice*, *Paneer Butter Masala*, *South Indian Meals*, *Burgers*, *Cold Coffee*) with a curated high-resolution food image catalog.
- Caches matched URLs to prevent repeated lookups, scraping, or external storage bottlenecks.

### 3. Dynamic Serving Variations
- Flexible serving variations per dish (e.g. *Full*, *Single*, *Half*, *Combo*).
- Individual purchase cost and selling price per variation.
- Server-side price snapshotting: historical order costs remain unaffected by future menu price adjustments.

### 4. Robust Order Pipeline & Financial Validation
- 6 pipeline statuses:
  1. `Pending`
  2. `Confirmed`
  3. `Preparing`
  4. `Ready`
  5. `Delivered / Picked up`
  6. `Cancelled`
- Server-side recalculation of quantities, prices, and subtotals (never trusts client prices).
- Duplicate team prevention per campus (`campus_id + team_name` uniqueness).

### 5. Procurement & Pickup Desk (Under Orders)
- **Kitchen Procurement Summary**: Aggregates quantities of all food items and variations needed across non-cancelled orders. Displays total kitchen purchase cost, selling revenue, and expected profit.
- **Team Pickup List**: Organized distribution list with team names, campuses, collector names, contact phone numbers (one-tap calling), ordered items summary, and one-click pickup confirmation.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom warm event theme
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email & Password)
- **Icons**: Lucide React
- **Deployment**: Vercel & Supabase

---

## 📁 Project Structure

```
├── public/                 # Static assets
├── scripts/
│   └── create-admin.mjs    # Initial administrator setup CLI
├── src/
│   ├── app/
│   │   ├── admin/          # Admin Portal (Dashboard, Food Menu, Friends, Orders, Settings)
│   │   │   ├── food/       # Food dishes & serving variation management
│   │   │   ├── friends/    # Friend accounts & orders tracking
│   │   │   ├── orders/     # Orders, Procurement & Team Pickup
│   │   │   ├── settings/   # Open/Close ordering switch & Campuses
│   │   │   ├── layout.tsx  # Admin authentication & navigation wrapper
│   │   │   └── page.tsx    # Admin KPI Metrics Dashboard
│   │   ├── api/            # Server-side Route Handlers with validation
│   │   │   ├── admin/      # Protected admin actions (friends, food, campuses, ordering toggle)
│   │   │   ├── auth/       # Auth routes (logout)
│   │   │   └── orders/     # Order creation & editing with price recalculation
│   │   ├── friend/         # Friend Portal (Collector order taking & my orders)
│   │   │   ├── order/      # Team registration & food card ordering flow
│   │   │   ├── layout.tsx  # Friend navigation & event announcements
│   │   │   └── page.tsx    # Submitted orders list
│   │   ├── login/          # Clean, responsive login page
│   │   ├── globals.css     # Global styles & Tailwind
│   │   ├── layout.tsx      # Root layout with Toast notification provider
│   │   └── page.tsx        # Role-based root redirect
│   ├── components/         # Modular UI components (Navigation, Modals, Toast)
│   ├── lib/
│   │   ├── auth-check.ts   # Server-side auth & role verification
│   │   ├── food-catalog.ts # Auto-matching food image catalog
│   │   ├── supabase/       # Supabase client, server, and admin factories
│   │   └── utils.ts        # Currency formatting (₹ INR), dates, badges
│   ├── middleware.ts       # Route protection middleware
│   └── types/database.ts   # Complete TypeScript definitions
├── supabase/
│   ├── schema.sql          # PostgreSQL DDL, constraints, RLS policies, views
│   └── seed.sql            # Initial campuses, dishes, and serving variations
├── .env.example            # Environment variables template
├── next.config.mjs         # Image domains configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 🚀 Setup & Installation Guide

### Step 1: Clone and Install Dependencies

```bash
git clone <repository-url>
cd FOOD
npm install
```

### Step 2: Set Up Supabase Database

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` and run it to create tables, indexes, helper functions, and RLS policies.
4. Open `supabase/seed.sql` and run it to populate sample campuses, food dishes, and serving variations.

### Step 3: Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> **Note**: `SUPABASE_SERVICE_ROLE_KEY` is only used on the server side (in Next.js Route Handlers) for creating friend accounts and calculating vendor costs. It is never exposed to client browsers.

### Step 4: Create the Initial Admin Account

Run the setup CLI:

```bash
node --env-file=.env.local scripts/create-admin.mjs admin@college.edu MySecurePassword123 "Event Director"
```

This creates the authenticated user in Supabase Auth and provisions their Admin profile.

### Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be greeted by the CampusBite login page.

---

## 🚢 Deployment to Vercel

1. Push your repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**.
6. The deployed application will be accessible via your public Vercel URL. Anyone visiting the URL will directly see the CampusBite login page.

---

## 🛡️ Security Features

- **Row Level Security (RLS)**: Enforced on all Supabase tables (`profiles`, `orders`, `order_items`, `campuses`, `food_items`, `event_settings`).
- **Server-Side Validation**: All financial figures and unit prices are retrieved from the database on the server. Totals sent from the frontend are discarded and recalculated.
- **Ordering Lock Enforcement**: The Master Ordering switch blocks all new orders and order edits at the API level when closed.
- **Role Isolation**: Friends can only access their own orders and are prevented from altering order statuses or viewing purchase costs.

---

## 📱 Mobile Responsiveness

CampusBite is built with a **mobile-first** approach:
- Floating cart bar on mobile screens.
- Touch-friendly `+` and `-` quantity controls.
- Fast team registration and search.
- One-tap phone calling for campus pickup desk staff.
