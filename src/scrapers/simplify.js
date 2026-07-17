// ─────────────────────────────────────────────
//  Simplify Jobs scraper
//  Reads all active-season internship READMEs
//  from the SimplifyJobs GitHub repos and parses
//  their HTML tables into job objects.
// ─────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";
import config from "../../config.js";
import { detectSeason } from "../utils/season.js";

const { filters, sources, seasons } = config;

/**
 * Parse a "posted age" string like "1d", "3d", "7d", "12h" into days.
 * Returns Infinity if unparseable (so it gets filtered out).
 */
function ageToDays(ageStr) {
  if (!ageStr) return Infinity;
  const s = ageStr.trim().toLowerCase();
  const hourMatch  = s.match(/^(\d+)h$/);
  const dayMatch   = s.match(/^(\d+)d$/);
  const weekMatch  = s.match(/^(\d+)w$/);
  if (hourMatch)  return parseInt(hourMatch[1])  / 24;
  if (dayMatch)   return parseInt(dayMatch[1]);
  if (weekMatch)  return parseInt(weekMatch[1])  * 7;
  return Infinity;
}

/**
 * Fetch and parse one Simplify GitHub README.
 * @param {string} url
 * @param {string} seasonLabel  — label to attach when title has no explicit term
 * @returns {Array}
 */
async function scrapeRepo(url, seasonLabel) {
  const response = await axios.get(url, {
    headers: { "User-Agent": "job-alert-bot/1.0" },
    timeout: 15_000,
  });

  const $ = cheerio.load(response.data);
  const jobs = [];
  let lastCompany = "";

  $("table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 4) return;

    // Company — "↳" means carry over from previous row
    const companyCellText = $(cells[0]).text().trim();
    const companyName = $(cells[0]).find("a").first().text().trim() || companyCellText;
    const company = companyCellText === "↳" ? lastCompany : companyName;
    if (company && companyCellText !== "↳") lastCompany = company;

    const title    = $(cells[1]).text().trim();
    const location = $(cells[2]).text().trim();
    const appLink  = $(cells[3]).find("a").first().attr("href") ?? "";
    const ageStr   = cells.length >= 5 ? $(cells[4]).text().trim() : "";

    if (!title || !company) return;

    // ── 7-day age filter ──────────────────────
    if (ageToDays(ageStr) > filters.maxAgeDays) return;

    // ── Keyword filter ────────────────────────
    const titleLower = title.toLowerCase();
    const matchesKeyword = filters.keywords.some((kw) => titleLower.includes(kw.toLowerCase()));

    // Also accept if the season's own title keywords appear in the title
    const matchesSeason = seasons.some((s) =>
      s.titleKeywords.some((kw) => titleLower.includes(kw.toLowerCase()))
    );

    if (!matchesKeyword && !matchesSeason) return;

    // ── Exclusion filter ──────────────────────
    const excluded = filters.titleExclude.some((ex) => titleLower.includes(ex.toLowerCase()));
    if (excluded) return;

    const id = `simplify:${company}:${title}:${appLink}`
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 200);

    jobs.push({
      id,
      title,
      company,
      location,
      url:        appLink.startsWith("http") ? appLink : "https://simplify.jobs",
      source:     "Simplify",
      postedDate: ageStr || "—",
      season:     detectSeason(title) || seasonLabel,
    });
  });

  return jobs;
}

/**
 * Scrape all season repos defined in config.
 * @returns {Promise<Array>}
 */
export async function scrapeSimplify() {
  if (!sources.simplify.enabled) return [];

  const allJobs = [];
  const seen = new Set();

  for (const season of seasons) {
    for (const repoUrl of season.repos) {
      try {
        const jobs = await scrapeRepo(repoUrl, season.label);
        for (const job of jobs) {
          if (!seen.has(job.id)) {
            seen.add(job.id);
            allJobs.push(job);
          }
        }
      } catch (err) {
        console.warn(`[Simplify] Failed to scrape ${repoUrl}: ${err.message}`);
      }
    }
  }

  return allJobs;
}
