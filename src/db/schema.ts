import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  slackId: text("slack_id").primaryKey(),

  // pii yay
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull(),
  birthdate: text("birthdate").notNull(),
  // from hack club auth, refreshed on every login
  verificationStatus: text("verification_status").notNull().default(""),
  yswsEligible: integer("ysws_eligible", { mode: "boolean" })
    .notNull()
    .default(false),
  balance: integer("balance").notNull().default(0),

  // hackatime
  hackatimeLinked: integer("is_hackatime_linked", { mode: "boolean" })
    .notNull()
    .default(false),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  hackatimeToken: text("hackatime_token").notNull().default(""),

  // state
  avatar: text("avatar").notNull(), // only used on website
  note: text("note").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // author
  authorSlackId: text("author_slack_id")
    .notNull()
    .references(() => users.slackId, { onDelete: "cascade" }),

  // project details
  projectName: text("project_name").notNull(),
  projectScreenshot: text("image").default(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Den_Haag_Hollands_Spoor.jpg/3840px-Den_Haag_Hollands_Spoor.jpg",
  ),
  projectCodeUrl: text("project_code_url").notNull(),
  projectPlayableUrl: text("project_playable_url").notNull().default(""),
  projectDescription: text("project_description").notNull(),

  // project state
  hackatimeProjects: text("hackatime_projects").notNull(),
  shipped: integer("shipped", { mode: "boolean" }).notNull().default(false),
  rejected: integer("rejected", { mode: "boolean" }).notNull().default(false),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),

  // this is for project updates
  updateStartedAt: integer("update_started_at", { mode: "timestamp" }),
  updateDescription: text("update_description").notNull().default(""),

  // ari (latest submission id, "" when never submitted)
  ariSubmissionId: text("ari_submission_id").notNull().default(""),

  // record in the hackrail airtable
  airtableRecordId: text("airtable_record_id").notNull().default(""),

  // review
  overrideHoursSpent: integer("override_hours_spent").notNull().default(0),
  overrideHoursSpentReason: text("override_hours_spent_reason")
    .notNull()
    .default(""),
});

export const tokens = sqliteTable("tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slackId: text("slack_id")
    .notNull()
    .references(() => users.slackId, { onDelete: "cascade" }),
  token: text("token").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slackId: text("slack_id")
    .notNull()
    .references(() => users.slackId, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  optionId: text("option_id").notNull(),
  quantity: real("quantity").notNull(), // can be fractional for some items, 1 or multiple if stackable
  totalPrice: real("total_price").notNull(),
  status: text("status").notNull().default("processing"), // processing, error, shipped
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reviewEvents = sqliteTable("review_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  reviewAuthorSlackId: text("reviewer_slack_id"),
  type: text("status").notNull(), // "approved", "rejected", "pending", "information"
  message: text("status_message").notNull().default(""),
  jsonData: text("json_data").notNull().default("{}"), // for any extra data we want to store, ex hours approved & reason
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const payouts = sqliteTable("payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // unique so a project can only ever be paid out once
  projectId: integer("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  recipientSlackId: text("recipient_slack_id")
    .notNull()
    .references(() => users.slackId, { onDelete: "cascade" }),
  adminSlackId: text("admin_slack_id").notNull(),
  tier: integer("tier").notNull(),
  hours: real("hours").notNull(),
  rate: integer("rate").notNull(), // tracks per hour at the time of payout
  amount: integer("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const ariDeliveries = sqliteTable("ari_deliveries", {
  deliveryId: text("delivery_id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviewEvents.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
