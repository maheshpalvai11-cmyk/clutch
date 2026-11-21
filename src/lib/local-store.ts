import fs from 'fs';
import path from 'path';

export interface LocalProfile {
  id: string;
  role: 'admin' | 'friend';
  full_name: string;
  email: string;
  password?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalCampus {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface LocalFoodVariant {
  id: string;
  food_item_id: string;
  name: string;
  purchase_cost: number;
  selling_price: number;
  is_active: boolean;
}

export interface LocalFoodItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  is_active: boolean;
  variants: LocalFoodVariant[];
}

export interface LocalTeam {
  id: string;
  name: string;
  campus_id: string;
  collector_name: string;
  collector_phone: string;
  created_by?: string;
  created_at: string;
  campus?: LocalCampus;
}

export interface LocalOrderItem {
  id: string;
  order_id: string;
  food_variant_id: string;
  food_name_snapshot: string;
  variant_name_snapshot: string;
  quantity: number;
  unit_selling_price: number;
  unit_purchase_cost: number;
  subtotal_price: number;
  subtotal_cost: number;
}

export interface LocalOrder {
  id: string;
  team_id: string;
  friend_id: string;
  status: string;
  notes?: string;
  total_amount: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
  team?: LocalTeam;
  friend?: { id: string; full_name: string; email: string };
  items?: LocalOrderItem[];
}

export interface LocalStoreData {
  profiles: LocalProfile[];
  campuses: LocalCampus[];
  food_items: LocalFoodItem[];
  teams: LocalTeam[];
  orders: LocalOrder[];
  settings: {
    ordering_open: boolean;
    event_name: string;
    announcement: string;
  };
}

const DATA_FILE = path.join(process.cwd(), '.data', 'store.json');

declare global {
  // eslint-disable-next-line no-var
  var __CAMPUSBITE_STORE__: LocalStoreData | undefined;
}

function getInitialData(): LocalStoreData {
  return {
    profiles: [
      {
        id: 'admin-001',
        role: 'admin',
        full_name: 'Campus Event Director',
        email: 'admin@campusbite.com',
        password: 'Admin123456',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'friend-001',
        role: 'friend',
        full_name: 'Rahul Sharma',
        email: 'friend@campusbite.com',
        password: 'Friend123456',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    campuses: [
      { id: 'c1', name: 'Main Campus (North Wing)', is_active: true, created_at: new Date().toISOString() },
      { id: 'c2', name: 'Technology & Engineering Campus', is_active: true, created_at: new Date().toISOString() },
      { id: 'c3', name: 'Medical & Health Sciences Campus', is_active: true, created_at: new Date().toISOString() },
      { id: 'c4', name: 'South Campus (Arts & Science)', is_active: true, created_at: new Date().toISOString() },
      { id: 'c5', name: 'City Campus (MBA & Law Block)', is_active: true, created_at: new Date().toISOString() },
    ],
    food_items: [
      {
        id: 'f1',
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice cooked with succulent chicken pieces and traditional spices.',
        image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
        category: 'Biryani & Rice',
        is_active: true,
        variants: [
          { id: 'v1_1', food_item_id: 'f1', name: 'Full', purchase_cost: 160, selling_price: 220, is_active: true },
          { id: 'v1_2', food_item_id: 'f1', name: 'Single', purchase_cost: 100, selling_price: 140, is_active: true },
        ],
      },
      {
        id: 'f2',
        name: 'VEG Biryani',
        description: 'Fragrant basmati rice layered with fresh seasonal vegetables and saffron infused spices.',
        image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
        category: 'Biryani & Rice',
        is_active: true,
        variants: [
          { id: 'v2_1', food_item_id: 'f2', name: 'Full', purchase_cost: 110, selling_price: 160, is_active: true },
          { id: 'v2_2', food_item_id: 'f2', name: 'Single', purchase_cost: 75, selling_price: 110, is_active: true },
        ],
      },
      {
        id: 'f3',
        name: 'Chicken Fried Rice',
        description: 'Wok-tossed long-grain rice with crispy chicken bits, spring onions, and oriental sauces.',
        image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
        category: 'Chinese',
        is_active: true,
        variants: [
          { id: 'v3_1', food_item_id: 'f3', name: 'Full', purchase_cost: 120, selling_price: 170, is_active: true },
          { id: 'v3_2', food_item_id: 'f3', name: 'Half', purchase_cost: 75, selling_price: 110, is_active: true },
        ],
      },
      {
        id: 'f4',
        name: 'Veg Hakka Noodles',
        description: 'Stir-fried noodles with bell peppers, shredded cabbage, carrots, and light soy sauce.',
        image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80',
        category: 'Chinese',
        is_active: true,
        variants: [
          { id: 'v4_1', food_item_id: 'f4', name: 'Full', purchase_cost: 90, selling_price: 130, is_active: true },
          { id: 'v4_2', food_item_id: 'f4', name: 'Half', purchase_cost: 60, selling_price: 90, is_active: true },
        ],
      },
      {
        id: 'f5',
        name: 'Paneer Butter Masala with Parotta',
        description: 'Rich cottage cheese cubes simmered in a creamy buttery tomato gravy, served with 2 parottas.',
        image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80',
        category: 'Indian Gravies',
        is_active: true,
        variants: [
          { id: 'v5_1', food_item_id: 'f5', name: 'Regular', purchase_cost: 100, selling_price: 150, is_active: true },
        ],
      },
      {
        id: 'f6',
        name: 'South Indian Veg Meals',
        description: 'Authentic full thali with rice, sambar, rasam, kootu, poriyal, curd, and crisp papad.',
        image_url: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=800&auto=format&fit=crop&q=80',
        category: 'Thali',
        is_active: true,
        variants: [
          { id: 'v6_1', food_item_id: 'f6', name: 'Full Thali', purchase_cost: 90, selling_price: 130, is_active: true },
        ],
      },
      {
        id: 'f7',
        name: 'Crispy Chicken Burger',
        description: 'Golden fried chicken patty topped with fresh lettuce, mayo, and pickles in a brioche bun.',
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
        category: 'Snacks',
        is_active: true,
        variants: [
          { id: 'v7_1', food_item_id: 'f7', name: 'Regular', purchase_cost: 70, selling_price: 110, is_active: true },
        ],
      },
      {
        id: 'f8',
        name: 'Cold Coffee with Ice Cream',
        description: 'Chilled blended espresso with creamy vanilla ice cream and chocolate drizzle.',
        image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
        category: 'Beverages',
        is_active: true,
        variants: [
          { id: 'v8_1', food_item_id: 'f8', name: 'Large Glass', purchase_cost: 40, selling_price: 70, is_active: true },
        ],
      },
    ],
    teams: [],
    orders: [],
    settings: {
      ordering_open: true,
      event_name: 'CampusBite Festival',
      announcement: 'Welcome! Food order collection is running across all campuses.',
    },
  };
}

export function getLocalStore(): LocalStoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const store: LocalStoreData = JSON.parse(content);

      // Only teams that have placed food orders are kept
      if (store.orders && store.teams) {
        const teamIdsWithOrders = new Set(store.orders.map((o) => o.team_id).filter(Boolean));
        if (store.teams.some((t) => !teamIdsWithOrders.has(t.id))) {
          store.teams = store.teams.filter((t) => teamIdsWithOrders.has(t.id));
          try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
          } catch {
            // write fallback
          }
        }
      }

      globalThis.__CAMPUSBITE_STORE__ = store;
      return globalThis.__CAMPUSBITE_STORE__!;
    }
  } catch {
    // Disk read fallback
  }

  if (globalThis.__CAMPUSBITE_STORE__) {
    return globalThis.__CAMPUSBITE_STORE__;
  }

  const initial = getInitialData();
  initial.teams = [];
  globalThis.__CAMPUSBITE_STORE__ = initial;
  saveLocalStore(initial);
  return initial;
}

export function saveLocalStore(data: LocalStoreData) {
  globalThis.__CAMPUSBITE_STORE__ = data;
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Disk write fallback
  }
}
