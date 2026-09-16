import { db } from "../db";
import { eq } from "drizzle-orm";
import { orders, type Order } from "../db/schema";

export function GetOrdersByUser(slackId: string): Order[] {
  if (!slackId) return [];

  const result = db
    .select()
    .from(orders)
    .where(eq(orders.slackId, slackId))
    .all();

  return result ?? [];
}
