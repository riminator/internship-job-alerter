// ─────────────────────────────────────────────
//  LinkedIn scraper
//  Uses Playwright to search LinkedIn Jobs
//  (public view, no login required).
// ─────────────────────────────────────────────

import { chromium } from "playwright";
import config from "../../config.js";
import { detectSeason } from "../utils/season.js";

const { filters, sources } = config;

/**
 * Scrape LinkedIn Jobs for matching internship listings.
 * @returns {Promise<Array<{id, title, company, location, url, source, postedDate}>>}
 */
export async function scrapeLinkedIn() {
  if (!sources.linkedin.enabled) return [];

  const jobs = [];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const keyword of filters.keywords.slice(0, 3)) {
      const locationQuery = filters.locations[0] ?? "United States";

      // f_TPR: time posted — r86400 = 24h, r259200 = 3d, r604800 = 7d
      const daySeconds = filters.maxAgeDays * 86_400;
      const searchUrl =
        `${sources.linkedin.baseUrl}?keywords=${encodeURIComponent(keyword)}` +
        `&location=${encodeURIComponent(locationQuery)}` +
        `&f_TPR=r${daySeconds}&sortBy=DD&position=1&pageNum=0`;

      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      });

      try {
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
        await page.waitForTimeout(2_500);

        const cards = await page.$$eval(".jobs-search__results-list > li, .base-card", (els) =>
          els.map((el) => {
            const titleEl = el.querySelector(".base-search-card__title, h3.base-search-card__title");
            const companyEl = el.querySelector(".base-search-card__subtitle a, h4.base-search-card__subtitle");
            const locationEl = el.querySelector(".job-search-card__location, .base-search-card__metadata span");
            const linkEl = el.querySelector("a.base-card__full-link, a[data-tracking-control-name]");
            const dateEl = el.querySelector("time");

            return {
              title: titleEl?.innerText?.trim() ?? "",
              company: companyEl?.innerText?.trim() ?? "",
              location: locationEl?.innerText?.trim() ?? "",
              url: linkEl?.href ?? "",
              postedDate: dateEl?.getAttribute("datetime") ?? dateEl?.innerText?.trim() ?? "",
            };
          })
        );

        for (const card of cards) {
          if (!card.title || !card.company) continue;

          const titleLower = card.title.toLowerCase();

          const matchesKeyword = filters.keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
          if (!matchesKeyword) continue;

          const excluded = filters.titleExclude.some((ex) => titleLower.includes(ex.toLowerCase()));
          if (excluded) continue;

          const id = `linkedin:${card.company}:${card.title}:${card.url}`
            .replace(/\s+/g, "-")
            .toLowerCase()
            .slice(0, 200);

          jobs.push({
            id,
            title:      card.title,
            company:    card.company,
            location:   card.location,
            url:        card.url,
            source:     "LinkedIn",
            postedDate: card.postedDate,
            season:     detectSeason(card.title),
          });
        }
      } catch (err) {
        console.warn(`[LinkedIn] Failed to scrape keyword "${keyword}": ${err.message}`);
      } finally {
        await page.close();
      }

      await new Promise((r) => setTimeout(r, 2_500));
    }
  } finally {
    await browser.close();
  }

  return jobs;
}
