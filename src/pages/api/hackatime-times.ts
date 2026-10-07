import type { APIRoute } from "astro";
import { GetUserFromCookies } from "../../utils/auth";
import { GetHackatimeProjects, PROGRAM_START } from "../../utils/hackatime";

// used for real time visualisation of time based on update time
export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await GetUserFromCookies(cookies);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const sinceRaw = url.searchParams.get("since") || "";
  let since = PROGRAM_START;
  if (/^\d{4}-\d{2}-\d{2}$/.test(sinceRaw)) {
    const parsed = new Date(`${sinceRaw}T00:00:00Z`);
    if (!isNaN(parsed.getTime()) && parsed > PROGRAM_START) since = parsed;
  }

  const data = await GetHackatimeProjects(user.slackId, since);
  if (!data.ok || !data.projects) {
    return new Response("Failed to fetch hackatime projects", { status: 502 });
  }

  const times = Object.fromEntries(
    data.projects.map((p) => [p.name, p.total_seconds || 0]),
  );
  return new Response(JSON.stringify({ times }), {
    headers: { "Content-Type": "application/json" },
  });
};
