require("dotenv").config();
const cron = require("node-cron");

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  REMINDER_HOUR = "9",
  REMINDER_MINUTE = "0",
  TIMEZONE = "Asia/Kolkata",
  ROOM_NUMBER = ""
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env");
}

const hour = Number(REMINDER_HOUR);
const minute = Number(REMINDER_MINUTE);

if (
  !Number.isInteger(hour) || hour < 0 || hour > 23 ||
  !Number.isInteger(minute) || minute < 0 || minute > 59
) {
  throw new Error("Invalid reminder time");
}

async function sendReminder() {
  const room = ROOM_NUMBER.trim();
  const cleaningMessage = room
    ? `Hello, please arrange cleaning for Room ${room} today. Thank you!`
    : "Hello, please arrange cleaning for our room today. Thank you!";

  const text =
    "🧹 HOSTEL CLEANING REMINDER\n\n" +
    "Please copy this message into your WhatsApp cleaning group:\n\n" +
    cleaningMessage;

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text
      }),
      signal: AbortSignal.timeout(15000)
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.description || "Telegram delivery failed");
  }

  console.log("Reminder delivered to Telegram.");
}

if (process.argv.includes("--test")) {
  sendReminder().catch(error => {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
  });
} else {
  const expression = `${minute} ${hour} * * *`;

  cron.schedule(expression, () => {
    sendReminder().catch(error => {
      console.error("Reminder failed:", error.message);
    });
  }, { timezone: TIMEZONE, noOverlap: true });

  console.log(`Reminder scheduled daily at ${hour}:${String(minute).padStart(2, "0")} (${TIMEZONE}).`);
}
