import type { Order } from "../db/schema";
import { getShopData } from "./shop";

type SlackMessageOptions = {
  // false hides the link previews slack adds under the message
  unfurl?: boolean;
};

export async function SendSlackBlocks(
  blocks: any[],
  channel: string,
  options: SlackMessageOptions = {},
) {
  return await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.SLACK_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      blocks,
      ...(options.unfurl === false
        ? { unfurl_links: false, unfurl_media: false }
        : {}),
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

export async function SendSlackBlocksToUser(
  userId: string,
  blocks: any[],
  options: SlackMessageOptions = {},
) {
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

  return SendSlackBlocks(blocks, openBody.channel.id, options)
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

// slack mrkdwn needs these escaped in user-provided text
function escapeMrkdwn(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function PayoutDMBlocks(payout: {
  projectId: number;
  projectName: string;
  tier: number;
  hours: number;
  rate: number;
  amount: number;
}): any[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `hey! your project *${escapeMrkdwn(payout.projectName)}* got paid out :blobhaj_party:\nyou received *${payout.amount} tracks* (tier ${payout.tier}, ${payout.hours}h × ${payout.rate} tracks/h).\nspend them on our <https://rail.hackclub.com/station/shop|shop> &amp; check out your <https://rail.hackclub.com/station/project/${payout.projectId}|project> for details`,
      },
    },
  ];
}
