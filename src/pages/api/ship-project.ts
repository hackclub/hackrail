import type { APIRoute } from "astro";
import { GetUserFromCookies } from "../../utils/auth";
import { db } from "../../db";
import { projects, reviewEvents, reviews } from "../../db/schema";
import { GetProjectFromId } from "../../utils/projects";
import { getAri } from "../../utils/ari";
import { AriApiError, AriInputError } from "@hackclub/ari";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const user = await GetUserFromCookies(cookies);
  if (!user) return redirect("/login");

  const formData = await request.formData();
  const projectId = formData.get("projectId") as string;
  if (!projectId)
    return new Response("Project ID is required", { status: 400 });

  // check that the user is the author of the project
  const project = await GetProjectFromId(projectId);
  if (!project) return new Response("Project not found", { status: 404 });
  if (project.authorSlackId !== user.slackId)
    return new Response("You are not the author of this project", {
      status: 403,
    });

  // check if project isnt alr shipped or approved

  if (project.shipped || project.approved) {
    return new Response("What are u trying to do,,,", { status: 400 });
  }

  // mark the project as shipped
  await db
    .update(projects)
    .set({ shipped: true })
    .where(eq(projects.id, Number(projectId)));

  // create a review event
  await db.insert(reviewEvents).values({
    projectId: Number(projectId),
    reviewAuthorSlackId: null,
    type: "information",
    message: "Project shipped!",
    jsonData: "{}",
  });

  // add it to the review table

  await db.insert(reviews).values({
    projectId: Number(projectId),
    done: false,
  });

  // submit to ari (reships are new submissions, same external_id).
  const ari = getAri();
  if (ari) {
    const isReship = formData.get("reship") === "true";
    try {
      const result = await ari.ships.create({
        external_id: String(project.id),
        title: project.projectName,
        description: project.projectDescription,
        maker: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          slack_id: user.slackId,
        },
        repo_url: project.projectCodeUrl,
        demo_url: project.projectPlayableUrl,
        thumbnail_url: project.projectScreenshot || "",
        hackatime_projects: JSON.parse(project.hackatimeProjects),
        shipped_at: new Date(),
        ...(isReship
          ? { is_update: true, update_message: "Resubmitted after rejection" }
          : {}),
      });
      await db
        .update(projects)
        .set({ ariSubmissionId: result.id })
        .where(eq(projects.id, Number(projectId)));
    } catch (error) {
      if (error instanceof AriInputError) {
        console.error(
          `Ari rejected project ${projectId}:`,
          error.field,
          error.message,
        );
      } else if (error instanceof AriApiError) {
        console.error(
          `Ari API error for project ${projectId}:`,
          error.status,
          error.code,
        );
      } else {
        console.error(`Failed to submit project ${projectId} to Ari:`, error);
      }
    }
  }

  return redirect("/station/project/" + projectId);
};
