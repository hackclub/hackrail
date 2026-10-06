import type { APIRoute } from "astro";
import { db } from "../../../db";
import { projects } from "../../../db/schema";
import { withdrawFromAri } from "../../../utils/ari";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("projectId"));
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (project) await withdrawFromAri(project);

  db.delete(projects).where(eq(projects.id, projectId)).run();

  return new Response("Project deleted", { status: 200 });
};
