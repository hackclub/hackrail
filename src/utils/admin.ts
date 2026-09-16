import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, projects } from "../db/schema";

export function GetAllUsers() {
  return db.select().from(users).all();
}

export function GetAllProjects() {
  return db.select().from(projects).all();
}

export async function UnlinkHackatimeForUser(slackId: string) {
  return db
    .update(users)
    .set({ hackatimeLinked: false, hackatimeToken: "" })
    .where(eq(users.slackId, slackId))
    .run();
}

export function GetUserFromSlackId(slackId: string) {
  return db.select().from(users).where(eq(users.slackId, slackId)).get();
}

export async function UpdateUserBalance(slackId: string, newBalance: number) {
  return db
    .update(users)
    .set({ balance: newBalance })
    .where(eq(users.slackId, slackId))
    .run();
}
