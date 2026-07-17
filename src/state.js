// ─────────────────────────────────────────────
//  State Tracker
//  Persists seen job IDs to a local JSON file
//  so the bot never alerts you twice for the
//  same listing.
// ─────────────────────────────────────────────

import fs from "fs";
import config from "../config.js";

const STATE_FILE = config.stateFile;

/**
 * Load the set of already-seen job IDs from disk.
 * @returns {Set<string>}
 */
export function loadSeenIds() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      return new Set(Array.isArray(data.seenIds) ? data.seenIds : []);
    }
  } catch {
    // Corrupted file — start fresh
  }
  return new Set();
}

/**
 * Persist the updated set of seen IDs to disk.
 * Caps the stored list at 5 000 entries to avoid unbounded growth.
 * @param {Set<string>} seenIds
 */
export function saveSeenIds(seenIds) {
  const arr = [...seenIds];
  // Keep only the most recent 5 000 IDs
  const trimmed = arr.slice(-5_000);
  fs.writeFileSync(STATE_FILE, JSON.stringify({ seenIds: trimmed }, null, 2), "utf-8");
}

/**
 * Given a list of scraped jobs, return only the ones that are new
 * (not in seenIds), and update seenIds in-place.
 * @param {Array} jobs
 * @param {Set<string>} seenIds
 * @returns {Array} newJobs
 */
export function filterNewJobs(jobs, seenIds) {
  const newJobs = [];
  for (const job of jobs) {
    if (!seenIds.has(job.id)) {
      newJobs.push(job);
      seenIds.add(job.id);
    }
  }
  return newJobs;
}
