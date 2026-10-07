import type { APIRoute } from "astro";
import { PushProjectToAirtable } from "../../../utils/airtable";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const projectId = Number(formData.get("projectId"));

  try {
    await PushProjectToAirtable(projectId);
  } catch (error) {
    console.error(`Airtable sync failed for project ${projectId}:`, error);
    cookies.set(
      "flash_error",
      `Airtable sync failed for project ${projectId}: ${(error as Error).message}`,
      { path: "/", maxAge: 10 },
    );
  }

  return redirect(`/admin/project/${projectId}`);
};
