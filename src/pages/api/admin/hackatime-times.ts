import type { APIRoute } from "astro";
import { GetAllProjects, GetAllUsers } from "../../../utils/admin";
import { GetHackatimeProjects } from "../../../utils/hackatime";

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

function parseHackatimeNames(raw: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed))
      return new Set(parsed.filter((n) => typeof n === "string"));
  } catch {
    // no projects
  }
  return new Set();
}

export const GET: APIRoute = async () => {
  const users = GetAllUsers();
  const projects = GetAllProjects();

  const projectsByAuthor = new Map<string, { id: number }[]>();
  const namesByProject = new Map<number, Set<string>>();
  for (const p of projects) {
    namesByProject.set(p.id, parseHackatimeNames(p.hackatimeProjects));
    const list = projectsByAuthor.get(p.authorSlackId);
    if (list) list.push(p);
    else projectsByAuthor.set(p.authorSlackId, [p]);
  }

  const candidates = users.filter(
    (u) => u.hackatimeLinked && projectsByAuthor.has(u.slackId),
  );

  const results = await batchedFetch(
    candidates.map((u) => u.slackId),
    (slackId) => GetHackatimeProjects(slackId),
    10,
  );

  const times: Record<number, number> = {};
  for (let i = 0; i < candidates.length; i++) {
    const data = results[i];
    const hackProjects = data.ok ? (data.projects ?? []) : [];
    const secondsByName = new Map(
      hackProjects.map((h) => [h.name, h.total_seconds ?? 0]),
    );
    for (const p of projectsByAuthor.get(candidates[i].slackId) ?? []) {
      let total = 0;
      for (const name of namesByProject.get(p.id) ?? []) {
        total += secondsByName.get(name) ?? 0;
      }
      times[p.id] = total;
    }
  }

  const totalSeconds = Object.values(times).reduce((a, b) => a + b, 0);
  return new Response(JSON.stringify({ times, totalSeconds }), {
    headers: { "Content-Type": "application/json" },
  });
};
