// ─────────────────────────────────────────────
//  Discord Notifier
//  Sends rich embed alerts via a Discord webhook
//  whenever new jobs are found.
// ─────────────────────────────────────────────

import axios from "axios";
import config from "../config.js";

const WEBHOOK_URL = config.discordWebhookUrl;

// Colour palette per source
const SOURCE_COLORS = {
  Simplify: 0x5865f2,   // blurple
  Indeed: 0x003a9b,     // indeed blue
  LinkedIn: 0x0a66c2,   // linkedin blue
};

/**
 * Send a batch of new job listings to Discord as embeds.
 * Discord allows up to 10 embeds per webhook message.
 * @param {Array<{id, title, company, location, url, source, postedDate}>} jobs
 */
export async function notifyDiscord(jobs) {
  if (!WEBHOOK_URL) {
    console.error("[Discord] DISCORD_WEBHOOK_URL is not set. Skipping notification.");
    return;
  }
  if (jobs.length === 0) return;

  // Split into chunks of 10 (Discord limit)
  const chunks = chunkArray(jobs, 10);

  for (const chunk of chunks) {
    const embeds = chunk.map((job) => buildEmbed(job));
    const payload = {
      username: "Job Alert Bot 🤖",
      avatar_url: "https://i.imgur.com/4M34hi2.png",
      content: chunk.length === 1
        ? `📢 **1 new job found!**`
        : `📢 **${chunk.length} new jobs found!**`,
      embeds,
    };

    try {
      await axios.post(WEBHOOK_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
      });
    } catch (err) {
      console.error(`[Discord] Webhook POST failed: ${err.message}`);
    }

    // Respect Discord rate limit: 5 requests / 2 seconds per webhook
    await new Promise((r) => setTimeout(r, 600));
  }
}

/**
 * Send a plain-text status message (e.g. startup confirmation).
 * @param {string} message
 */
export async function notifyStatus(message) {
  if (!WEBHOOK_URL) return;
  try {
    await axios.post(
      WEBHOOK_URL,
      { username: "Job Alert Bot 🤖", content: message },
      { headers: { "Content-Type": "application/json" }, timeout: 8_000 }
    );
  } catch (err) {
    console.error(`[Discord] Status message failed: ${err.message}`);
  }
}

// ─── Helpers ────────────────────────────────

function buildEmbed(job) {
  const color = SOURCE_COLORS[job.source] ?? 0x57f287;

  const fields = [
    { name: "🏢 Company", value: job.company || "—", inline: true },
    { name: "📍 Location", value: job.location || "Remote / Not specified", inline: true },
    { name: "📅 Posted", value: job.postedDate || "—", inline: true },
    { name: "🔗 Source", value: job.source, inline: true },
  ];

  return {
    title: job.title,
    url: job.url || undefined,
    color,
    fields,
    footer: { text: "Job Alert Bot • via " + job.source },
    timestamp: new Date().toISOString(),
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
