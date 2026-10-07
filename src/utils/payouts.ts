import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { payouts, reviewEvents } from "../db/schema";

export const TIERS = [
  { tier: 1, rate: 12, description: "open data & polished, or very unique" },
  { tier: 2, rate: 10, description: "open data OR polished" },
  { tier: 3, rate: 8, description: "simple, no open data" },
];

export function GetTier(tier: number) {
  return TIERS.find((t) => t.tier === tier) ?? null;
}

export function CalculatePayout(hours: number, rate: number) {
  return Math.round(hours * rate);
}

export function GetPayoutForProject(projectId: number) {
  return (
    db.select().from(payouts).where(eq(payouts.projectId, projectId)).get() ??
    null
  );
}

export function GetAllPayouts() {
  return db.select().from(payouts).all();
}

export function GetLatestApproval(projectId: number) {
  const events = db
    .select()
    .from(reviewEvents)
    .where(
      and(
        eq(reviewEvents.projectId, projectId),
        eq(reviewEvents.type, "approved"),
      ),
    )
    .orderBy(desc(reviewEvents.createdAt), desc(reviewEvents.id))
    .all();

  for (const event of events) {
    const data = JSON.parse(event.jsonData || "{}");
    if (data.type !== "approval") continue;
    return {
      hours: typeof data.hoursApproved === "number" ? data.hoursApproved : null,
      note: (data.message as string | null) ?? null,
      reviewerSlackId: event.reviewAuthorSlackId,
      approvedAt: event.createdAt,
      data,
    };
  }
  return null;
}
