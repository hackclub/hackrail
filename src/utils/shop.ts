// google sheet parser, entirely written by ai

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SHOP_JSON_PATH = resolve(process.cwd(), "shop.json");

const ITEM_HEADER = "item-id";

export interface SheetItem {
  id: string;
  name: string;
  description: string;
  extendedDescription: string;
  image: string;
  stackable: boolean;
  featured: boolean;
}

export interface SheetOption {
  id: string;
  parentId: string;
  name: string;
  price: number;
}

export interface SheetShopData {
  items: SheetItem[];
  options: SheetOption[];
}

export interface ShopOption {
  id: string;
  name: string;
  price: number;
}

export interface ShopItem {
  id: string;
  image: string;
  name: string;
  description: string;
  "extended-description": string;
  stackable: boolean;
  options: ShopOption[];
  featured: boolean;
}

export type ShopData = ShopItem[];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1+/g, "$1");
}

async function fetchSheetCsv(): Promise<string> {
  const sheetsUrl = import.meta.env.SHEETS ?? process.env.SHEETS;
  if (!sheetsUrl) {
    throw new Error("SHEETS env var is not set");
  }

  const url = new URL(sheetsUrl);
  url.pathname = url.pathname.replace(/\/$/, "") + "/export";
  url.search = "?format=csv";

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function fetchSheetData(): Promise<SheetShopData> {
  const csv = await fetchSheetCsv();
  const rows = parseCsv(csv);

  const headerIdx = rows.findIndex((r) => r[0]?.trim() === ITEM_HEADER);
  if (headerIdx === -1) {
    throw new Error("Could not find the items table in the sheet");
  }

  const header = rows[headerIdx];
  const col = (name: string) => header.findIndex((h) => h.trim() === name);

  const itemIdIdx = col("item-id");
  const itemNameIdx = col("item-name");
  const itemDescriptionIdx = col("item-description");
  const itemExtendedDescriptionIdx = col("item-extended-description");
  const imageIdx = col("image");
  const stackableIdx = col("stackable");
  const featuredIdx = col("featured");
  const optionIdIdx = col("option id");
  const optionParentIdIdx = col("option-parent-id");
  const optionNameIdx = col("option-name");
  const optionPriceIdx = col("option-price");

  const items: SheetItem[] = [];
  const options: SheetOption[] = [];

  for (const r of rows.slice(headerIdx + 1)) {
    if (r.every((cell) => !cell?.trim())) break;

    const itemId = (r[itemIdIdx] ?? "").trim();
    const itemName = (r[itemNameIdx] ?? "").trim();
    if (itemId || itemName) {
      items.push({
        id: itemId || slugify(itemName),
        name: itemName,
        description: (r[itemDescriptionIdx] ?? "").trim(),
        extendedDescription: (r[itemExtendedDescriptionIdx] ?? "").trim(),
        image: (r[imageIdx] ?? "").trim(),
        stackable: (r[stackableIdx] ?? "").trim() === "TRUE",
        featured: (r[featuredIdx] ?? "").trim() === "TRUE",
      });
    }

    const optionId = (r[optionIdIdx] ?? "").trim();
    if (optionId) {
      options.push({
        id: optionId,
        parentId: (r[optionParentIdIdx] ?? "").trim(),
        name: (r[optionNameIdx] ?? "").trim(),
        price: parseInt((r[optionPriceIdx] ?? "").trim(), 10) || 0,
      });
    }
  }

  return { items, options };
}

export function sheetToShopData(data: SheetShopData): ShopData {
  const optionsByParent = new Map<string, SheetOption[]>();
  for (const opt of data.options) {
    const key = normalizeId(opt.parentId);
    const list = optionsByParent.get(key) ?? [];
    list.push(opt);
    optionsByParent.set(key, list);
  }

  const items: ShopData = data.items.map((item) => {
    const key = normalizeId(item.id);
    const opts = (optionsByParent.get(key) ?? []).map((opt) => ({
      id: opt.id,
      name: opt.name,
      price: opt.price,
    }));

    return {
      id: item.id,
      image: item.image,
      name: item.name,
      description: item.description,
      "extended-description": item.extendedDescription,
      stackable: item.stackable,
      options: opts,
      featured: item.featured,
    };
  });

  return items;
}

export async function syncShopFromSheets(): Promise<ShopData> {
  const data = sheetToShopData(await fetchSheetData());
  await mkdir(dirname(SHOP_JSON_PATH), { recursive: true });
  await writeFile(SHOP_JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`[shop] updated ${data.length} items!`);
  return data;
}

export async function getShopData(): Promise<ShopData> {
  try {
    const text = await readFile(SHOP_JSON_PATH, "utf-8");
    return JSON.parse(text) as ShopData;
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") {
      await syncShopFromSheets();
      const text = await readFile(SHOP_JSON_PATH, "utf-8");
      return JSON.parse(text) as ShopData;
    }
    throw err;
  }
}
