import type { Order } from "../db/schema";
import { getShopData } from "./shop";

export async function SendSlackBlocks(blocks: any[], channel: string) {
  return await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.SLACK_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      blocks,
    }),
  });
}

export function SendSlackBlocksToHackrailChannel(blocks: any[]) {
  return SendSlackBlocks(blocks, import.meta.env.SLACK_CHANNEL || "")
    .then(async (res) => {
      const body = await res.json();
      if (!body.ok) {
        console.error("[slack] postMessage failed:", body.error);
      }
      return body;
    })
    .catch((err) => console.error("[slack] postMessage error:", err));
}

export async function SendSlackBlocksToUser(userId: string, blocks: any[]) {
  const openRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.SLACK_TOKEN}`,
    },
    body: JSON.stringify({ users: userId }),
  });
  const openBody = await openRes.json();

  if (!openBody.ok) {
    console.error("[slack] conversations.open failed:", openBody.error);
    return openBody;
  }

  return SendSlackBlocks(blocks, openBody.channel.id)
    .then(async (res) => {
      const body = await res.json();
      if (!body.ok) {
        console.error("[slack] postMessage failed:", body.error);
      }
      return body;
    })
    .catch((err) => console.error("[slack] postMessage error:", err));
}

export async function OrderBlocks(order: Order): Promise<any[]> {
  const shopItems = await getShopData();
  const item = shopItems.items.find((i) => i.id === order.itemId);
  const imageUrl = item ? item.image : undefined;

  const accessory = imageUrl
    ? { type: "image", image_url: imageUrl, alt_text: item!.name }
    : undefined;

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New order!*`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Order ID:*\n${order.id}`,
        },
        {
          type: "mrkdwn",
          text: `*Item ID:*\n${order.itemId}`,
        },
        {
          type: "mrkdwn",
          text: `*Option ID:*\n${order.optionId}`,
        },
        {
          type: "mrkdwn",
          text: `*Quantity:*\n${order.quantity}`,
        },
      ],
      ...(accessory && { accessory }),
    },
  ];
}

export function OrderDMBlocks(order: Order): any[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `hey! we got your order! (*#${order.id}*).\nwe'll send you updates here & you can check its status at <https://rail.hackclub.com/station/orders>`,
      },
    },
  ];
}
