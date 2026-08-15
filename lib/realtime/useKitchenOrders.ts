"use client";

import { useOrdersBoard } from "@/lib/realtime/useOrdersBoard";
import type { BoardOrder } from "@/lib/orders/board";
import type { OrderStatus } from "@/lib/types/database.types";

const KITCHEN_ACTIVE_STATUSES: OrderStatus[] = ["received", "in_kitchen"];

export function useKitchenOrders(restaurantId: string, initialOrders: BoardOrder[]) {
  return useOrdersBoard("kitchen-orders", restaurantId, initialOrders, KITCHEN_ACTIVE_STATUSES);
}
