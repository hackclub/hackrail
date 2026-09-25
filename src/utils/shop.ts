// google sheet parser, entirely written by ai (now edited by me too :3)

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
  category?: string;
}

export interface SheetOption {
  id: string;
  parentId: string;
  name: string;
  price: number;
}

export interface SheetDiscount {
  discountParentOptionId: string;
  discountPercentage: string; // only used to display
  discountNewPrice: number; // used to calculate the new price
  discountEnd: string;
}

export interface SheetShopData {
  items: SheetItem[];
  options: SheetOption[];
  discounts?: SheetDiscount[];
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
  category?: string;
}

export interface ShopDiscount {
  "discount-parent-option-id": string;
  percentage: string;
  "new-price": number;
  end: string;
}

export type ShopData = {
  items: ShopItem[];
  discounts?: ShopDiscount[];
};

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
  const itemCategoryIdx = col("category");
  const imageIdx = col("image");
  const stackableIdx = col("stackable");
  const featuredIdx = col("featured");
  const optionIdIdx = col("option id");
  const optionParentIdIdx = col("option-parent-id");
  const optionNameIdx = col("option-name");
  const optionPriceIdx = col("option-price");

  const discountParentOptionIdIdx = col("discount-option-id");
  const discountPercentageIdx = col("discount-percentage");
  const discountNewPriceIdx = col("discount-new-price");
  const discountEndIdx = col("discount-end");

  const items: SheetItem[] = [];
  const options: SheetOption[] = [];
  const discounts: SheetDiscount[] = [];

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
        category: (r[itemCategoryIdx] ?? "").trim() || undefined,
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

    const discountParentOptionId = (r[discountParentOptionIdIdx] ?? "").trim();
    if (discountParentOptionId) {
      discounts.push({
        discountParentOptionId,
        discountPercentage: (r[discountPercentageIdx] ?? "").trim(),
        discountNewPrice:
          parseInt((r[discountNewPriceIdx] ?? "").trim(), 10) || 0,
        discountEnd: (r[discountEndIdx] ?? "").trim(),
      });
    }
  }

  return {
    items,
    options,
    discounts: discounts.length > 0 ? discounts : undefined,
  };
}

export function sheetToShopData(data: SheetShopData): ShopData {
  const optionsByParent = new Map<string, SheetOption[]>();
  for (const opt of data.options) {
    const key = normalizeId(opt.parentId);
    const list = optionsByParent.get(key) ?? [];
    list.push(opt);
    optionsByParent.set(key, list);
  }

  const items: ShopItem[] = data.items.flatMap((item) => {
    const key = normalizeId(item.id);
    const opts = (optionsByParent.get(key) ?? []).map((opt) => ({
      id: opt.id,
      name: opt.name,
      price: opt.price,
    }));

    if (opts.length === 0) return [];

    return [
      {
        id: item.id,
        image: item.image,
        name: item.name,
        description: item.description,
        "extended-description": item.extendedDescription,
        stackable: item.stackable,
        options: opts,
        featured: item.featured,
      },
    ];
  });

  const discounts: ShopDiscount[] | undefined = data.discounts?.map((d) => ({
    "discount-parent-option-id": d.discountParentOptionId,
    percentage: d.discountPercentage,
    "new-price": d.discountNewPrice,
    end: ParseGoogleSheetsDateTime(d.discountEnd)?.toString() ?? d.discountEnd,
  }));

  return {
    items,
    discounts,
  };
}

export async function syncShopFromSheets(): Promise<ShopData> {
  const data = sheetToShopData(await fetchSheetData());
  await mkdir(dirname(SHOP_JSON_PATH), { recursive: true });
  await writeFile(
    SHOP_JSON_PATH,
    JSON.stringify(data, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `[shop] updated ${data.items.length} items and ${data.discounts?.length ?? 0} discounts from sheets`,
  );
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

export function ParseGoogleSheetsDateTime(dateStr: string): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const parts = dateStr
    .trim()
    .split(/[- :\/]/)
    .filter(Boolean);

  if (parts.length >= 3) {
    const numbers = parts.map(Number);
    if (numbers.some(isNaN)) return null;

    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      [year, month, day] = numbers;
    } else {
      [month, day, year] = numbers;
    }

    const hour = numbers[3] ?? 0;
    const minute = numbers[4] ?? 0;
    const second = numbers[5] ?? 0;

    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);

    return isNaN(utcTimestamp) ? null : utcTimestamp;
  }

  return null;
}
