// ─────────────────────────────────────────────
//  Job Alert Bot — Main Entry Point
//  Runs on a cron schedule, scrapes all sources,
//  and sends Discord alerts for new listings.
// ─────────────────────────────────────────────

import http from "http";
import cron from "node-cron";
import config from "../config.js";
import { scrapeSimplify } from "./scrapers/simplify.js";
import { scrapeIndeed } from "./scrapers/indeed.js";
import { scrapeLinkedIn } from "./scrapers/linkedin.js";
import { loadSeenIds, saveSeenIds, filterNewJobs } from "./state.js";
import { notifyDiscord, notifyStatus } from "./notifier.js";

// ─── Single check cycle ──────────────────────

async function runCheck() {
  console.log(`\n[${new Date().toISOString()}] Starting job check...`);

  const seenIds = loadSeenIds();
  const allJobs = [];

  // Run all enabled scrapers in parallel
  const results = await Promise.allSettled([
    scrapeSimplify(),
    scrapeIndeed(),
    scrapeLinkedIn(),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled") {
      allJobs.push(...result.value);
    } else {
      console.error("[Runner] Scraper error:", result.reason?.message ?? result.reason);
    }
  }

  console.log(`[Runner] Total jobs fetched: ${allJobs.length}`);

  const newJobs = filterNewJobs(allJobs, seenIds);
  console.log(`[Runner] New jobs to alert: ${newJobs.length}`);

  if (newJobs.length > 0) {
    await notifyDiscord(newJobs);
    saveSeenIds(seenIds);
    console.log(`[Runner] ✅ Sent ${newJobs.length} alert(s) to Discord.`);
  } else {
    console.log("[Runner] No new jobs — nothing to send.");
  }
}

// ─── Keep-alive HTTP server (required by Render free web service) ────────────
//  Render expects a web service to bind a port. We also self-ping every 14 min
//  to prevent the free tier from spinning down after 15 min of inactivity.

function startKeepAliveServer() {
  const port = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Job Alert Bot is running ✅");
  });

  server.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
  });

  // Self-ping every 14 minutes so Render never idles us out
  const appUrl = process.env.RENDER_EXTERNAL_URL;
  if (appUrl) {
    setInterval(async () => {
      try {
        const { default: axios } = await import("axios");
        await axios.get(appUrl, { timeout: 10_000 });
        console.log("[Keep-alive] Pinged self ✅");
      } catch (err) {
        console.warn("[Keep-alive] Self-ping failed:", err.message);
      }
    }, 14 * 60 * 1000);
  }
}

// ─── Startup ────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║       Job Alert Bot  🤖               ║");
  console.log(`║  Interval: ${config.checkInterval.padEnd(26)}║`);
  console.log("╚══════════════════════════════════════╝");

  if (!config.discordWebhookUrl) {
    console.warn("\n⚠️  DISCORD_WEBHOOK_URL is not set.");
    console.warn("   Set it as an env variable or in config.js before alerts will work.\n");
  }

  // Start HTTP server (satisfies Render's port binding requirement)
  startKeepAliveServer();

  // Run once immediately on startup
  await runCheck();

  // Then schedule recurring checks
  cron.schedule(config.checkInterval, runCheck);

  console.log(`\n⏰ Scheduled. Next check in ~${humanInterval(config.checkInterval)}.`);

  await notifyStatus(
    `✅ **Job Alert Bot is running!**\nMonitoring: ${config.filters.keywords.join(", ")}\nSources: Simplify, Indeed, LinkedIn\nChecking every: ${humanInterval(config.checkInterval)}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

// ─── Helpers ────────────────────────────────

function humanInterval(cronExpr) {
  const minuteMatch = cronExpr.match(/^\*\/(\d+) \* \* \* \*$/);
  if (minuteMatch) return `${minuteMatch[1]} minute(s)`;

  const hourMatch = cronExpr.match(/^0 \*\/(\d+) \* \* \*$/);
  if (hourMatch) return `${hourMatch[1]} hour(s)`;

  const dailyMatch = cronExpr.match(/^0 (\d+) \* \* \*$/);
  if (dailyMatch) return `daily at ${dailyMatch[1]}:00`;

  return cronExpr;
}
