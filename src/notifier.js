// ─────────────────────────────────────────────
//  Discord Notifier
//  Sends rich embed alerts via a Discord webhook
//  whenever new jobs are found.
// ─────────────────────────────────────────────

import axios from "axios";
import config from "../config.js";

const WEBHOOK_URL = config.discordWebhookUrl;

// Accent colour per source
const SOURCE_COLORS = {
  Simplify: 0x5865f2,  // blurple
  Indeed:   0x003a9b,  // indeed blue
  LinkedIn: 0x0a66c2,  // linkedin blue
};

const SOURCE_ICONS = {
  Simplify: "🟣",
  Indeed:   "🔵",
  LinkedIn: "💼",
};

/**
 * Send a batch of new job listings to Discord.
 * Each job gets its own message so sizing is always consistent.
 * @param {Array<{id, title, company, location, url, source, postedDate}>} jobs
 */
export async function notifyDiscord(jobs) {
  if (!WEBHOOK_URL) {
    console.error("[Discord] DISCORD_WEBHOOK_URL is not set. Skipping notification.");
    return;
  }
  if (jobs.length === 0) return;

  // Send a single summary header first
  await post({
    username: "Job Alert Bot",
    avatar_url: "https://i.imgur.com/4M34hi2.png",
    content: jobs.length === 1
      ? `## 📋 1 new position found`
      : `## 📋 ${jobs.length} new positions found`,
  });

  await sleep(500);

  // Send each job as its own clean embed
  for (const job of jobs) {
    await post({
      username: "Job Alert Bot",
      avatar_url: "https://i.imgur.com/4M34hi2.png",
      embeds: [buildEmbed(job)],
    });
    // Stay well within Discord's rate limit (5 req / 2s per webhook)
    await sleep(700);
  }
}

/**
 * Send a plain status message (startup ping, errors, etc.)
 * @param {string} message
 */
export async function notifyStatus(message) {
  if (!WEBHOOK_URL) return;
  await post({
    username: "Job Alert Bot",
    avatar_url: "https://i.imgur.com/4M34hi2.png",
    content: message,
  });
}

// ─── Helpers ────────────────────────────────

function buildEmbed(job) {
  const color = SOURCE_COLORS[job.source] ?? 0x57f287;
  const icon  = SOURCE_ICONS[job.source]  ?? "🔎";

  // Truncate long values so fields never overflow
  const company  = truncate(job.company  || "Unknown",  40);
  const location = truncate(job.location || "Remote / Not specified", 40);
  const posted   = truncate(job.postedDate || "—", 20);

  return {
    // Title is the job name — clicking it opens the application link
    title: truncate(job.title, 200),
    url:   job.url || undefined,
    color,

    // Description gives a clean at-a-glance summary line
    description: `**${company}**  ·  ${location}`,

    // Two inline fields on one row (pairs of 2 render evenly)
    fields: [
      {
        name:   "📍 Location",
        value:  location,
        inline: true,
      },
      {
        name:   "📅 Posted",
        value:  posted,
        inline: true,
      },
      // Full-width row for the source tag
      {
        name:   "Source",
        value:  `${icon} ${job.source}`,
        inline: false,
      },
    ],

    footer: {
      text: `Job Alert Bot  •  ${job.source}`,
    },
    timestamp: new Date().toISOString(),
  };
}

async function post(payload) {
  try {
    await axios.post(WEBHOOK_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
  } catch (err) {
    console.error(`[Discord] Webhook POST failed: ${err.message}`);
  }
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
