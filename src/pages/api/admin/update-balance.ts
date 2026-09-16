import type { APIRoute } from "astro";
import { UpdateUserBalance } from "../../../utils/admin";

export const POST: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const formData = await request.formData();
  const slackId = formData.get("slackId") as string;
  const newBalance = parseInt(formData.get("balance") as string, 10);

  if (!slackId || isNaN(newBalance)) {
    return new Response("Missing slackId or newBalance", { status: 400 });
  }

  await UpdateUserBalance(slackId, newBalance);
  return redirect("/admin/user/" + slackId);
};
