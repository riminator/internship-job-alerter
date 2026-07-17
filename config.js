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
    keywords: [
      "software engineer intern",
      "software developer intern",
      "SWE intern",
      "frontend intern",
      "backend intern",
      "summer 2026 intern",
      "fall 2026 intern",
      "spring 2026 intern",
    ],

    // Locations to search (leave empty [] to search remotely / all locations)
    locations: ["United States", "Remote"],

    // Only show jobs posted within this many days
    maxAgeDays: 7,

    // Exclude jobs whose title contains these words (case-insensitive)
    titleExclude: ["senior", "staff", "principal", "lead", "manager"],
  },

  // ─── Hiring seasons ─────────────────────────────────────────────────────────
  //  label           — shown in Discord alerts
  //  titleKeywords   — words in a job title that indicate this term
  //  applicationOpen — when companies typically start posting for this term
  //  applicationClose— when most postings have closed
  //  repos           — Simplify GitHub repo URLs covering this term
  seasons: [
    {
      label: "Summer 2026",
      titleKeywords: ["summer 2026", "summer26", "su26", "summer '26"],
      applicationOpen:  "2025-08-01",
      applicationClose: "2026-04-30",
      repos: [
        "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
      ],
    },
    {
      label: "Fall 2026",
      titleKeywords: ["fall 2026", "fall26", "fa26", "autumn 2026"],
      applicationOpen:  "2026-04-01",
      applicationClose: "2026-08-31",
      repos: [],  // no public Simplify repo yet — covered by Indeed/LinkedIn keywords
    },
    {
      label: "Spring 2026",
      titleKeywords: ["spring 2026", "spring26", "sp26"],
      applicationOpen:  "2025-09-01",
      applicationClose: "2026-01-15",
      repos: [],
    },
    {
      label: "New Grad 2026",
      titleKeywords: ["new grad", "new graduate", "university grad", "campus hire", "entry level 2026"],
      applicationOpen:  "2025-07-01",
      applicationClose: "2026-06-30",
      repos: [
        "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md",
      ],
    },
  ],

  // Sources to scrape — set enabled: false to disable one
  sources: {
    simplify: {
      enabled: true,
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
