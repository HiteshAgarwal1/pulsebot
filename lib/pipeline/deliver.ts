import type { DigestResult } from "@/lib/types";
import { formatSlackMessage, formatSlackText } from "./formatter";

interface DeliveryResult {
  success: boolean;
  error?: string;
}

export async function deliverToSlack(
  webhookUrl: string,
  digest: DigestResult
): Promise<DeliveryResult> {
  const blocks = formatSlackMessage(digest);
  const text = formatSlackText(digest); // Fallback text

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks, text }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Slack responded with ${response.status}: ${body}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendTestMessage(
  webhookUrl: string
): Promise<DeliveryResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "🤖 *Pulsebot Test Message*\n\nYour webhook is configured correctly! You'll start receiving AI news digests at your scheduled time.",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Slack responded with ${response.status}: ${body}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendErrorMessage(
  webhookUrl: string,
  reason: string
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ Today's AI news digest could not be generated. Reason: ${reason}. Will retry in 1 hour.`,
      }),
    });
  } catch {
    // Best effort
  }
}
