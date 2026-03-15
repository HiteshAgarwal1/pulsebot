import { format } from "date-fns";
import type { DigestResult } from "@/lib/types";

export function formatSlackMessage(digest: DigestResult): object[] {
  const dateStr = format(new Date(digest.date), "MMMM d, yyyy");

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Pulsebot — AI News Briefing`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📅 ${dateStr}  ·  📰 ${digest.articles.length} stories  ·  🏷️ ${digest.categoriesCovered.length} categories`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> 💡 *TL;DR*\n> ${digest.tldr}`,
      },
    },
    { type: "divider" },
  ];

  for (let i = 0; i < digest.articles.length; i++) {
    const article = digest.articles[i];
    const pubTime = article.publishedAt
      ? format(new Date(article.publishedAt), "h:mm a")
      : "";

    const rank = `*${i + 1}*`;
    const source = article.source;
    const meta = [source, pubTime].filter(Boolean).join(" · ");
    const categories = article.categories.slice(0, 3).map((c) => `\`${c}\``).join("  ");

    const articleText = [
      `${rank}  *<${article.url}|${escapeSlackText(article.title)}>*`,
      `${meta}  ${categories}`,
      ``,
      `${article.summary}`,
      ``,
      `_${article.whyItMatters}_`,
    ].join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: articleText,
      },
    });

    // Add divider between articles (not after last)
    if (i < digest.articles.length - 1) {
      blocks.push({ type: "divider" });
    }
  }

  // Footer
  blocks.push({ type: "divider" });

  const categoryTags = digest.categoriesCovered.map((c) => `\`${c}\``).join("  ");
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Categories covered:*  ${categoryTags}`,
    },
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Powered by *Pulsebot* · React with 👍 or 👎 to give feedback`,
      },
    ],
  });

  return splitBlocksIfNeeded(blocks);
}

function splitBlocksIfNeeded(blocks: object[]): object[] {
  if (blocks.length <= 50) return blocks;
  return blocks.slice(0, 50);
}

function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatSlackText(digest: DigestResult): string {
  const dateStr = format(new Date(digest.date), "MMMM d, yyyy");

  let text = `*Pulsebot — AI News Briefing*\n`;
  text += `${dateStr} · ${digest.articles.length} stories\n\n`;
  text += `> 💡 *TL;DR:* ${digest.tldr}\n\n`;
  text += `───\n\n`;

  for (let i = 0; i < digest.articles.length; i++) {
    const article = digest.articles[i];
    const pubTime = article.publishedAt
      ? format(new Date(article.publishedAt), "h:mm a")
      : "";
    const meta = [article.source, pubTime].filter(Boolean).join(" · ");

    text += `*${i + 1}. <${article.url}|${escapeSlackText(article.title)}>*\n`;
    text += `${meta}\n\n`;
    text += `${article.summary}\n\n`;
    text += `_${article.whyItMatters}_\n\n`;
    text += `───\n\n`;
  }

  text += `*Categories:* ${digest.categoriesCovered.join(" · ")}\n\n`;
  text += `Powered by Pulsebot`;

  return text;
}
