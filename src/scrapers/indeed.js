// ─────────────────────────────────────────────
//  Indeed scraper
//  Uses Playwright (headless browser) to bypass
//  bot detection and extract job listings.
// ─────────────────────────────────────────────

import { chromium } from "playwright";
import config from "../../config.js";
import { detectSeason } from "../utils/season.js";

const { sources } = config;

/**
 * Scrape Indeed for jobs matching the configured keywords/locations.
 * @param {"tech"|"business"} category  which filter set to use
 * @returns {Promise<Array>}
 */
export async function scrapeIndeed(category = "tech") {
  if (!sources.indeed.enabled) return [];

  const filters = category === "business" ? config.businessFilters : config.filters;
  const jobs = [];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const keyword of filters.keywords.slice(0, 3)) {
      const locationQuery = filters.locations[0] ?? "United States";
      const searchUrl = `${sources.indeed.baseUrl}?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(locationQuery)}&fromage=${filters.maxAgeDays}&sort=date`;

      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ "User-Agent": "Mozilla/5.0 (compatible; job-alert-bot/1.0)" });

      try {
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForTimeout(2_000); // let JS hydrate

        const cards = await page.$$eval(
          '[data-testid="slider_item"], .job_seen_beacon, .jobsearch-ResultsList > li',
          (els) =>
            els.map((el) => {
              const titleEl = el.querySelector('[data-testid="jobTitle"] a, h2.jobTitle a, .jobTitle a');
              const companyEl = el.querySelector('[data-testid="company-name"], .companyName, .company');
              const locationEl = el.querySelector('[data-testid="text-location"], .companyLocation');
              const dateEl = el.querySelector('[data-testid="myJobsStateDate"], .date, .result-link-bar-container span');

              const title = titleEl?.innerText?.trim() ?? "";
              const href = titleEl?.href ?? "";
              const company = companyEl?.innerText?.trim() ?? "";
              const location = locationEl?.innerText?.trim() ?? "";
              const postedDate = dateEl?.innerText?.trim() ?? "";

              return { title, company, location, url: href, postedDate };
            })
        );

        for (const card of cards) {
          if (!card.title || !card.company) continue;

          const titleLower = card.title.toLowerCase();

          // Apply keyword filter
          const matchesKeyword = filters.keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
          if (!matchesKeyword) continue;

          // Apply exclusion filter
          const excluded = filters.titleExclude.some((ex) => titleLower.includes(ex.toLowerCase()));
          if (excluded) continue;

          const id = `indeed:${card.company}:${card.title}:${card.url}`
            .replace(/\s+/g, "-")
            .toLowerCase()
            .slice(0, 200);

          jobs.push({
            id,
            title:      card.title,
            company:    card.company,
            location:   card.location,
            url:        card.url,
            source:     "Indeed",
            postedDate: card.postedDate,
            season:     detectSeason(card.title),
          });
        }
      } catch (err) {
        console.warn(`[Indeed] Failed to scrape keyword "${keyword}": ${err.message}`);
      } finally {
        await page.close();
      }

      // Polite delay between keyword searches
      await new Promise((r) => setTimeout(r, 2_000));
    }
  } finally {
    await browser.close();
  }

  return jobs;
}
