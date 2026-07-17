// ─────────────────────────────────────────────
//  Job Alert Bot — Configuration
//  Edit this file to customise your searches.
// ─────────────────────────────────────────────

export default {
  // Discord webhook URL — paste from:
  //   Server Settings → Integrations → Webhooks → New Webhook → Copy URL
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",

  // How often to check for new jobs (cron syntax)
  // Default: every 30 minutes
  // Examples: "*/15 * * * *"  = every 15 min
  //           "0 9 * * *"     = once daily at 9 AM
  checkInterval: "*/30 * * * *",

  // Search filters applied across all sources
  filters: {
    // Keywords to search for (at least one must match the job title or description)
    keywords: ["software engineer intern", "software developer intern", "SWE intern", "frontend intern", "backend intern"],

    // Locations to search (leave empty [] to search remotely / all locations)
    locations: ["United States", "Remote"],

    // Only show jobs posted within this many days
    maxAgeDays: 3,

    // Exclude jobs whose title contains these words (case-insensitive)
    titleExclude: ["senior", "staff", "principal", "lead", "manager"],
  },

  // Sources to scrape — set enabled: false to disable one
  sources: {
    simplify: {
      enabled: true,
      // Simplify public repo of internships (no scraping needed — uses their GitHub list)
      repoUrl: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
    },
    indeed: {
      enabled: true,
      baseUrl: "https://www.indeed.com/jobs",
    },
    linkedin: {
      enabled: true,
      baseUrl: "https://www.linkedin.com/jobs/search",
    },
  },

  // Local file used to persist seen job IDs (prevents duplicate alerts)
  stateFile: ".job_state.json",
};
