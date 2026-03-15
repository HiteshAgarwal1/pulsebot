import { format } from "date-fns";
import type { DigestResult } from "@/lib/types";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━";

const NUMBER_EMOJIS = [
  "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣",
  "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
  "1️⃣1️⃣", "1️⃣2️⃣",
];

export function formatSlackMessage(digest: DigestResult): object[] {
  const dateStr = format(new Date(digest.date), "MMMM d, yyyy");

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📡 Pulsebot — AI News Briefing · ${dateStr}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `💡 *TL;DR:* ${digest.tldr}`,
      },
    },
    { type: "divider" },
  ];

  for (let i = 0; i < digest.articles.length; i++) {
    const article = digest.articles[i];
    const emoji = NUMBER_EMOJIS[i] || `*${i + 1}.*`;
    const pubTime = article.publishedAt
      ? format(new Date(article.publishedAt), "h:mm a")
      : "N/A";

    const articleText = [
      `${emoji} *${article.title}*`,
      `   📰 _${article.source}_ · 🕐 _${pubTime}_`,
      `> ${article.summary}`,
      `> 💬 _Why this matters: ${article.whyItMatters}_`,
      `🔗 <${article.url}|Read full article>`,
    ].join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: articleText,
      },
    });
  }

  blocks.push({ type: "divider" });

  const categories = digest.categoriesCovered.join(" · ");
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `📊 *Categories covered today:*\n${categories}`,
    },
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `🤖 Powered by Pulsebot · ${dateStr} · Feedback? React with 👍 or 👎`,
      },
    ],
  });

  // Slack has a 50-block limit, split if needed
  return splitBlocksIfNeeded(blocks);
}

function splitBlocksIfNeeded(blocks: object[]): object[] {
  // Slack allows max 50 blocks per message
  // For now, keep it simple — the format above is unlikely to exceed this
  if (blocks.length <= 50) return blocks;
  return blocks.slice(0, 50);
}

export function formatSlackText(digest: DigestResult): string {
  const dateStr = format(new Date(digest.date), "MMMM d, yyyy");

  let text = `📡 *Pulsebot — AI News Briefing · ${dateStr}*\n\n`;
  text += `💡 *TL;DR:* ${digest.tldr}\n\n`;
  text += `${DIVIDER}\n\n`;

  for (let i = 0; i < digest.articles.length; i++) {
    const article = digest.articles[i];
    const emoji = NUMBER_EMOJIS[i] || `${i + 1}.`;
    const pubTime = article.publishedAt
      ? format(new Date(article.publishedAt), "h:mm a")
      : "";

    text += `${emoji} *${article.title}*\n`;
    text += `   📰 _${article.source}_ · 🕐 _${pubTime}_\n`;
    text += `> ${article.summary}\n`;
    text += `> 💬 _Why this matters: ${article.whyItMatters}_\n`;
    text += `🔗 <${article.url}|Read full article>\n\n`;
  }

  text += `${DIVIDER}\n\n`;
  text += `📊 *Categories covered today:*\n${digest.categoriesCovered.join(" · ")}\n\n`;
  text += `🤖 Powered by Pulsebot · ${dateStr}`;

  return text;
}
