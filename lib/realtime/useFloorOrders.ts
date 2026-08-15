"use client";

import { useOrdersBoard } from "@/lib/realtime/useOrdersBoard";
import type { BoardOrder } from "@/lib/orders/board";
import type { OrderStatus } from "@/lib/types/database.types";

const FLOOR_ACTIVE_STATUSES: OrderStatus[] = ["received", "in_kitchen", "ready"];

export function useFloorOrders(restaurantId: string, initialOrders: BoardOrder[]) {
  return useOrdersBoard("floor-orders", restaurantId, initialOrders, FLOOR_ACTIVE_STATUSES);
}
