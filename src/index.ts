import { Telegraf } from "telegraf";
import cron from "node-cron";
import axios, { AxiosInstance } from "axios";
import https from "https";
import "dotenv/config";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const DESCO_USERNAME = process.env.DESCO_USERNAME;
const DESCO_PASSWORD = process.env.DESCO_PASSWORD;
const ACCOUNT_ID = process.env.DESCO_ACCOUNT_ID;

if (
  !BOT_TOKEN ||
  !CHAT_ID ||
  !DESCO_USERNAME ||
  !DESCO_PASSWORD ||
  !ACCOUNT_ID
) {
  console.error(
    "Missing env vars: BOT_TOKEN, CHAT_ID, DESCO_USERNAME, DESCO_PASSWORD, DESCO_ACCOUNT_ID",
  );
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

interface DescoBalance {
  accountNo: string;
  meterNo: string;
  balance: number;
  currency: string;
  balanceSnapshotAt: string;
  currentMonthConsumedTaka: number | null;
  readingTime: string;
  stale?: boolean;
}

interface RealtimeMeter {
  accountId: number;
  status: string;
  lastRealtimeBalance: number | null;
  lastRealtimeReceivedAt: string | null;
  nextEligibleAt?: string | null;
}

interface SummaryResponse {
  enabled: boolean;
  meters: RealtimeMeter[];
}

interface FetchResult {
  snapshot: DescoBalance;
  realtime: RealtimeMeter | null;
}

const BASE = "https://prepaid.desco.org.bd";

// DESCO sends an incomplete SSL chain; relax verification for DESCO requests only.
const agent = new https.Agent({ rejectUnauthorized: false });

type Jar = Record<string, string>;

function collectCookies(setCookie: string[] | undefined, jar: Jar) {
  for (const c of setCookie ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
}

const cookieHeader = (jar: Jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

function makeClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    httpsAgent: agent,
    timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json",
    },
  });
}

async function fetchBalance(): Promise<FetchResult> {
  const client = makeClient();
  const jar: Jar = {};

  // 1. Load the site to get an XSRF-TOKEN cookie
  const boot = await client.get("/", { headers: { Accept: "text/html" } });
  collectCookies(boot.headers["set-cookie"], jar);
  if (!jar["XSRF-TOKEN"])
    throw new Error("No XSRF-TOKEN cookie received from /");

  // 2. Sign in. Response sets DESCO_SESSION (and may rotate XSRF-TOKEN)
  const login = await client.post(
    "/api/auth/login",
    { username: DESCO_USERNAME, password: DESCO_PASSWORD },
    {
      headers: {
        "Content-Type": "application/json",
        Origin: BASE,
        Referer: `${BASE}/login`,
        Cookie: cookieHeader(jar),
        "X-XSRF-TOKEN": decodeURIComponent(jar["XSRF-TOKEN"]),
      },
    },
  );
  collectCookies(login.headers["set-cookie"], jar);

  // Debug aid: key names only, never values
  console.log(
    "Login status:",
    login.status,
    "| response keys:",
    Object.keys(login.data ?? {}),
  );

  if (!jar["DESCO_SESSION"]) {
    throw new Error(
      `Login returned ${login.status} but no DESCO_SESSION cookie`,
    );
  }

  const authHeaders = {
    Referer: `${BASE}/dashboard`,
    Cookie: cookieHeader(jar),
    "X-XSRF-TOKEN": decodeURIComponent(jar["XSRF-TOKEN"]),
  };

  // 3. Daily snapshot balance (required)
  const { data: snapshot } = await client.get<DescoBalance>(
    `/api/accounts/${ACCOUNT_ID}/balance`,
    { headers: authHeaders },
  );

  // 4. Last realtime balance (optional extra: failure must not block the message)
  // 4. Last realtime balance (optional extra: failure must not block the message)
  let realtime: RealtimeMeter | null = null;
  try {
    const { data } = await client.get<SummaryResponse>(
      `/api/accounts/realtime-balance`,
      { headers: authHeaders },
    );
    realtime =
      data.meters?.find((m) => String(m.accountId) === String(ACCOUNT_ID)) ??
      data.meters?.[0] ??
      null;
    console.log(
      "Realtime:",
      realtime?.status,
      realtime?.lastRealtimeBalance,
      realtime?.lastRealtimeReceivedAt,
    );
  } catch (e) {
    console.warn(
      "Realtime lookup failed:",
      axios.isAxiosError(e) ? e.response?.status : e,
      axios.isAxiosError(e) ? JSON.stringify(e.response?.data) : "",
    );
  }

  return { snapshot, realtime };
}

const taka = (n: number | null | undefined) =>
  typeof n === "number" ? `${n.toFixed(2)} Tk` : "N/A";

function formatDhaka(iso: string): string {
  const value = iso.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
  const localDhakaValue = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? `${normalized}T00:00:00+06:00`
    : `${normalized}+06:00`;
  const date = new Date(hasTimezone ? normalized : localDhakaValue);

  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Dhaka",
      }).format(date);
}

function formatMessage(d: DescoBalance, rt: RealtimeMeter | null): string {
  const formattedSnapshot = formatDhaka(d.balanceSnapshotAt);

  // Use the realtime figure only if it was received after the daily snapshot
  const realtimeIsNewer =
    rt?.lastRealtimeBalance != null &&
    rt.lastRealtimeReceivedAt != null &&
    Date.parse(rt.lastRealtimeReceivedAt) > Date.parse(d.balanceSnapshotAt);

  const balanceBlock = realtimeIsNewer
    ? `💰 Available balance: ${taka(rt!.lastRealtimeBalance)}\n` +
      `🕒 As of ${formatDhaka(rt!.lastRealtimeReceivedAt!)}\n` +
      `📸 Daily snapshot: ${taka(d.balance)} (${formattedSnapshot})\n\n`
    : `💰 Balance: ${taka(d.balance)}\n\n`;

  const footer = realtimeIsNewer
    ? ""
    : `📸 Snapshot: ${formattedSnapshot}\n\nℹ️ Updated daily, not in real time.`;

  return (
    `⚡️ DESCO Balance Update\n` +
    `📅 Reading date: ${d.readingTime}\n\n` +
    balanceBlock +
    `📊 This month's usage: ${taka(d.currentMonthConsumedTaka)}\n\n` +
    `🏠 Account: ${d.accountNo}` +
    (footer ? `\n${footer}` : "") +
    (d.stale ? `\n⚠️ DESCO marked this data as stale.` : "")
  );
}

async function checkForUpdate() {
  try {
    const { snapshot, realtime } = await fetchBalance();
    await bot.telegram.sendMessage(CHAT_ID!, formatMessage(snapshot, realtime));
    console.log(`Message sent for reading ${snapshot.readingTime}`);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(
        "Failed to check DESCO balance:",
        err.response?.status,
        err.config?.method?.toUpperCase(),
        err.config?.url,
        JSON.stringify(err.response?.data),
      );
    } else {
      console.error("Failed to check DESCO balance:", err);
    }
    process.exitCode = 1; // makes the GitHub Actions run show as failed
  }
}

// VPS mode only: uncomment this and remove the one-shot call below.
// cron.schedule("0 0 10 * * *", checkForUpdate, { timezone: "Asia/Dhaka" });

checkForUpdate();
