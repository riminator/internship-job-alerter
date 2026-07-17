// ─────────────────────────────────────────────
//  Job Alert Bot — Main Entry Point
//  Runs on a cron schedule, scrapes all sources,
//  and routes alerts to the correct Discord channel:
//    Tech jobs    → #tech-jobs    (DISCORD_WEBHOOK_URL)
//    Business jobs→ #business-jobs (DISCORD_BUSINESS_WEBHOOK_URL)
// ─────────────────────────────────────────────

import http from "http";
import cron from "node-cron";
import config from "../config.js";
import { scrapeSimplify } from "./scrapers/simplify.js";
import { scrapeIndeed } from "./scrapers/indeed.js";
import { scrapeLinkedIn } from "./scrapers/linkedin.js";
import { loadSeenIds, saveSeenIds, filterNewJobs } from "./state.js";
import { notifyDiscord, notifyBusiness, notifyStatus } from "./notifier.js";

// ─── Check cycle ─────────────────────────────

async function runCheck() {
  console.log(`\n[${new Date().toISOString()}] Starting job check...`);

  const seenIds = loadSeenIds();

  // ── Tech scrape (uses config.filters) ───────
  const techResults = await Promise.allSettled([
    scrapeSimplify(),
    scrapeIndeed("tech"),
    scrapeLinkedIn("tech"),
  ]);

  // ── Business scrape (uses config.businessFilters) ──
  const bizResults = await Promise.allSettled([
    scrapeIndeed("business"),
    scrapeLinkedIn("business"),
  ]);

  const techJobs = [];
  const bizJobs  = [];

  for (const r of techResults) {
    if (r.status === "fulfilled") techJobs.push(...r.value);
    else console.error("[Runner] Tech scraper error:", r.reason?.message ?? r.reason);
  }

  for (const r of bizResults) {
    if (r.status === "fulfilled") bizJobs.push(...r.value);
    else console.error("[Runner] Business scraper error:", r.reason?.message ?? r.reason);
  }

  console.log(`[Runner] Fetched — tech: ${techJobs.length}, business: ${bizJobs.length}`);

  // Filter to only new jobs (shared state file covers both)
  const newTech = filterNewJobs(techJobs, seenIds);
  const newBiz  = filterNewJobs(bizJobs,  seenIds);

  console.log(`[Runner] New — tech: ${newTech.length}, business: ${newBiz.length}`);

  if (newTech.length > 0) {
    await notifyDiscord(newTech);
  }
  if (newBiz.length > 0) {
    await notifyBusiness(newBiz);
  }

  if (newTech.length > 0 || newBiz.length > 0) {
    saveSeenIds(seenIds);
    console.log(`[Runner] ✅ Sent ${newTech.length} tech + ${newBiz.length} business alert(s).`);
  } else {
    console.log("[Runner] No new jobs — nothing to send.");
  }
}

// ─── Keep-alive HTTP server ───────────────────
//  Render free web service requires a bound port.
//  Self-ping every 4 min keeps us under the 5-min check interval.

function startKeepAliveServer() {
  const port = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Job Alert Bot is running ✅");
  });

  server.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
  });

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
    }, 4 * 60 * 1000); // every 4 minutes
  }
}

// ─── Startup ─────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║       Job Alert Bot  🤖               ║");
  console.log(`║  Interval: ${config.checkInterval.padEnd(26)}║`);
  console.log("╚══════════════════════════════════════╝");

  if (!config.discordWebhookUrl) {
    console.warn("\n⚠️  DISCORD_WEBHOOK_URL not set — tech alerts disabled.");
  }
  if (!config.discordBusinessWebhookUrl) {
    console.warn("⚠️  DISCORD_BUSINESS_WEBHOOK_URL not set — business alerts disabled.\n");
  }

  startKeepAliveServer();

  // Run once immediately on startup
  await runCheck();

  // Schedule recurring checks
  cron.schedule(config.checkInterval, runCheck);

  console.log(`\n⏰ Scheduled every ${humanInterval(config.checkInterval)}.`);

  await notifyStatus(
    `✅ **Job Alert Bot is running!**\n` +
    `📡 Tech channel: ${config.discordWebhookUrl ? "✅ connected" : "❌ not set"}\n` +
    `💼 Business channel: ${config.discordBusinessWebhookUrl ? "✅ connected" : "❌ not set"}\n` +
    `⏱️ Checking every: ${humanInterval(config.checkInterval)}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

// ─── Helpers ─────────────────────────────────

function humanInterval(cronExpr) {
  const minuteMatch = cronExpr.match(/^\*\/(\d+) \* \* \* \*$/);
  if (minuteMatch) return `${minuteMatch[1]} minute(s)`;

  const hourMatch = cronExpr.match(/^0 \*\/(\d+) \* \* \*$/);
  if (hourMatch) return `${hourMatch[1]} hour(s)`;

  const dailyMatch = cronExpr.match(/^0 (\d+) \* \* \*$/);
  if (dailyMatch) return `daily at ${dailyMatch[1]}:00`;

  return cronExpr;
}
