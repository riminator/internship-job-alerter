// ─────────────────────────────────────────────
//  LinkedIn HTTP scraper (no Playwright)
//  Uses plain axios + cheerio to parse LinkedIn's
//  public job search page. Much lighter — works
//  on Render's free tier without crashing.
// ─────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";
import config from "../../config.js";
import { detectSeason } from "../utils/season.js";

const { sources } = config;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/**
 * Lightweight LinkedIn scraper using HTTP + cheerio.
 * @param {"tech"|"business"} category
 * @returns {Promise<Array>}
 */
export async function scrapeLinkedInHttp(category = "tech") {
  if (!sources.linkedin.enabled) return [];

  const filters = category === "business" ? config.businessFilters : config.filters;
  const jobs = [];
  const seen = new Set();

  // Only use first 5 keywords to stay within rate limits
  for (const keyword of filters.keywords.slice(0, 5)) {
    const locationQuery = filters.locations[0] ?? "United States";
    const daySeconds = filters.maxAgeDays * 86_400;

    const url =
      `${sources.linkedin.baseUrl}?keywords=${encodeURIComponent(keyword)}` +
      `&location=${encodeURIComponent(locationQuery)}` +
      `&f_TPR=r${daySeconds}&sortBy=DD&position=1&pageNum=0`;

    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 15_000 });
      const $ = cheerio.load(res.data);

      $(".base-card, .jobs-search__results-list > li").each((_, el) => {
        const title    = $(el).find(".base-search-card__title").text().trim();
        const company  = $(el).find(".base-search-card__subtitle").text().trim();
        const location = $(el).find(".job-search-card__location").text().trim();
        const url      = $(el).find("a.base-card__full-link").attr("href") ?? "";
        const posted   = $(el).find("time").attr("datetime") ?? $(el).find("time").text().trim() ?? "";

        if (!title || !company) return;

        const titleLower = title.toLowerCase();

        const kwMatch = filters.keywords.some(kw => titleLower.includes(kw.toLowerCase()));
        if (!kwMatch) return;

        const excluded = filters.titleExclude.some(ex => titleLower.includes(ex.toLowerCase()));
        if (excluded) return;

        if (category === "business" && filters.techExclude) {
          const isTech = filters.techExclude.some(ex => titleLower.includes(ex.toLowerCase()));
          if (isTech) return;
        }

        // Intern/co-op only — reject full-time roles
        if (filters.internOnly) {
          const isIntern = ["intern", "internship", "co-op", "coop", "co op", "summer analyst", "summer associate"].some(w => titleLower.includes(w));
          if (!isIntern) return;
        }

        const id = `linkedin:${category}:${company}:${title}:${url}`
          .replace(/\s+/g, "-").toLowerCase().slice(0, 200);

        if (seen.has(id)) return;
        seen.add(id);

        jobs.push({ id, title, company, location, url, source: "LinkedIn", postedDate: posted, season: detectSeason(title) });
      });

    } catch (err) {
      console.warn(`[LinkedIn-HTTP] Failed for "${keyword}": ${err.message}`);
    }

    // Polite delay
    await new Promise(r => setTimeout(r, 1_500));
  }

  return jobs;
}
