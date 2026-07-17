// ─────────────────────────────────────────────
//  Season Detection Utility
//  Determines which hiring term (Summer 2026,
//  Fall 2026, etc.) a job most likely belongs to
//  based on its title and the current date.
// ─────────────────────────────────────────────

import config from "../../config.js";

/**
 * Detect the most likely season/term label for a job.
 * Checks the job title first, then falls back to whichever
 * configured season is currently "active" (open for applications).
 *
 * @param {string} title  — job title
 * @returns {string}      — e.g. "Summer 2026", "Fall 2026", or "Unknown Term"
 */
export function detectSeason(title) {
  const t = title.toLowerCase();

  // 1. Explicit mention in title takes priority
  for (const season of config.seasons) {
    for (const kw of season.titleKeywords) {
      if (t.includes(kw.toLowerCase())) {
        return season.label;
      }
    }
  }

  // 2. Fall back to whichever season is currently open for applications
  const now = new Date();
  for (const season of config.seasons) {
    const open  = new Date(season.applicationOpen);
    const close = new Date(season.applicationClose);
    if (now >= open && now <= close) {
      return season.label;
    }
  }

  // 3. Nothing matched — return nearest upcoming season
  const upcoming = config.seasons
    .filter((s) => new Date(s.applicationOpen) > now)
    .sort((a, b) => new Date(a.applicationOpen) - new Date(b.applicationOpen));

  return upcoming.length ? upcoming[0].label : "Unknown Term";
}
