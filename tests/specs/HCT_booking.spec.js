const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const BookingPage = require('../pages/BookingPage');
const { sendSlackMessage } = require('../helpers/slackHelper');

const BASE_URL = 'https://stg-hts.kapiva.tech/';
const PHONE_NUMBER = '9830814266';

const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;

test.describe('To validate login functionality', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed') {
      await sendSlackMessage({
        token: SLACK_TOKEN,
        channel: SLACK_CHANNEL,
        message: `❌ *Test Failed: Booking Workflow*\n*Error:* ${
          testInfo.error?.message || 'Unknown error'
        }`,
      });
    }
  });

  test('To test with valid data', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.setViewportSize({ width: 1536, height: 960 });

    const loginPage = new LoginPage(page);
    const bookingPage = new BookingPage(page);

    // ── 1. Login ──────────────────────────────────────────────────────────────
    await loginPage.login('anjali.shaw@kapiva.in', 'a');

    // ── 2. Navigate to CS/HCT Booking ────────────────────────────────────────
    await bookingPage.navigate();

    // ── 3. Search for the user ────────────────────────────────────────────────
    await bookingPage.searchUser(PHONE_NUMBER);

    // ── 4. Verify User Details section is populated ───────────────────────────
    await bookingPage.verifyUserDetails();

    // ── 5. Fill the notes textarea ────────────────────────────────────────────
    await page.getByPlaceholder('Type Here').fill('testing');

    // ── 6. Iterate through all available dates and log slot counts ────────────
    const todayStr = await bookingPage.inspectDateSlots();

    // ── 7. Return to today and book the first available slot ──────────────────
    const result = await bookingPage.returnToTodayAndBook(todayStr);

    // ── 8. Notify Slack ───────────────────────────────────────────────────────
    if (result.alreadyExisted) {
      console.log(`ℹ️  Booking already exists for ${PHONE_NUMBER} today — no new booking made.`);
      await sendSlackMessage({
        token: SLACK_TOKEN,
        channel: SLACK_CHANNEL,
        message:
          `ℹ️ *Booking Already Exists*\n` +
          `• *Mobile:* ${PHONE_NUMBER}\n` +
          `• *Environment:* HTS Staging\n` +
          `• *Checked at:* ${new Date().toLocaleString()}`,
      });
    } else if (result.booked) {
      await sendSlackMessage({
        token: SLACK_TOKEN,
        channel: SLACK_CHANNEL,
        message:
          `✅ *New Booking Confirmed!*\n` +
          `• *Mobile:* ${PHONE_NUMBER}\n` +
          `• *Slot:* ${result.slotText}\n` +
          `• *Environment:* HTS Staging\n` +
          `• *Time of Booking:* ${new Date().toLocaleString()}`,
      });
    }
  });
});
