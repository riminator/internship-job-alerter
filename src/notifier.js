// ─────────────────────────────────────────────
//  Discord Notifier
//  Sends rich embed alerts via a Discord webhook.
//  Tech jobs → discordWebhookUrl
//  Business jobs → discordBusinessWebhookUrl
// ─────────────────────────────────────────────

import axios from "axios";
import config from "../config.js";

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

// Category colour tints (applied when channel differs from source)
const CATEGORY_COLORS = {
  tech:     null,          // use source colour
  business: 0x2ecc71,     // green for business/finance
};

/**
 * Send tech job alerts to the #tech-jobs channel.
 */
export async function notifyDiscord(jobs) {
  await sendJobs(jobs, config.discordWebhookUrl, "tech");
}

/**
 * Send business/finance job alerts to the #business-jobs channel.
 */
export async function notifyBusiness(jobs) {
  await sendJobs(jobs, config.discordBusinessWebhookUrl, "business");
}

/**
 * Send a plain status message to the tech channel.
 */
export async function notifyStatus(message) {
  if (!config.discordWebhookUrl) return;
  await post(config.discordWebhookUrl, {
    username:   "Job Alert Bot",
    avatar_url: "https://i.imgur.com/4M34hi2.png",
    content:    message,
  });
}

// ─── Core send logic ────────────────────────

async function sendJobs(jobs, webhookUrl, category) {
  if (!webhookUrl) {
    console.warn(`[Discord] No webhook set for category "${category}". Skipping.`);
    return;
  }
  if (!jobs || jobs.length === 0) return;

  // Summary header
  await post(webhookUrl, {
    username:   "Job Alert Bot",
    avatar_url: "https://i.imgur.com/4M34hi2.png",
    content:    jobs.length === 1
      ? `## 📋 1 new ${category} position found`
      : `## 📋 ${jobs.length} new ${category} positions found`,
  });

  await sleep(500);

  for (const job of jobs) {
    await post(webhookUrl, {
      username:   "Job Alert Bot",
      avatar_url: "https://i.imgur.com/4M34hi2.png",
      embeds:     [buildEmbed(job, category)],
    });
    await sleep(700);
  }
}

// ─── Embed builder ──────────────────────────

function buildEmbed(job, category) {
  const sourceColor = SOURCE_COLORS[job.source] ?? 0x57f287;
  const color = category === "business"
    ? (CATEGORY_COLORS.business)
    : sourceColor;

  const icon     = SOURCE_ICONS[job.source] ?? "🔎";
  const company  = truncate(job.company  || "Unknown",  40);
  const location = truncate(job.location || "Remote / Not specified", 40);
  const posted   = truncate(job.postedDate || "—", 20);
  const season   = truncate(job.season    || "—", 30);

  return {
    title:       truncate(job.title, 200),
    url:         job.url || undefined,
    color,
    description: `**${company}**  ·  ${location}`,
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
      {
        name:   "🗓️ Term",
        value:  season,
        inline: false,
      },
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

// ─── Helpers ────────────────────────────────

async function post(webhookUrl, payload) {
  try {
    await axios.post(webhookUrl, payload, {
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
