// ─────────────────────────────────────────────
//  Job Alert Bot — Configuration
//  Edit this file to customise your searches.
// ─────────────────────────────────────────────

export default {
  // ─── Discord webhooks ──────────────────────────────────────────────────────
  //  Create two separate webhooks — one per channel — and paste the URLs here.
  //  Server Settings → Integrations → Webhooks → New Webhook → Copy URL

  // #tech-jobs channel  (software engineering, SWE internships, new grad dev)
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",

  // #business-jobs channel  (finance, consulting, M&A, PE, healthcare, etc.)
  discordBusinessWebhookUrl: process.env.DISCORD_BUSINESS_WEBHOOK_URL || "",

  // How often to check for new jobs (cron syntax)
  // "*/5 * * * *"  = every 5 minutes
  // "*/30 * * * *" = every 30 minutes
  // "0 9 * * *"    = once daily at 9 AM
  checkInterval: "*/5 * * * *",

  // ─── Tech / SWE filters ───────────────────────────────────────────────────
  filters: {
    keywords: [
      "software engineer intern",
      "software developer intern",
      "SWE intern",
      "frontend intern",
      "backend intern",
      "full stack intern",
      "mobile engineer intern",
      "ios intern",
      "android intern",
      "data engineer intern",
      "ml engineer intern",
      "machine learning intern",
      "summer 2026 intern",
      "fall 2026 intern",
      "spring 2026 intern",
      "new grad software",
    ],

    // Locations to search
    locations: ["United States", "Remote"],

    // Only show jobs posted within this many days
    maxAgeDays: 7,

    // Exclude jobs whose title contains these words (case-insensitive)
    titleExclude: ["senior", "staff", "principal", "lead", "manager"],
  },

  // ─── Business filters ─────────────────────────────────────────────────────
  businessFilters: {
    keywords: [
      // Investment Banking / M&A
      "investment banking intern",
      "investment banking analyst",
      "M&A intern",
      "mergers and acquisitions intern",
      "IB intern",
      // Private Equity / Venture Capital
      "private equity intern",
      "PE intern",
      "venture capital intern",
      "VC intern",
      // Consulting
      "management consulting intern",
      "business analyst intern",
      "strategy consulting intern",
      "McKinsey intern",
      "BCG intern",
      "Bain intern",
      // Finance / Accounting
      "financial analyst intern",
      "corporate finance intern",
      "equity research intern",
      "hedge fund intern",
      "asset management intern",
      "wealth management intern",
      "accounting intern",
      "audit intern",
      "tax intern",
      // Insurance
      "insurance analyst intern",
      "actuarial intern",
      "actuary intern",
      "underwriting intern",
      // Healthcare / Biotech Business
      "healthcare analyst intern",
      "healthcare consulting intern",
      "biotech business intern",
      "pharma business intern",
      "hospital operations intern",
      // General business / operations
      "operations analyst intern",
      "strategy intern",
      "corporate development intern",
      "business development intern",
      "real estate analyst intern",
      "supply chain analyst intern",
    ],

    locations: ["United States", "Remote"],

    maxAgeDays: 7,

    // Exclude purely technical roles that might accidentally match
    titleExclude: ["software", "engineer", "developer", "data scientist", "senior", "manager", "director"],
  },

  // ─── Hiring seasons ───────────────────────────────────────────────────────
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
      repos: [],
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

  // ─── Sources ──────────────────────────────────────────────────────────────
  sources: {
    simplify: {
      enabled: true,  // tech roles only (GitHub repos)
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
