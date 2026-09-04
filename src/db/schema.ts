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
  balance: integer("balance").notNull().default(0),

  // hackatime
  hackatimeLinked: integer("is_hackatime_linked").notNull().default(0),
  hackatimeToken: text("hackatime_token").notNull().default(""),

  // state
  avatar: text("avatar").notNull(), // only used on website
  banned: integer("banned").notNull().default(0),
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
  shipped: integer("shipped").notNull().default(0),
  rejected: integer("rejected").notNull().default(0),
  approved: integer("approved").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),

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
  quantity: real("quantity").notNull(), // can be fractional for some items
  totalPrice: real("total_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  reviewerSlackId: text("reviewer_slack_id").notNull(),
  status: text("status").notNull(), // "approved", "rejected", "pending"
  overrideHoursSpent: integer("override_hours_spent").notNull().default(0),
  overrideHoursSpentReason: text("override_hours_spent_reason")
    .notNull()
    .default(""),
  statusMessages: text("status_message").notNull().default(""),
  // array of status update with timestamps, stored as JSON string
  // exemple : [{"message": "ai looking at it", "timestamp": 1633024800}, {"message": "position 10 in the queue", "timestamp": 1633024800}]
  // TODO: actually use it
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Order = typeof orders.$inferSelect;
