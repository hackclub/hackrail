import { db } from "../db";
import { reviewEvents, type Review } from "../db/schema";
import { eq } from "drizzle-orm";

export function GetReviewsForProject(
  projectId: number,
): Promise<Review[] | null> {
  const result = db
    .select()
    .from(reviewEvents)
    .where(eq(reviewEvents.projectId, projectId))
    .all();

  return Promise.resolve(result);
}
