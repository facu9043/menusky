import type { CartSelectedOption } from "@/lib/types/cart";
import type { OrderStatus } from "@/lib/types/database.types";

export const BOARD_ORDER_SELECT = `
  id, table_id, status, created_at,
  tables ( label ),
  order_items ( id, quantity, selected_options, note, menu_items ( name ) )
`;

export type BoardOrderRow = {
  id: string;
  table_id: string;
  status: OrderStatus;
  created_at: string;
  tables: { label: string } | null;
  order_items: {
    id: string;
    quantity: number;
    selected_options: CartSelectedOption[];
    note: string | null;
    menu_items: { name: string } | null;
  }[];
};

export interface BoardOrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  selectedOptions: CartSelectedOption[];
  note: string | null;
}

export interface BoardOrder {
  id: string;
  tableId: string;
  tableLabel: string;
  status: OrderStatus;
  createdAt: string;
  items: BoardOrderItem[];
}

export function mapBoardOrderRow(row: BoardOrderRow): BoardOrder {
  return {
    id: row.id,
    tableId: row.table_id,
    tableLabel: row.tables?.label ?? "Mesa",
    status: row.status,
    createdAt: row.created_at,
    items: row.order_items.map((item) => ({
      id: item.id,
      menuItemName: item.menu_items?.name ?? "Producto",
      quantity: item.quantity,
      selectedOptions: item.selected_options,
      note: item.note,
    })),
  };
}
