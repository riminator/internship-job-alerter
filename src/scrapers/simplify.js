// ─────────────────────────────────────────────
//  Simplify Jobs scraper
//  Reads the public Summer 2026 Internships README
//  from the SimplifyJobs GitHub repository and
//  parses the HTML table into job objects.
// ─────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";
import config from "../../config.js";

const { filters, sources } = config;

/**
 * Fetch and parse the SimplifyJobs internship list.
 * @returns {Promise<Array<{id, title, company, location, url, source, postedDate}>>}
 */
export async function scrapeSimplify() {
  if (!sources.simplify.enabled) return [];

  const response = await axios.get(sources.simplify.repoUrl, {
    headers: { "User-Agent": "job-alert-bot/1.0" },
    timeout: 15_000,
  });

  const $ = cheerio.load(response.data);
  const jobs = [];
  let lastCompany = "";

  // The README uses HTML <table> with <tbody><tr><td> rows
  $("table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 4) return;

    // Company cell — may contain "↳" for continuation rows
    const companyCellText = $(cells[0]).text().trim();
    const companyLink = $(cells[0]).find("a").first();
    const companyName = companyLink.text().trim() || companyCellText;

    // "↳" means same company as previous row
    const company = companyCellText === "↳" ? lastCompany : companyName;
    if (company && companyCellText !== "↳") lastCompany = company;

    // Role / title
    const title = $(cells[1]).text().trim();

    // Location
    const location = $(cells[2]).text().trim();

    // Application link — grab the first <a> href in the cell
    const appCell = $(cells[3]);
    const appLink = appCell.find("a").first().attr("href") ?? "";

    // Age / date posted (5th cell if present)
    const postedDate = cells.length >= 5 ? $(cells[4]).text().trim() : "";

    if (!title || !company) return;

    const titleLower = title.toLowerCase();

    // Filter by keywords
    const matchesKeyword = filters.keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (!matchesKeyword) return;

    // Filter out excluded titles
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
      url: appLink.startsWith("http") ? appLink : `https://simplify.jobs`,
      source: "Simplify",
      postedDate,
    });
  });

  return jobs;
}
