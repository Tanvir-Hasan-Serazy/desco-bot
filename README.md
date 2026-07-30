# DESCO Bot

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4)

DESCO Bot is a small Node.js and TypeScript automation project that checks your DESCO prepaid account balance and sends a Telegram notification with the latest balance information.

It is designed to run automatically on a schedule and also sends an initial update when the application starts.

## Features

- Fetches the latest DESCO prepaid balance from the official DESCO API
- Sends a Telegram message with the balance and reading time
- Runs as a scheduled background service using cron
- Supports local development and production deployment
- Uses environment variables to keep credentials secure

## What this project does

The bot:

- connects to the DESCO prepaid balance API,
- retrieves the latest account balance and reading timestamp,
- sends a message to a Telegram chat or channel,
- runs on a scheduled cron job every day at 10:00 AM Asia/Dhaka time,
- sends an immediate update on startup for quick testing.

## Technologies used

- Node.js
- TypeScript
- Telegraf for Telegram bot integration
- node-cron for scheduling
- axios for HTTP requests
- dotenv for environment variable loading

## Prerequisites

Before running this project, make sure you have:

- Node.js installed (preferably version 18 or newer)
- npm installed
- A Telegram bot token from BotFather
- A Telegram chat ID where messages should be sent
- Your DESCO account number and meter number

## Project structure

- src/index.ts - main bot logic and scheduling
- package.json - project scripts and dependencies
- tsconfig.json - TypeScript compiler configuration

## Environment variables

Create a file named .env in the project root and add the following variables:

```env
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
DESCO_ACCOUNT_NO=your_desco_account_number
DESCO_METER_NO=your_desco_meter_number
```

### How to get each value

- BOT_TOKEN: Create a bot with BotFather in Telegram and copy the token.
- CHAT_ID: Start a chat with your bot, send a message, and use a Telegram ID lookup method to get the chat ID.
- DESCO_ACCOUNT_NO: Your DESCO account number.
- DESCO_METER_NO: Your DESCO meter number.

## Installation

From the project root, install dependencies:

```bash
npm install
```

## Running the project

### Development mode

Run the project directly with ts-node:

```bash
npm run dev
```

### Build for production

Compile the TypeScript files to JavaScript:

```bash
npm run build
```

### Start the built version

After building, start the compiled app:

```bash
npm run start
```

## How it works

When the app starts, it:

1. creates a Telegraf bot client,
2. loads environment variables from .env,
3. calls the DESCO balance endpoint,
4. sends a Telegram message with the balance information,
5. schedules the same task to run daily at 10:00 AM Asia/Dhaka time.

## Notes

The DESCO endpoint uses an SSL certificate chain that may cause Node.js to reject the connection by default. This project intentionally disables certificate verification for that specific HTTPS request so the balance check can succeed in this environment.

This bot uses a public, unauthenticated DESCO endpoint discovered through browser inspection rather than an officially documented API. It is included here for transparency and practical usage, but it may change without notice.

## Deployment options

You can run this bot on a local machine or on a remote server.

### Local machine

Use the same steps as above and keep the process running in a terminal or use a process manager.

### VPS or cloud server

For a server deployment, follow these general steps:

1. Upload the project to your server.
2. Install dependencies with npm install.
3. Create a .env file with your credentials.
4. Build the project with npm run build.
5. Start it with npm run start.
6. Optionally use a service manager such as PM2 so it keeps running in the background.

Example PM2 command:

```bash
npm install -g pm2
pm2 start dist/index.js --name desco-bot
```

## Troubleshooting

If the bot does not send messages, check the following:

- your .env file is present and correctly named,
- the Telegram bot token is valid,
- the chat ID is correct,
- the DESCO account and meter values are correct,
- your internet connection can reach the DESCO API endpoint.
