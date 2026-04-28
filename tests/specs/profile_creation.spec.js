const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const BookingPage = require('../pages/BookingPage');
const ProfilePage = require('../pages/ProfilePage');

const BASE_URL = 'https://stg-hts.kapiva.tech/';

test.describe('To validate login functionality', () => {
  test('To test with valid data', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.setViewportSize({ width: 1536, height: 960 });

    const loginPage = new LoginPage(page);
    const bookingPage = new BookingPage(page);
    const profilePage = new ProfilePage(page);

    // ── 1. Login ──────────────────────────────────────────────────────────────
    await loginPage.login('anjali.shaw@kapiva.in', 'a');

    // ── 2. Navigate to CS/HCT Booking and search for the user ────────────────
    await bookingPage.navigate();
    await bookingPage.searchUser('9830814266');
    await page.waitForTimeout(100);

    // ── 3. Open Profiles tab and start creating a new profile ─────────────────
    await profilePage.navigate();
    await profilePage.createNewProfile();

    // ── 4. Fill profile form fields ───────────────────────────────────────────

    // Relationship → "Other"
    await profilePage.selectRelationship('Other');

    // Gender → "Female"
    await profilePage.selectGender('Female');

    // First & Last name
    await profilePage.fillName('TestFirst', 'TestLast');

    // Date of birth (native HTML5 date input)
    await profilePage.fillDOB('1995-06-15');

    // Source → "Agent"
    await profilePage.selectSource('Agent');

    // ── 5. Close the modal (create profile is commented out – same as original)
    await profilePage.closeModal();
  });
});
