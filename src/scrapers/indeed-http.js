// ─────────────────────────────────────────────
//  Indeed HTTP scraper (no Playwright)
//  Uses axios + cheerio against Indeed's RSS feed
//  which is publicly accessible and much lighter
//  than Playwright on Render's free tier.
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
};

/**
 * Lightweight Indeed scraper using the RSS feed endpoint.
 * No Playwright required — works on Render free tier.
 * @param {"tech"|"business"} category
 * @returns {Promise<Array>}
 */
export async function scrapeIndeedHttp(category = "tech") {
  if (!sources.indeed.enabled) return [];

  const filters = category === "business" ? config.businessFilters : config.filters;
  const jobs = [];
  const seen = new Set();

  for (const keyword of filters.keywords.slice(0, 5)) {
    const locationQuery = filters.locations[0] ?? "United States";

    // Indeed RSS: returns clean XML with job title, company, location, link, pubDate
    const rssUrl =
      `https://www.indeed.com/rss?q=${encodeURIComponent(keyword)}` +
      `&l=${encodeURIComponent(locationQuery)}` +
      `&fromage=${filters.maxAgeDays}&sort=date`;

    try {
      const res = await axios.get(rssUrl, { headers: HEADERS, timeout: 15_000 });
      const $ = cheerio.load(res.data, { xmlMode: true });

      $("item").each((_, el) => {
        const title    = $(el).find("title").first().text().trim();
        const link     = $(el).find("link").first().text().trim()
                      || $(el).find("guid").text().trim();
        const pubDate  = $(el).find("pubDate").text().trim();

        // Indeed RSS encodes "Company - Location" in the title as "Title - Company"
        // and company separately in author/source tags
        const company  = $(el).find("source").text().trim()
                      || $(el).find("author").text().trim()
                      || "Unknown";
        const location = $(el).find("location").text().trim() ?? locationQuery;

        if (!title) return;

        const titleLower = title.toLowerCase();

        const kwMatch = filters.keywords.some(kw => titleLower.includes(kw.toLowerCase()));
        if (!kwMatch) return;

        const excluded = filters.titleExclude.some(ex => titleLower.includes(ex.toLowerCase()));
        if (excluded) return;

        if (category === "business" && filters.techExclude) {
          const isTech = filters.techExclude.some(ex => titleLower.includes(ex.toLowerCase()));
          if (isTech) return;
        }

        const id = `indeed:${category}:${company}:${title}:${link}`
          .replace(/\s+/g, "-").toLowerCase().slice(0, 200);

        if (seen.has(id)) return;
        seen.add(id);

        jobs.push({ id, title, company, location, url: link, source: "Indeed", postedDate: pubDate, season: detectSeason(title) });
      });

    } catch (err) {
      console.warn(`[Indeed-HTTP] Failed for "${keyword}": ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1_500));
  }

  return jobs;
}
