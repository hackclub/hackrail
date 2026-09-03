import { defineMiddleware } from "astro:middleware";
import { ValidateToken } from "./utils/auth";

const ADMIN_USERS = ["U05MKEZUY67"];

const PROTECTED_ROUTES: Record<string, "auth" | "admin"> = {
  "/admin": "admin",
  "/api/admin": "admin",
  "/station": "auth",
};

const EXEMPTED_ROUTES = ["/station/project/"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const level = Object.entries(PROTECTED_ROUTES).find(([prefix]) =>
    pathname.startsWith(prefix),
  )?.[1];

  if (!level) return next();

  const isExempted = EXEMPTED_ROUTES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isExempted) return next();

  const token = context.cookies.get("hackrail_token")?.value;

  if (!token) {
    return context.redirect("/401");
  }

  const verificationResponse = await ValidateToken(token);

  if (!verificationResponse?.ok) {
    return context.redirect("/403");
  }

  if (level === "admin" && !isAdmin(verificationResponse.value.slackId)) {
    return context.redirect("/403");
  }

  return next();
});

export function isAdmin(slackId: string): boolean {
  return ADMIN_USERS.includes(slackId);
}
