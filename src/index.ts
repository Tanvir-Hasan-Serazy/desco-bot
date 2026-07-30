import { Telegraf } from "telegraf";
import cron from "node-cron";
import axios from "axios";
import https from "https";
import "dotenv/config";

const bot = new Telegraf(process.env.BOT_TOKEN!);
const CHAT_ID = process.env.CHAT_ID!;

interface DescoData {
    accountNo: string;
    meterNo: string;
    balance: number;
    currentMonthConsumption: number | null;
    readingTime: string; // e.g. "2026-07-30"
}

interface DescoResponse {
    code: number;
    desc: string;
    data: DescoData;
}

// DESCO's server sends an incomplete SSL certificate chain, so Node's strict
// TLS verification rejects it even though browsers tolerate it. This agent
// relaxes verification specifically for this one request.
const agent = new https.Agent({
    rejectUnauthorized: false,
});

async function fetchBalance(): Promise<DescoData> {
    const url = `https://prepaid.desco.org.bd/api/unified/customer/getBalance?accountNo=${process.env.DESCO_ACCOUNT_NO}&meterNo=${process.env.DESCO_METER_NO}`;
    const { data } = await axios.get<DescoResponse>(url, { httpsAgent: agent });
    return data.data;
}

async function checkForUpdate() {
    try {
        const current = await fetchBalance();

        await bot.telegram.sendMessage(
            CHAT_ID,
            `⚡ DESCO update (${current.readingTime})\n` +
                `Balance: ${current.balance} Tk\n` +
                `Account: ${current.accountNo}`,
        );

        console.log(`Message sent for reading ${current.readingTime}`);
    } catch (err) {
        console.error("Failed to check DESCO balance", err);
    }
}

// Runs every day at 10:00 AM Dhaka time (6-field cron: seconds minutes hours day month weekday)
cron.schedule("0 0 10 * * *", checkForUpdate, {
    timezone: "Asia/Dhaka",
});

checkForUpdate();

console.log("Desco Bot Running!");
console.log("DESCO bot scheduled for 10:00 AM daily...");
