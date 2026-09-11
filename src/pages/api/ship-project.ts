import type { APIRoute } from "astro";
import { GetUserFromCookies } from "../../utils/auth";
import { db } from "../../db";
import { projects, reviewEvents, reviews } from "../../db/schema";
import { GetProjectFromId } from "../../utils/projects";
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

  return redirect("/station/project/" + projectId);
};
