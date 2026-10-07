import type { APIRoute } from "astro";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { payouts, reviewEvents, users } from "../../../db/schema";
import { GetUserFromCookies } from "../../../utils/auth";
import { GetProjectFromId } from "../../../utils/projects";
import {
  CalculatePayout,
  GetPayoutForProject,
  GetTier,
} from "../../../utils/payouts";
import { PayoutDMBlocks, SendSlackBlocksToUser } from "../../../utils/slack";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await GetUserFromCookies(cookies);
  if (!admin) return redirect("/login");

  const formData = await request.formData();
  const projectId = formData.get("projectId") as string;
  const tier = GetTier(Number(formData.get("tier")));
  const hours = Number(formData.get("hours"));

  const fail = (message: string) => {
    cookies.set("flash_error", message, { path: "/", maxAge: 10 });
    return redirect(`/admin/payouts/${projectId}`);
  };

  const project = await GetProjectFromId(projectId || "");
  if (!project) return new Response("Project not found", { status: 404 });
  if (!project.approved) return fail("Project isn't approved");
  if (!tier) return fail("Invalid tier");
  if (!Number.isFinite(hours) || hours <= 0) return fail("Invalid hours");
  if (GetPayoutForProject(project.id)) return fail("Already paid out");

  const amount = CalculatePayout(hours, tier.rate);

  try {
    db.transaction((tx) => {
      // unique project_id makes a double submit fail here, before any balance change
      tx.insert(payouts)
        .values({
          projectId: project.id,
          recipientSlackId: project.authorSlackId,
          adminSlackId: admin.slackId,
          tier: tier.tier,
          hours,
          rate: tier.rate,
          amount,
        })
        .run();
      tx.update(users)
        .set({ balance: sql`${users.balance} + ${amount}` })
        .where(eq(users.slackId, project.authorSlackId))
        .run();
      tx.insert(reviewEvents)
        .values({
          projectId: project.id,
          reviewAuthorSlackId: admin.slackId,
          type: "approved",
          message: `You received ${amount} tracks! (tier ${tier.tier}, ${hours}h × ${tier.rate})`,
          jsonData: JSON.stringify({
            type: "payout",
            tier: tier.tier,
            hours,
            rate: tier.rate,
            amount,
          }),
        })
        .run();
    });
  } catch (error) {
    console.error(`Payout failed for project ${project.id}:`, error);
    return fail("Payout failed, was it already paid?");
  }

  // the payout is done at this point, a slack failure shouldn't undo or error it
  try {
    await SendSlackBlocksToUser(
      project.authorSlackId,
      PayoutDMBlocks({
        projectId: project.id,
        projectName: project.projectName,
        tier: tier.tier,
        hours,
        rate: tier.rate,
        amount,
      }),
      { unfurl: false },
    );
  } catch (error) {
    console.error(`Payout DM failed for project ${project.id}:`, error);
  }

  return redirect(`/admin/payouts/${project.id}`);
};
