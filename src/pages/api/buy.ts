import type { APIRoute } from "astro";
import { GetUserFromCookies } from "../../utils/auth";
import { getShopData } from "../../utils/shop";
import { upsertUser } from "../../utils/hackclub";
import { orders, type Order } from "../../db/schema";
import { db } from "../../db";
import {
  OrderBlocks,
  OrderDMBlocks,
  SendSlackBlocksToUser,
  SendSlackBlocksToHackrailChannel,
} from "../../utils/slack";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const user = await GetUserFromCookies(cookies);
  if (!user) return redirect("/login");

  const shopData = await getShopData();

  const formData = await request.formData();
  const itemId = formData.get("itemId") as string;
  const optionId = formData.get("optionId") as string;
  const quantity = parseInt((formData.get("quantity") as string) || "1", 10);

  if (!itemId || !optionId) {
    cookies.set("flash_error", "Item ID and Option ID are required", {
      path: "/",
    });
    return redirect("/station/shop");
  }

  var price = 0;
  if (
    !shopData.items.some((item) => {
      if (item.id === itemId) {
        const option = item.options.find((opt) => opt.id === optionId);
        if (option) {
          price = option.price;
          // check if theres a discount running
          if (shopData.discounts) {
            price =
              shopData.discounts.find(
                (discount) =>
                  discount["discount-parent-option-id"] === optionId,
              )?.["new-price"] || price;
          }
          return true;
        }
      }
      return false;
    })
  ) {
    cookies.set("flash_error", "Invalid item or option selected", {
      path: "/",
    });
    return redirect("/station/shop");
  }

  // now if it's stackable, check that a quantity has been provided & multiply the price
  var stackable =
    shopData.items.find((item) => item.id === itemId)?.stackable || false;

  if (stackable && quantity <= 0) {
    cookies.set("flash_error", "Quantity must be greater than 0", {
      path: "/",
    });
    return redirect("/station/shop");
  }

  const totalPrice = price * (stackable ? quantity : 1);

  if (user.balance < totalPrice) {
    cookies.set("flash_error", "Insufficient balance", {
      path: "/",
    });
    return redirect("/station/shop");
  }

  // deduct the total price from the user's balance
  user.balance -= totalPrice;

  // save the user back to the database
  await upsertUser(user);

  // save the order
  const order = {
    slackId: user.slackId,
    itemId,
    optionId,
    quantity: stackable ? quantity : 1,
    totalPrice,
    status: "processing",
    createdAt: new Date(),
  };

  const [inserted] = await db.insert(orders).values(order).returning();

  await SendSlackBlocksToHackrailChannel(await OrderBlocks(inserted));

  await SendSlackBlocksToUser(user.slackId, OrderDMBlocks(inserted));

  return redirect("/station/shop?success=true");
};
