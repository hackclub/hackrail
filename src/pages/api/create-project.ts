import type { APIRoute } from "astro";
import { GetUserFromCookies } from "../../utils/auth";
import { db } from "../../db";
import { projects } from "../../db/schema";
import { CompressImage, UploadImageToCDN } from "../../utils/cdn";
import { GetHackatimeProjects } from "../../utils/hackatime";
import { GetProjectFromId } from "../../utils/projects";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const user = await GetUserFromCookies(cookies);
  if (!user) return redirect("/login");

  const formData = await request.formData();
  const id = (formData.get("id") as string) || "";
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const githubUrl = formData.get("githubUrl") as string;
  const hackatimeProjects = formData.get("hackatimeProjects") as string;
  const playableUrl = (formData.get("playableUrl") ??
    formData.get("liveUrl") ??
    "") as string;

  const isEdit = id !== "";

  let existing = null;
  if (isEdit) {
    existing = await GetProjectFromId(id);
    if (!existing || existing.authorSlackId !== user.slackId) {
      return redirect("/station/home");
    }
  }

  const backTo = isEdit
    ? `/station/project/${id}/edit`
    : "/station/projects/create";

  if (
    name.length > 200 ||
    description.length > 500 ||
    hackatimeProjects.length > 20
  ) {
    return redirect(backTo);
  }

  // check that hackatime projects are legit
  let hackatimeProjectNames: string[] = [];
  try {
    hackatimeProjectNames = JSON.parse(hackatimeProjects);
  } catch {
    return redirect(backTo);
  }

  if (!Array.isArray(hackatimeProjectNames)) {
    return redirect(backTo);
  }

  var hackatimeData = await GetHackatimeProjects(user.slackId);
  if (!hackatimeData.ok || !hackatimeData.projects) {
    return redirect(backTo);
  }

  for (const projectName of hackatimeProjectNames) {
    // check if project name is in hackatimeData.projects
    if (!hackatimeData.projects.some((p) => p.name === projectName)) {
      return redirect(backTo);
    }
  }

  const image = formData.get("image") as File | null;
  var imageUrl: string | null = existing?.projectScreenshot || null;

  if (image && image.size > 0) {
    try {
      const compressedBuffer = await CompressImage(image, 1920);
      imageUrl = await UploadImageToCDN(compressedBuffer, image.name);
    } catch (error) {
      console.error("Error uploading image:", error);
      return redirect(`/error?message=${error}`);
    }
  }

  if (!name || !description || !githubUrl || !hackatimeProjects) {
    return redirect(backTo);
  }

  const values = {
    projectName: name,
    projectDescription: description,
    projectCodeUrl: githubUrl,
    projectPlayableUrl: playableUrl || "",
    hackatimeProjects: hackatimeProjects,
    projectScreenshot:
      imageUrl ||
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Den_Haag_Hollands_Spoor.jpg/3840px-Den_Haag_Hollands_Spoor.jpg",
  };

  if (isEdit) {
    if (!existing) return redirect("/station/home");

    db.update(projects).set(values).where(eq(projects.id, existing.id)).run();

    return redirect(`/station/project/${existing.id}`);
  }

  await db.insert(projects).values({
    ...values,
    authorSlackId: user.slackId,
    overrideHoursSpent: 0,
    overrideHoursSpentReason: "",
  });

  return redirect("/station/home");
};
