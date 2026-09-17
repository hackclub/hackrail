import { syncShopFromSheets } from "./utils/shop";

let initialized = false;

export function initializeShop() {
  if (initialized) return;
  initialized = true;
  void syncShopFromSheets()
}

initializeShop();
