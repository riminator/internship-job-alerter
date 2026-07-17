# Job Alert Bot 🤖

A Discord bot that monitors job boards (Simplify, Indeed, LinkedIn) and sends you instant alerts whenever new internship or job listings appear that match your filters.

---

## Features

- **Multi-source scraping** — Simplify Jobs (GitHub list), Indeed, LinkedIn
- **Smart deduplication** — never alerts you twice for the same job
- **Rich Discord embeds** — company, location, date posted, direct link
- **Fully configurable** — keywords, locations, excluded titles, check interval
- **Zero manual work** — runs on a schedule and pings you automatically

---

## Setup

### 1. Prerequisites

- [Node.js 18+](https://nodejs.org)
- A Discord server where you have permission to create webhooks

### 2. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 3. Create a Discord Webhook

1. Open your Discord server → go to the channel you want alerts in
2. **Edit Channel → Integrations → Webhooks → New Webhook**
3. Give it a name (e.g. "Job Alert Bot") and click **Copy Webhook URL**

### 4. Configure the bot

Open [`config.js`](./config.js) and update the following:

```js
discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
```

**Recommended:** set it as an environment variable so you never accidentally commit your webhook URL:

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
```

Then customise your search filters:

```js
filters: {
  keywords: ["software engineer intern", "SWE intern", "frontend intern"],
  locations: ["United States", "Remote"],
  maxAgeDays: 3,
  titleExclude: ["senior", "staff", "manager"],
},
```

### 5. Run the bot

```bash
# One-off run (also starts the scheduler)
npm start

# Development mode (auto-restarts on file changes)
npm run dev
```

On startup the bot will:
1. Run an **immediate check** across all sources
2. Post a confirmation message to your Discord channel
3. Schedule recurring checks at your configured interval

---

## Configuration Reference

| Key | Description | Default |
|---|---|---|
| `discordWebhookUrl` | Discord webhook URL | `""` (env var) |
| `checkInterval` | Cron expression for check frequency | `*/30 * * * *` (30 min) |
| `filters.keywords` | Job title keywords to match | SWE intern variants |
| `filters.locations` | Locations to search | `["United States", "Remote"]` |
| `filters.maxAgeDays` | Only show jobs posted within N days | `3` |
| `filters.titleExclude` | Words that disqualify a job title | senior, staff, etc. |
| `sources.simplify.enabled` | Enable Simplify scraper | `true` |
| `sources.indeed.enabled` | Enable Indeed scraper | `true` |
| `sources.linkedin.enabled` | Enable LinkedIn scraper | `true` |
| `stateFile` | Path to the deduplication state file | `.job_state.json` |

---

## Running Continuously (24/7)

Use [PM2](https://pm2.keymetrics.io/) to keep the bot running in the background:

```bash
npm install -g pm2
pm2 start src/index.js --name job-alert-bot
pm2 save
pm2 startup   # auto-start on system reboot
```

Or use a simple systemd service on Linux.

---

## Project Structure

```
job-alert-bot/
├── config.js                  # ← Edit this file
├── package.json
├── src/
│   ├── index.js               # Main scheduler & entry point
│   ├── notifier.js            # Discord webhook sender
│   ├── state.js               # Seen-job deduplication
│   └── scrapers/
│       ├── simplify.js        # Simplify Jobs (GitHub list)
│       ├── indeed.js          # Indeed (Playwright)
│       └── linkedin.js        # LinkedIn (Playwright)
└── .job_state.json            # Auto-created; tracks seen jobs
```

---

## Notes & Limitations

- **Indeed / LinkedIn** use Playwright (headless Chrome). If they update their HTML structure, the CSS selectors in the scrapers may need adjusting.
- **Simplify** reads the public [SimplifyJobs/Summer2025-Internships](https://github.com/SimplifyJobs/Summer2025-Internships) GitHub README — reliable and no scraping needed.
- The `.job_state.json` file is auto-created and capped at 5,000 entries to avoid unbounded growth.
- Do **not** commit your `DISCORD_WEBHOOK_URL` to git. Add `.env` or use environment variables.

---

## .gitignore (recommended)

```
node_modules/
.job_state.json
.env
```
# internship-job-alerter
