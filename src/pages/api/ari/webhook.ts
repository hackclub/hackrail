import type { APIRoute } from "astro";
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
  // rejected projects go back to unshipped so the maker can edit & resubmit
  await db
    .update(projects)
    .set({ shipped: !rejected, approved, rejected })
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
        "Your project was approved! We'll pick its tier and send your payout very soon.",
        event.review.reviewer?.slack_id ?? null,
        {
          type: "approval",
          hoursApproved: event.review.approved_hours,
          message: event.review.note_to_maker ?? null,
        },
      );
      break;
    case "review.rejected":
      await applyDecision(project.id, false, true);
      await addTimeline(
        project.id,
        "rejected",
        "Your project was rejected.",
        event.review.reviewer?.slack_id ?? null,
        {
          type: "rejection",
          message: event.review.note_to_maker ?? null,
        },
      );
      break;
    case "review.changes":
      await applyDecision(project.id, false, true);
      await addTimeline(
        project.id,
        "warning",
        "Your project was rejected with changes requested.",
        event.review.reviewer?.slack_id ?? null,
        {
          type: "changes_requested",
          message: event.review.note_to_maker ?? null,
        },
      );
      break;
    case "review.reverted":
    case "review.requeued":
      await applyDecision(project.id, false, false);
      await addTimeline(
        project.id,
        "information",
        "Your project was reverted to pending review.",
        event.review.reviewer?.slack_id ?? null,
        {
          type: "reverted",
          message: event.review.note_to_maker ?? null,
        },
      );
      break;
    case "review.fraud":
      // passed checks are routine, only tell the maker when it failed
      if (event.fraud.verdict !== "failed") break;
      await addTimeline(
        project.id,
        "warning",
        "Your project was flagged for fraud.",
        event.review.reviewer?.slack_id ?? null,
        {
          type: "fraud",
          message: event.review.note_to_maker ?? null,
        },
      );
      break;
    case "ship.updated":
      // reviewer edits to the ship, we don't use these
      break;
    default: {
      const unhandled: never = event;
      console.warn("Unhandled Ari event:", unhandled);
      break;
    }
  }
}

const ariWebhookHandler = Ari.webhooks.createHandler({
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

export const POST: APIRoute = async (context) => {
  return ariWebhookHandler(context.request);
};
