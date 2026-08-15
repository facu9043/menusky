// Tipos escritos a mano para reflejar supabase/migrations/0001_init.sql.
// Cuando tengas el proyecto de Supabase creado y linkeado, podés regenerarlos con:
//   npx supabase gen types typescript --project-id <tu-project-id> > lib/types/database.types.ts

import type { CartSelectedOption } from "@/lib/types/cart";
import type { RestaurantTheme } from "@/lib/theme/types";

export type OrderStatus =
  | "received"
  | "in_kitchen"
  | "ready"
  | "delivered"
  | "cancelled";

export type WaiterCallStatus = "pending" | "attended";

export type StaffRole = "admin" | "waiter" | "kitchen";

export type OptionSelectionType = "single" | "multiple";

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          phone: string | null;
          address: string | null;
          theme: RestaurantTheme | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["restaurants"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Row"]>;
        Relationships: [];
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          label: string;
          qr_token: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tables"]["Row"]> & {
          restaurant_id: string;
          label: string;
          qr_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["tables"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          restaurant_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          photo_url: string | null;
          is_available: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_items"]["Row"]> & {
          category_id: string;
          name: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
        Relationships: [];
      };
      item_option_groups: {
        Row: {
          id: string;
          menu_item_id: string;
          name: string;
          selection_type: OptionSelectionType;
          is_required: boolean;
          sort_order: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["item_option_groups"]["Row"]
        > & {
          menu_item_id: string;
          name: string;
          selection_type: OptionSelectionType;
        };
        Update: Partial<
          Database["public"]["Tables"]["item_option_groups"]["Row"]
        >;
        Relationships: [];
      };
      item_option_choices: {
        Row: {
          id: string;
          option_group_id: string;
          name: string;
          extra_price: number;
          sort_order: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["item_option_choices"]["Row"]
        > & {
          option_group_id: string;
          name: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["item_option_choices"]["Row"]
        >;
        Relationships: [];
      };
      staff_users: {
        Row: {
          id: string;
          restaurant_id: string;
          auth_user_id: string;
          name: string;
          role: StaffRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["staff_users"]["Row"]> & {
          restaurant_id: string;
          auth_user_id: string;
          name: string;
          role: StaffRole;
        };
        Update: Partial<Database["public"]["Tables"]["staff_users"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          table_id: string;
          restaurant_id: string;
          status: OrderStatus;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          table_id: string;
          restaurant_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          selected_options: CartSelectedOption[];
          note: string | null;
          subtotal: number;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & {
          order_id: string;
          menu_item_id: string;
          subtotal: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Relationships: [];
      };
      waiter_calls: {
        Row: {
          id: string;
          table_id: string;
          restaurant_id: string;
          status: WaiterCallStatus;
          reason: string | null;
          created_at: string;
          attended_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["waiter_calls"]["Row"]> & {
          table_id: string;
          restaurant_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["waiter_calls"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
