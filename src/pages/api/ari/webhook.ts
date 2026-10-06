import { Ari, type AriWebhookEvent } from "@hackclub/ari";
import { db } from "../../../db";
import {
  ariDeliveries,
  projects,
  reviewEvents,
  reviews,
} from "../../../db/schema";
import { GetProjectFromId } from "../../../utils/projects";
import { getAriWebhookSecret } from "../../../utils/ari";
import { eq } from "drizzle-orm";

async function addTimeline(
  projectId: number,
  type: string,
  message: string,
  reviewAuthorSlackId: string | null,
  extra: Record<string, unknown> = {},
) {
  await db.insert(reviewEvents).values({
    projectId,
    reviewAuthorSlackId,
    type,
    message,
    jsonData: JSON.stringify({ source: "ari", ...extra }),
  });
}

async function applyDecision(
  projectId: number,
  approved: boolean,
  rejected: boolean,
) {
  await db
    .update(projects)
    .set({ shipped: true, approved, rejected })
    .where(eq(projects.id, projectId));
  if (approved || rejected) {
    await db
      .update(reviews)
      .set({ done: true })
      .where(eq(reviews.projectId, projectId));
  }
}

async function handleReviewEvent(event: AriWebhookEvent) {
  if (event.event === "unknown") {
    console.warn("Unknown Ari event, acking:", event.event_name);
    return;
  }

  const project = await GetProjectFromId(event.external_id);
  if (!project) {
    // project doesn't exist mmmh
    console.warn(`Ari event for unknown project ${event.external_id}, acking.`);
    return;
  }

  // update the ariSubmissionId if it changed
  if (event.id && event.id !== project.ariSubmissionId) {
    await db
      .update(projects)
      .set({ ariSubmissionId: event.id })
      .where(eq(projects.id, project.id));
  }

  switch (event.event) {
    case "review.approved":
      await applyDecision(project.id, true, false);
      await addTimeline(
        project.id,
        "approved",
        "Your project was approved! Note from the reviewer: " +
          event.review.note_to_maker || "Your project was approved!",
        event.review.reviewer?.slack_id ?? null,
        { decision: event.decision },
      );
      break;
    case "review.rejected":
      await applyDecision(project.id, false, true);
      await addTimeline(
        project.id,
        "rejected",
        "Your project was rejected :( Why? : " + event.review.note_to_maker ||
          "Your project was rejected but no reason was given.",
        event.review.reviewer?.slack_id ?? null,
        { decision: event.decision },
      );
      break;
    case "review.changes":
      await applyDecision(project.id, false, true);
      await addTimeline(
        project.id,
        "warning",
        "Your project wasn't rejected but we need you to do some changes... Here's the reviewer notes: " +
          event.review.note_to_maker ||
          "Your project wasn't rejected but we need you to do some changes... No changes were provided",
        event.review.reviewer?.slack_id ?? null,
        { decision: event.decision },
      );
      break;
    case "review.reverted":
    case "review.requeued":
      await applyDecision(project.id, false, false);
      await addTimeline(
        project.id,
        "information",
        event.event === "review.requeued"
          ? "Review result removed, project is back in the queue."
          : "Review result reverted.",
        event.review.reviewer?.slack_id ?? null,
        { decision: event.decision },
      );
      break;
    case "review.fraud":
      await addTimeline(
        project.id,
        "information",
        `Fraud check ${event.fraud.verdict}.` +
          (event.fraud.checks[0]?.justification
            ? ` ${event.fraud.checks[0].justification}`
            : ""),
        null,
        { verdict: event.fraud.verdict },
      );
      break;
    case "ship.updated":
      await addTimeline(
        project.id,
        "information",
        `Reviewer edited: ${event.changes.map((c) => c.field).join(", ")}.`,
        event.edited_by?.slack_id ?? null,
        { changes: event.changes },
      );
      break;
  }
}

export const POST = Ari.webhooks.createHandler({
  secret: getAriWebhookSecret(),
  async on_event(event, context) {
    const seen = db
      .select()
      .from(ariDeliveries)
      .where(eq(ariDeliveries.deliveryId, context.delivery_id))
      .get();
    if (seen) return;

    await handleReviewEvent(event);

    db.insert(ariDeliveries).values({ deliveryId: context.delivery_id }).run();
  },
});
