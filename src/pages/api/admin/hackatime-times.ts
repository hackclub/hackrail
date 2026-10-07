import type { APIRoute } from "astro";
import { GetAllProjects, GetAllUsers } from "../../../utils/admin";
import { GetProjectTimes } from "../../../utils/hackatime";

async function batchedFetch<T>(
  items: string[],
  fn: (item: string) => Promise<T>,
  batchSize = 10,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export const GET: APIRoute = async () => {
  const users = GetAllUsers();
  const projects = GetAllProjects();

  const projectsByAuthor = new Map<string, typeof projects>();
  for (const p of projects) {
    const list = projectsByAuthor.get(p.authorSlackId);
    if (list) list.push(p);
    else projectsByAuthor.set(p.authorSlackId, [p]);
  }

  const candidates = users.filter(
    (u) => u.hackatimeLinked && projectsByAuthor.has(u.slackId),
  );

  const results = await batchedFetch(
    candidates.map((u) => u.slackId),
    (slackId) => GetProjectTimes(slackId, projectsByAuthor.get(slackId) ?? []),
    10,
  );

  const times: Record<number, number> = {};
  for (const projectTimes of results) {
    for (const [id, time] of projectTimes) times[id] = time.total;
  }

  const totalSeconds = Object.values(times).reduce((a, b) => a + b, 0);
  return new Response(JSON.stringify({ times, totalSeconds }), {
    headers: { "Content-Type": "application/json" },
  });
};
