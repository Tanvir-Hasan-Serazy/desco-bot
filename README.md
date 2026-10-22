# DESCO Balance Bot

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?logo=telegram&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=github-actions&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-yellow)

A lightweight Node.js + TypeScript bot that fetches your **DESCO prepaid electricity balance** daily and pushes a notification to a **Telegram chat or group**.

Run it for free on **GitHub Actions**, or self-host it on a **VPS** using PM2.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Step 1 — Create a Telegram Bot](#step-1--create-a-telegram-bot)
- [Step 2 — Get Your Telegram Chat ID](#step-2--get-your-telegram-chat-id)
- [Step 3 — Fork & Configure on GitHub](#step-3--fork--configure-on-github)
- [Step 4 — Add GitHub Actions Secrets](#step-4--add-github-actions-secrets)
- [Step 5 — Enable & Test GitHub Actions](#step-5--enable--test-github-actions)
- [Why Telegram Notifications May Be Delayed](#why-telegram-notifications-may-be-delayed)
- [How to Fix Delays and Make Timing Consistent](#how-to-fix-delays-and-make-timing-consistent)
  - [Alternative 1 (Recommended & Free): cron-job.org Trigger](#alternative-1-recommended--free-cron-joborg-trigger)
  - [Alternative 2: Self-Host on a VPS with PM2](#alternative-2-self-host-on-a-vps-with-pm2)
- [VPS Deployment](#vps-deployment)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [GitHub Actions Workflow](#github-actions-workflow)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)

---

## Overview

DESCO (Dhaka Electric Supply Company) provides a prepaid electricity system. This bot automates the daily balance check — it calls the DESCO prepaid API every day at **10:00 AM Dhaka time** and sends a formatted Telegram message with:

- Current balance (Taka)
- Account number
- Last meter reading timestamp

---

## Features

- ⚡ **Automatic daily balance check** at 10:00 AM Asia/Dhaka time
- 📲 **Telegram notification** delivered directly to your phone
- 🔁 **Manual trigger** via GitHub Actions UI for on-demand checks
- 🔐 **No credentials stored in code** — secrets managed via GitHub Actions or `.env`
- 🆓 **Free to run** on GitHub Actions (2,000 min/month for public repos)
- 🛡️ **Handles DESCO's incomplete SSL chain** gracefully
- 🖥️ **VPS support** with PM2 and node-cron for precise scheduling

---

## How It Works

```
[GitHub Actions schedule] OR [External Cron (cron-job.org)]
                    │
                    ▼
          GitHub Actions Runner
                    │
                    ▼
     fetchBalance() ──► DESCO prepaid API
                    │
                    ▼
     Telegram Bot API ──► sendMessage() ──► Your Telegram Chat
```

On each run, the script:

1. Reads credentials from environment variables
2. Makes an HTTPS GET request to the DESCO balance API
3. Formats the response into a human-readable message
4. Sends the message to your configured Telegram chat

---

## Tech Stack

| Package | Purpose |
|---|---|
| [telegraf](https://telegraf.js.org/) | Telegram Bot framework for Node.js |
| [axios](https://axios-http.com/) | HTTP client for the DESCO API |
| [node-cron](https://github.com/node-cron/node-cron) | Cron scheduler (used in VPS mode) |
| [dotenv](https://github.com/motdotla/dotenv) | Loads `.env` for local development |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [ts-node](https://typestrong.org/ts-node/) | Run TypeScript directly (dev only) |

---

## Step 1 — Create a Telegram Bot

### 1.1 — Open BotFather

1. Open Telegram and search for **`@BotFather`** (verified, blue checkmark).
2. Start the conversation with `/start`.

### 1.2 — Create a New Bot

Send `/newbot` and follow the two prompts:

| Prompt | Example | Notes |
|---|---|---|
| **Name** | `DESCO Balance Bot` | Display name, spaces allowed |
| **Username** | `my_desco_balance_bot` | Must end in `bot`, globally unique |

### 1.3 — Copy Your Bot Token

BotFather will reply with your token:

```
7412345678:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This is your `BOT_TOKEN`. **Treat it like a password** — never commit it to a repository.

> [!CAUTION]
> Anyone with your bot token can send messages on your bot's behalf. Never share it publicly or hardcode it into source files.

### 1.4 — Optional Bot Customization

```
/setdescription  → short bio shown in the bot's profile
/setuserpic      → profile photo
/setcommands     → command menu shortcuts
```

---

## Step 2 — Get Your Telegram Chat ID

### Option A — Private Chat

1. Search for your bot on Telegram and send it any message (e.g., `hello`).
2. Open this URL in your browser:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

3. Find the `"chat"` object in the JSON response:

```json
{
  "message": {
    "chat": {
      "id": 123456789,
      "type": "private"
    }
  }
}
```

The value of `"id"` is your `CHAT_ID`.

### Option B — Group Chat

1. Add your bot to a group and send any message.
2. Call the same `getUpdates` URL.
3. The `chat.id` will be a **negative number** (e.g., `-987654321`) — that is expected for groups.

### Option C — @userinfobot

Search for **`@userinfobot`** on Telegram, send it any message, and it will reply with your User ID.

> [!NOTE]
> If `getUpdates` returns `[]`, make sure you have sent at least one message to the bot first.

---

## Step 3 — Fork & Configure on GitHub

1. Go to this repository on GitHub and click **Fork**.
2. Choose your account as the destination.

All credentials are read from environment variables. **No source files need to be edited** — all configuration is done through GitHub Secrets.

---

## Step 4 — Add GitHub Actions Secrets

GitHub Actions Secrets are encrypted and injected into workflow runs at runtime. They are never visible in logs or source code.

**Navigate to:** Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add all four secrets:

| Secret Name | Value | Where to Get It |
|---|---|---|
| `BOT_TOKEN` | Telegram bot token | From BotFather (Step 1) |
| `CHAT_ID` | Telegram chat or group ID | From `getUpdates` (Step 2) |
| `DESCO_ACCOUNT_NO` | DESCO prepaid account number | From your DESCO bill |
| `DESCO_METER_NO` | DESCO prepaid meter number | From your electricity meter |

> [!IMPORTANT]
> Secret names are case-sensitive. A typo like `Bot_Token` instead of `BOT_TOKEN` will cause the workflow to fail silently.

---

## Step 5 — Enable & Test GitHub Actions

### 5.1 — Enable Actions on Your Fork

Go to the **Actions** tab. If you see a banner saying workflows are disabled on this fork, click **I understand my workflows, go ahead and enable them**.

### 5.2 — Run the Workflow Manually

1. Go to **Actions** → **DESCO Daily Balance**.
2. Click **Run workflow** → select your branch → **Run workflow**.

### 5.3 — Check the Run Logs

Click the running workflow → **send-balance** job → expand the `node dist/index.js` step. If successful, you will receive a Telegram message within seconds.

---

## Why Telegram Notifications May Be Delayed

If you rely on GitHub Actions' default scheduled cron (`schedule: - cron: '0 4 * * *'`), you will notice that messages rarely arrive at exactly 10:00 AM. Sometimes they arrive 15 minutes, 45 minutes, or even a couple of hours late.

### Why does this happen?
1. **GitHub Actions Scheduled Jobs Are Not Real-Time:**  
   GitHub provides scheduled runs on shared community runners at lowest execution priority. During peak hours (especially on top-of-the-hour marks like `:00`), thousands of repositories request runners simultaneously. GitHub queues the runs, causing severe **cron drift / delays**.
2. **Short Worker Queueing:**  
   When your scheduled time is reached, GitHub puts your job in a queue until a free runner instance is allocated.
3. **DESCO API / Network Response:**  
   While the API call and Telegram message dispatch themselves take under 3 seconds once running, the waiting time on GitHub’s side causes 99% of the delay.

---

## How to Fix Delays and Make Timing Consistent

To receive your Telegram notification punctually at your chosen time every single day, you have two reliable alternatives:

### Alternative 1 (Recommended & Free): cron-job.org Trigger

Use a free external scheduler service like [**cron-job.org**](https://cron-job.org) to ping GitHub’s `workflow_dispatch` API at exactly 10:00 AM (04:00 UTC). Because `workflow_dispatch` events are treated as user-initiated runs rather than queued background cron jobs, GitHub starts the runner almost immediately (typically within seconds).

#### Step 1: Create a GitHub Personal Access Token (PAT)
1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Click **Generate new token**:
   - **Token name:** `desco-bot-dispatch`
   - **Expiration:** 1 year (or your preferred duration)
   - **Repository access:** "Only select repositories" → select `desco-bot`
   - **Permissions → Repository permissions:** Set **Actions** to **Read and write**
3. Click **Generate token** and copy the token value (`github_pat_...`).

> [!CAUTION]
> Treat this token like a password. Never commit it to git or share it publicly.

#### Step 2: Set up cron-job.org
1. Create a free account at [cron-job.org](https://cron-job.org) and verify your email.
2. Go to **Dashboard → Cronjobs → Create cronjob**.
3. Fill in the primary details:
   - **Title:** `DESCO Balance Bot`
   - **URL:** `https://api.github.com/repos/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/actions/workflows/daily-balance.yml/dispatches`
   - **Request method:** `POST`
4. Expand **Advanced → Request headers** and add:
   - `Authorization`: `Bearer YOUR_PAT_TOKEN`
   - `Content-Type`: `application/json`
   - `Accept`: `application/vnd.github+json`
   - `X-GitHub-Api-Version`: `2022-11-28`
5. Under **Request body**, put:
   ```json
   {"ref": "main"}
   ```
   *(Replace `"main"` with `"master"` if your repository uses master as the default branch)*.
6. Set the **Schedule**:
   - Time: `04:00 UTC` (which corresponds to `10:00 AM Asia/Dhaka`)
   - Interval: Every day
7. Click **Create**. You can click **Test run** to verify immediately — a `204 No Content` status means GitHub received and launched the workflow immediately!

> [!TIP]
> If you switch to cron-job.org, you can edit `.github/workflows/daily-balance.yml` to remove the `schedule:` trigger so you don't receive duplicate runs.

---

### Alternative 2: Self-Host on a VPS with PM2

If you prefer total control without third-party webhooks or GitHub Actions limits, you can run the bot on any Linux VPS or Raspberry Pi. Using `node-cron` with PM2 guarantees 100% on-time execution down to the exact second.

See the [VPS Deployment](#vps-deployment) section below for the complete setup.

---

---

## VPS Deployment

A VPS gives you full control over timing, logs, and uptime with no dependency on GitHub's scheduler. The bot runs as a persistent process using PM2 and fires daily via the built-in `node-cron` scheduler.

### Prerequisites

- Ubuntu 20.04+ (or any Debian-based distro)
- SSH access
- Node.js 18+ and `git`

### Step 1 — Install Node.js

```bash
sudo apt update && sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

### Step 2 — Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/desco-bot.git
cd desco-bot
npm ci
```

### Step 3 — Create the `.env` File

```bash
nano .env
```

```env
BOT_TOKEN=7412345678:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CHAT_ID=123456789
DESCO_ACCOUNT_NO=your_desco_account_number
DESCO_METER_NO=your_desco_meter_number
```

Save with `Ctrl+O` → `Enter` → `Ctrl+X`, then restrict permissions:

```bash
chmod 600 .env
```

### Step 4 — Enable the Cron Scheduler

Open [`src/index.ts`](src/index.ts) and uncomment lines 55–57:

```typescript
// Before
// cron.schedule("0 0 10 * * *", checkForUpdate, {
//     timezone: "Asia/Dhaka",
// });

// After
cron.schedule("0 0 10 * * *", checkForUpdate, {
    timezone: "Asia/Dhaka",
});
```

> [!NOTE]
> `node-cron` uses a 6-field expression (seconds, minutes, hours, day, month, weekday). The `timezone` option keeps the schedule correct regardless of your VPS system clock.

### Step 5 — Build and Start with PM2

```bash
npm run build
npm install -g pm2
pm2 start dist/index.js --name desco-bot
pm2 save
pm2 startup
```

PM2 will print a `sudo env PATH=...` command — **run it** to register the startup service.

### PM2 Reference

| Command | Description |
|---|---|
| `pm2 list` | Show all processes and their status |
| `pm2 logs desco-bot` | Stream live logs |
| `pm2 logs desco-bot --lines 50` | Show last 50 log lines |
| `pm2 restart desco-bot` | Restart after a code update |
| `pm2 stop desco-bot` | Stop without removing from PM2 |
| `pm2 monit` | Interactive process monitor |

### Updating the Bot

```bash
git pull
npm run build
pm2 restart desco-bot
```

### GitHub Actions vs VPS

| | GitHub Actions | VPS |
|---|---|---|
| **Cost** | Free (within minute limits) | ~$3–6/month |
| **Setup complexity** | Low | Medium |
| **Cron precision** | Best-effort (use cron-job.org) | Exact |
| **Logs** | GitHub Actions UI | `pm2 logs` |
| **Best for** | Zero-cost automation | Full control, multi-bot hosting |

---

## Local Development

```bash
git clone https://github.com/YOUR_USERNAME/desco-bot.git
cd desco-bot
npm install
```

Create a `.env` file in the project root:

```env
BOT_TOKEN=7412345678:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CHAT_ID=123456789
DESCO_ACCOUNT_NO=your_desco_account_number
DESCO_METER_NO=your_desco_meter_number
```

> [!CAUTION]
> The `.env` file is in `.gitignore`. Never commit it.

| Command | Description |
|---|---|
| `npm run dev` | Run with `ts-node` directly (no build step) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled build |

---

## Project Structure

```
desco-bot/
├── .github/
│   └── workflows/
│       └── daily-balance.yml   # GitHub Actions workflow
├── src/
│   └── index.ts                # Bot logic and cron scheduler
├── dist/                       # Compiled output (git-ignored)
├── .env                        # Local secrets (git-ignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Telegram bot token from BotFather |
| `CHAT_ID` | ✅ | Target Telegram chat, group, or channel ID |
| `DESCO_ACCOUNT_NO` | ✅ | DESCO prepaid account number |
| `DESCO_METER_NO` | ✅ | DESCO prepaid meter number |

Loaded from `.env` in local/VPS mode via `dotenv`. Injected as encrypted secrets in GitHub Actions.

---

## GitHub Actions Workflow

```yaml
name: DESCO Daily Balance

on:
  workflow_dispatch: {}    # Triggered by cron-job.org; also supports manual runs

jobs:
  send-balance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: node dist/index.js
        env:
          BOT_TOKEN: ${{ secrets.BOT_TOKEN }}
          CHAT_ID: ${{ secrets.CHAT_ID }}
          DESCO_ACCOUNT_NO: ${{ secrets.DESCO_ACCOUNT_NO }}
          DESCO_METER_NO: ${{ secrets.DESCO_METER_NO }}
```

| Step | Description |
|---|---|
| `actions/checkout@v4` | Clones the repository into the runner |
| `actions/setup-node@v4` | Installs Node.js 18 |
| `npm ci` | Installs dependencies from `package-lock.json` |
| `npm run build` | Compiles TypeScript to JavaScript |
| `node dist/index.js` | Fetches balance, sends Telegram message, exits |

---

## Security Considerations

- All credentials are stored as **GitHub Encrypted Secrets** and are never exposed in logs or build artifacts.
- `https.Agent({ rejectUnauthorized: false })` is used specifically for the DESCO API request because DESCO's server sends an incomplete SSL certificate chain that Node.js rejects by default. This relaxation is scoped to a single `axios` instance and does not affect any other HTTPS calls.
- The DESCO API endpoint is public and unauthenticated — no login credentials are transmitted to DESCO's servers.

> [!WARNING]
> Disabling `rejectUnauthorized` exposes that specific request to man-in-the-middle attacks. This is an acceptable tradeoff for a low-stakes read-only balance check on a trusted network.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Workflow succeeds but no Telegram message | Wrong `CHAT_ID` | Re-check via `getUpdates` or `@userinfobot` |
| `401 Unauthorized` in logs | Invalid `BOT_TOKEN` | Regenerate via BotFather `/revoke` then `/newbot` |
| `400 Bad Request: chat not found` | Bot not in group, or wrong group ID | Add bot to the group and re-fetch the chat ID |
| Variables show as `undefined` | Secrets missing or misnamed | Verify secret names in Settings → Secrets and variables |
| DESCO API returns an error | Wrong account or meter number | Cross-check values against your DESCO bill |
| SSL error despite the workaround | Network-level TLS inspection (e.g., corporate proxy) | Test from a different network |
| cron-job.org returns `404` | Wrong workflow filename in the dispatch URL | Confirm the filename matches `daily-balance.yml` |
| cron-job.org returns `422` | Wrong branch name in the request body | Change `"main"` to `"master"` or your actual default branch |

---

## Known Limitations

- The DESCO API (`prepaid.desco.org.bd`) is **not officially documented** and was discovered through browser network inspection. It may change without notice.
- The API is unauthenticated — anyone with your account number and meter number can query the same balance data.
- GitHub Actions free tier provides 2,000 minutes/month for public repos and 500 for private. Each bot run uses roughly 1–2 minutes.
