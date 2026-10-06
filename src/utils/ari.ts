import { Ari, type AriShipStatus } from "@hackclub/ari";

let client: Ari | null = null;

function readEnv(name: string): string {
  return (
    (import.meta.env as Record<string, string | undefined>)[name] ??
    process.env[name] ??
    ""
  );
}

export function getAri(): Ari | null {
  const programId = readEnv("ARI_PROGRAM_ID");
  const signingSecret = readEnv("ARI_SIGNING_SECRET");
  if (!programId || !signingSecret) {
    console.warn(
      "Ari is not configured (missing ARI_PROGRAM_ID / ARI_SIGNING_SECRET), skipping.",
    );
    return null;
  }
  if (!client) {
    client = new Ari({ programId, signingSecret });
  }
  return client;
}

export function getAriWebhookSecret(): string {
  return readEnv("ARI_WEBHOOK_SECRET");
}

export async function getAriStatus(
  externalId: string,
): Promise<AriShipStatus | null> {
  const ari = getAri();
  if (!ari) return null;
  try {
    return await ari.ships.status({ external_id: externalId });
  } catch (error) {
    console.error(`Failed to fetch Ari status for ${externalId}:`, error);
    return null;
  }
}

export async function withdrawFromAri(project: {
  id: number;
  ariSubmissionId: string;
}): Promise<void> {
  if (!project.ariSubmissionId) return;
  const ari = getAri();
  if (!ari) return;
  try {
    await ari.ships.withdraw(String(project.id));
  } catch (error) {
    console.error(`Failed to withdraw project ${project.id} from Ari:`, error);
  }
}
