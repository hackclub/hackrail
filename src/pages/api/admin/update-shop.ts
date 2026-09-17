import type { APIRoute } from "astro";
import { syncShopFromSheets } from "../../../utils/shop";

export const POST: APIRoute = async ({ redirect }) => {
  await syncShopFromSheets();
  return redirect("/admin");
};

export const GET: APIRoute = async ({ redirect }) => {
  await syncShopFromSheets();
  return redirect("/admin");
};
