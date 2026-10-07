import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects, type Project } from "../db/schema";

export async function GetProjectFromId(id: string): Promise<Project | null> {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;

  if (isNaN(numericId)) return null;

  const result = db
    .select()
    .from(projects)
    .where(eq(projects.id, numericId))
    .get();

  return result ?? null;
}

export type ProjectStatus = "approved" | "rejected" | "in review" | "unshipped";

export function GetProjectStatus(project: Project): ProjectStatus {
  if (project.approved) return "approved";
  if (project.rejected) return "rejected";
  if (project.shipped) return "in review";
  return "unshipped";
}

// nice urls
export function SafeUrl(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}
