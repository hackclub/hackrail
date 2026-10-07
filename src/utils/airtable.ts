import { eq } from "drizzle-orm";
import type { AriReviewJustification } from "@hackclub/ari";
import { db } from "../db";
import { projects } from "../db/schema";
import { GetUserFromSlackId } from "./admin";
import { GetLatestApproval } from "./payouts";
import { GetProjectFromId } from "./projects";

const FIELDS = {
  codeUrl: "fldjB3jcdbKdVxj1G",
  status: "flddl8vVmnZPzES2z",
  playableUrl: "fldus6xcNYr0GtBWq",
  firstName: "fldyoG4Vc4oRE1s0J",
  lastName: "fldpnbm8XUoOBHwr6",
  email: "fld68RamddGvHBkIz",
  screenshot: "fldiwB6KMyO0Mtduc",
  description: "fldgnXPXVQLjUkGKS",
  githubUsername: "fldgvKRgwhB4EpHgK",
  addressLine1: "fldmOFtZn5DFgLyGH",
  addressLine2: "fldCjGV5tqpgIe0wY",
  city: "fldyHFlCeHuKYnIpE",
  state: "fldp3lImdlyhyDXp5",
  country: "fldryCEKQQ6N315wF",
  zipCode: "fldzRW6IJXWVgxsLn",
  birthday: "fldI6GEqFsKP9ktJe",
  overrideHours: "fldUcZKXXc5FaK2rk",
  overrideHoursJustification: "fld2AKj7F8Wtku6Pg",
  hackatimeProjects: "fldLBEb2QIvSiWAbb",
  hackatimeId: "fld6DeCgjrXpFc8E9",
  lapseLinks: "fld33TMdp0eABVjzZ",
  technicalFeatures: "fldZAinTvW02zCcXw",
  deflation: "fld79vgK5iSXsl9Wf",
  alternateTracking: "fldyBcncBOJmnJ4kc",
  additional: "flduw7avCLNwiUpgd",
} as const;

function githubUsername(url: string) {
  return (
    url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)/i)?.[1] ?? null
  );
}

const orNull = (value: string | null | undefined) => value?.trim() || null;

const REQUIRED_FOR_UNIFIED: [keyof typeof FIELDS, string][] = [
  ["codeUrl", "Code URL"],
  ["playableUrl", "Playable URL"],
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["email", "Email"],
  ["screenshot", "Screenshot"],
  ["description", "Description"],
  ["addressLine1", "Address (Line 1)"],
  ["city", "City"],
  ["state", "State / Province"],
  ["country", "Country"],
  ["zipCode", "ZIP / Postal Code"],
  ["birthday", "Birthday"],
  ["overrideHours", "Override Hours Spent"],
  ["overrideHoursJustification", "Override Hours Spent Justification"],
];

async function BuildAirtableFields(projectId: number) {
  const project = await GetProjectFromId(String(projectId));
  if (!project) throw new Error(`Project ${projectId} not found`);
  if (!project.approved) throw new Error(`Project ${projectId} isn't approved`);

  const user = GetUserFromSlackId(project.authorSlackId);
  if (!user) throw new Error(`Author of project ${projectId} not found`);

  const approval = GetLatestApproval(project.id);
  const justification: AriReviewJustification =
    approval?.data.justification ?? {};

  const hackatimeNames = (() => {
    try {
      return (JSON.parse(project.hackatimeProjects) as string[]).join(", ");
    } catch {
      return "";
    }
  })();

  const fields: Record<string, unknown> = {
    [FIELDS.status]: "Accepted",
    [FIELDS.codeUrl]: orNull(project.projectCodeUrl),
    [FIELDS.playableUrl]: orNull(project.projectPlayableUrl),
    [FIELDS.firstName]: orNull(user.firstName),
    [FIELDS.lastName]: orNull(user.lastName),
    [FIELDS.email]: orNull(user.email),
    [FIELDS.screenshot]: project.projectScreenshot
      ? [{ url: project.projectScreenshot }]
      : [],
    [FIELDS.description]: orNull(project.projectDescription),
    [FIELDS.githubUsername]: githubUsername(project.projectCodeUrl),
    [FIELDS.addressLine1]: orNull(user.addressLine1),
    [FIELDS.addressLine2]: orNull(user.addressLine2),
    [FIELDS.city]: orNull(user.city),
    [FIELDS.state]: orNull(user.state),
    [FIELDS.country]: orNull(user.country),
    [FIELDS.zipCode]: orNull(user.zipCode),
    [FIELDS.birthday]: orNull(user.birthdate),
    [FIELDS.overrideHours]: approval?.hours ?? null,
    [FIELDS.overrideHoursJustification]: orNull(
      justification.hours_reasoning || approval?.data.auditNote,
    ),
    [FIELDS.hackatimeProjects]: orNull(
      justification.hackatime_projects || hackatimeNames,
    ),
    [FIELDS.hackatimeId]: orNull(justification.hackatime_user_id),
    [FIELDS.lapseLinks]: orNull(justification.lapse_links),
    [FIELDS.technicalFeatures]: orNull(justification.technical_features),
    [FIELDS.deflation]: orNull(justification.deflation_reason),
    [FIELDS.alternateTracking]: orNull(justification.time_evidence),
    [FIELDS.additional]: orNull(
      [
        justification.additional_justification,
        justification.supporting_evidence,
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
  };

  return { project, fields };
}

export async function GetMissingUnifiedFields(projectId: number) {
  const { fields } = await BuildAirtableFields(projectId);
  return REQUIRED_FOR_UNIFIED.filter(([key]) => {
    const value = fields[FIELDS[key]];
    return value == null || (Array.isArray(value) && value.length === 0);
  }).map(([, name]) => name);
}

export async function PushProjectToAirtable(projectId: number) {
  const token = import.meta.env.AIRTABLE_TOKEN;
  const baseId = import.meta.env.AIRTABLE_BASE_ID;
  const tableId = import.meta.env.AIRTABLE_TABLE_ID;
  if (!token || !baseId || !tableId) {
    throw new Error(
      "AIRTABLE_TOKEN, AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID must be set",
    );
  }

  const { project, fields } = await BuildAirtableFields(projectId);

  const recordUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
  const res = await fetch(
    project.airtableRecordId
      ? `${recordUrl}/${project.airtableRecordId}`
      : recordUrl,
    {
      method: project.airtableRecordId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, typecast: false }),
    },
  );

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Airtable ${res.status}: ${body?.error?.type ?? ""} ${body?.error?.message ?? JSON.stringify(body)}`,
    );
  }

  if (body.id && body.id !== project.airtableRecordId) {
    db.update(projects)
      .set({ airtableRecordId: body.id })
      .where(eq(projects.id, project.id))
      .run();
  }

  return body.id as string;
}
