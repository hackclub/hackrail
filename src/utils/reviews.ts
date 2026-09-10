import { db } from "../db";
import { reviews, type Review } from "../db/schema";
import { eq } from "drizzle-orm";

export function GetReviewsForProject(
  projectId: number,
): Promise<Review[] | null> {
  const result = db
    .select()
    .from(reviews)
    .where(eq(reviews.projectId, projectId))
    .all();

  return Promise.resolve(result);
}
