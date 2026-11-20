export type UserRole = 'admin' | 'friend';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Delivered / Picked up'
  | 'Cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campus {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface FoodVariant {
  id: string;
  food_item_id: string;
  name: string;
  purchase_cost: number;
  selling_price: number;
  is_active: boolean;
  created_at?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  variants?: FoodVariant[];
}

export interface Team {
  id: string;
  name: string;
  campus_id: string;
  collector_name: string;
  collector_phone: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  campus?: Campus;
}

export interface OrderItem {
  id: string;
  order_id: string;
  food_variant_id: string | null;
  food_name_snapshot: string;
  variant_name_snapshot: string;
  quantity: number;
  unit_selling_price: number;
  unit_purchase_cost?: number; // Hidden from friends
  subtotal_price: number;
  subtotal_cost?: number; // Hidden from friends
  created_at?: string;
}

export interface Order {
  id: string;
  team_id: string;
  friend_id: string;
  status: OrderStatus;
  notes?: string;
  total_amount: number;
  total_cost?: number; // Hidden from friends
  created_at: string;
  updated_at: string;
  team?: Team & { campus?: Campus };
  friend?: Profile;
  items?: OrderItem[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
  changer?: Profile;
}

export interface EventSettings {
  id: number;
  ordering_open: boolean;
  event_name: string;
  announcement: string;
  updated_at: string;
  updated_by?: string;
}

export interface CartItem {
  foodItemId: string;
  foodName: string;
  variantId: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}
