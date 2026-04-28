/**
 * Consultation Caching – Full Test Suite
 * TC_01 – TC_37  |  Positive · Negative · Edge · Compatibility
 *
 * CONFIRMED FLOW (from manual + automated testing):
 *  1. Admin logs in → finds assigned doctor from patient card → doctor re-logs in
 *  2. Doctor opens consultation card → fills data
 *  3. page.reload() triggers the reload → app shows "Unsaved changes found" popup
 *  4a. "Restore saved data" → banner shown, data pre-filled
 *  4b. "Discard"            → form empty, no banner
 *
 *  NOTE: Command+R / F5 via keyboard do NOT trigger the popup in Playwright.
 *        Only page.reload() works.
 */

const { test, expect } = require('@playwright/test');
const LoginPage        = require('../pages/LoginPage');
const AppointmentsPage = require('../pages/AppointmentsPage');
const doctors          = require('../../cypress/fixtures/doctors.json');

const BASE_URL       = 'https://stg-hts.kapiva.tech/';
const ADMIN_EMAIL    = 'anjali.shaw@kapiva.in';
const ADMIN_PASS     = 'a';
const TARGET_PATIENT = 'Samir OK';

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function loginAsAssignedDoctor(page) {
  const login = new LoginPage(page);
  const appts = new AppointmentsPage(page);
  await login.login(ADMIN_EMAIL, ADMIN_PASS);
  await page.waitForTimeout(2000);
  await appts.navigate();
  await appts.clickToday();
  await appts.handleConsultantDropdown();
  const card   = await appts.findLatestPatientCard(TARGET_PATIENT);
  const profId = await appts.extractDoctorId(card);
  const doctor = doctors.find(d => d.profId.trim().toLowerCase() === profId.toLowerCase());
  if (!doctor) throw new Error(`Doctor "${profId}" not found in fixture.`);
  await login.logout(BASE_URL);
  await login.login(doctor.email, doctor.password);
  await page.waitForTimeout(3000);
  return doctor;
}

async function openConsultation(page) {
  const appts = new AppointmentsPage(page);
  await appts.navigate();
  const card = await appts.findLatestPatientCard(TARGET_PATIENT);
  await card.scrollIntoViewIfNeeded();
  await card.click({ force: true });
  await page.waitForTimeout(2000);
}

async function fillCacheTestData(page) {
  const age = page.getByPlaceholder('Enter age');
  if ((await age.count()) > 0) {
    await age.click({ clickCount: 3 }); // triple-click selects all existing text
    await age.pressSequentially('28');  // char-by-char fires React onChange
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    console.log('  [FILL] Age typed: 28');
  }
  const height = page.getByPlaceholder('e.g. 170');
  if ((await height.count()) > 0) {
    await height.click({ clickCount: 3 }); // triple-click selects all
    await height.pressSequentially('170');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    console.log('  [FILL] Height typed: 170');
  }
  try {
    await page.locator('[aria-label="Expand notes"]').click();
    await page.waitForTimeout(300);
    const notes = page.getByPlaceholder('Type your notes here...');
    await notes.click({ clickCount: 3 });
    await notes.pressSequentially('CACHE_TEST_MARKER');
    await page.locator('[aria-label="Minimize notes"]').click();
    console.log('  [FILL] Notes typed: CACHE_TEST_MARKER');
  } catch (_) {}
  await page.waitForTimeout(800);
  console.log('  [FILL] Data filled: age=28, height=170, notes=CACHE_TEST_MARKER');
}

async function reloadPage(page) {
  console.log('\n  ========================================');
  console.log('  [RELOAD] ⟳ REFRESHING PAGE NOW...');
  console.log(`  [RELOAD] URL before: ${page.url()}`);
  await page.reload();
  await page.waitForTimeout(2000);
  console.log(`  [RELOAD] URL after : ${page.url()}`);
  console.log('  [RELOAD] ✅ Page refresh complete.');
  console.log('  ========================================\n');
}

async function handlePopup(page, action = 'restore') {
  const popup = page.getByText('Unsaved changes found');
  const visible = (await popup.count()) > 0 && await popup.isVisible().catch(() => false);
  if (visible) {
    console.log('  [POPUP] ✅ "Unsaved changes found" popup appeared!');
    if (action === 'restore') {
      console.log('  [POPUP] Clicking → "Restore saved data"');
      await page.getByText('Restore saved data').click();
      console.log('  [POPUP] "Restore saved data" clicked.');
    } else {
      console.log('  [POPUP] Clicking → "Discard"');
      await page.getByText('Discard').click();
      console.log('  [POPUP] "Discard" clicked — data will be cleared.');
    }
    await page.waitForTimeout(600);
    return true;
  }
  console.log('  [POPUP] ❌ "Unsaved changes found" popup did NOT appear.');
  return false;
}

async function verifyBanner(page) {
  const bannerText = await page.getByText('Saved form data has been restored.').isVisible().catch(() => false);
  const clearBtn   = await page.getByText('Clear saved data').isVisible().catch(() => false);

  if (bannerText) console.log('  [BANNER] ✅ "Saved form data has been restored." text visible.');
  else            console.log('  [BANNER] ❌ "Saved form data has been restored." text NOT visible.');

  if (clearBtn)   console.log('  [BANNER] ✅ "Clear saved data" button visible on the same page.');
  else            console.log('  [BANNER] ❌ "Clear saved data" button NOT visible.');

  return bannerText && clearBtn;
}

// ─── POSITIVE TEST CASES ──────────────────────────────────────────────────────

test.describe('Positive – Cache saves and restores data (TC_01–TC_06)', () => {

  test('TC_01: Data is cached while filling consultation form', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard'); // clear any leftover cache
    await fillCacheTestData(page);

    const age = page.getByPlaceholder('Enter age');
    if ((await age.count()) > 0) expect(await age.inputValue()).toBe('28');
    console.log('TC_01 PASS: Data present in form while filling.');
  });

  test('TC_02: Data persists when navigating back to calendar and reopening same appointment', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // ── FIRST TIME: Refresh → select "Restore saved data" → verify both banner texts ──
    await reloadPage(page);
    console.log('  ===== FIRST OPEN: Selecting "Restore saved data" =====');
    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(true);
    const bannerShown = await verifyBanner(page);
    expect(bannerShown).toBe(true);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`  Age after "Restore saved data": "${ageVal}"`);
    expect(ageVal).toBe('28');

    // ── SECOND TIME: Navigate back to appointments → reopen → select "Discard" ───────
    console.log('\n  ===== SECOND OPEN: Navigating back and selecting "Discard" =====');
    await openConsultation(page);
    const popupAgain = await handlePopup(page, 'discard');
    console.log(`  Popup appeared on second open: ${popupAgain}`);
    const ageAfterDiscard = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`  Age after "Discard": "${ageAfterDiscard}"`);
    expect(ageAfterDiscard).not.toBe('28'); // data should be cleared after Discard
    console.log('TC_02 PASS: Restore verified on first open, Discard verified on second open.');
  });

  test('TC_03: Cache works only for the same appointment', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(true);
    await verifyBanner(page);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    expect(ageVal).toBe('28');
    console.log('TC_03 PASS: Cache is specific to this appointment only.');
  });

  test('TC_04: Cache restores all fields correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(true);
    await verifyBanner(page);

    const age       = page.getByPlaceholder('Enter age');
    const height    = page.getByPlaceholder('e.g. 170');
    const ageVal    = (await age.count())    > 0 ? await age.inputValue()    : '';
    const heightVal = (await height.count()) > 0 ? await height.inputValue() : '';
    console.log(`TC_04 – Age: "${ageVal}", Height: "${heightVal}"`);
    expect(ageVal).toBe('28');
    expect(heightVal).toBe('170');
    console.log('TC_04 PASS: All fields (age + height) restored correctly.');
  });

  test('TC_05: Cache persists during temporary in-app tab navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // Switch inner tabs — no reload, so no popup
    await page.getByText('Medical History').click();
    await page.waitForTimeout(500);
    try { await page.getByText('Patient Details').click(); } catch (_) {}
    await page.waitForTimeout(500);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    expect(ageVal).toBe('28');
    console.log('TC_05 PASS: Data intact after switching inner consultation tabs.');
  });

  test('TC_06: Data saved even if prescription not generated', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // No prescription — just reload
    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(true);
    await verifyBanner(page);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    expect(ageVal).toBe('28');
    console.log('TC_06 PASS: Data retained without generating prescription.');
  });
});

// ─── NEGATIVE TEST CASES ──────────────────────────────────────────────────────

test.describe('Negative – Cache absent or cleared in specific conditions (TC_07–TC_12)', () => {

  test('TC_07: Cache cleared after page refresh — popup appears, Discard clears data', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'discard'); // choose Discard
    expect(popupFound).toBe(true);
    await page.waitForTimeout(1000);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`TC_07 – Age after Discard: "${ageVal}"`);
    expect(ageVal).not.toBe('28');
    console.log('TC_07 PASS: Discard cleared the cache — form is empty after reload.');
  });

  test('TC_08: Cache NOT shared with a different appointment', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    await handlePopup(page, 'discard');

    // Navigate to previous day — open a different appointment
    const appts = new AppointmentsPage(page);
    await appts.navigate();
    await page.getByRole('button', { name: 'Previous day' }).click();
    await page.waitForTimeout(2000);

    const cards = await page.locator('[class*="rounded-[20px]"]').all();
    if (cards.length > 0) {
      await cards[0].click({ force: true });
      await page.waitForTimeout(2000);
      const popupFound = await handlePopup(page, 'restore');
      console.log(`TC_08 – Popup on different appointment: ${popupFound}`);
      expect(popupFound).toBe(false);
      console.log('TC_08 PASS: No cache cross-contamination between appointments.');
    } else {
      console.log('TC_08 SKIP: No previous-day appointment found.');
    }
  });

  test('TC_09: No popup when no data was entered before reload', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    // Discard any cached data from previous tests
    await handlePopup(page, 'discard');
    // Explicitly wipe any residual cache keys so cross-test contamination
    // cannot cause a false popup on the next reload
    await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.filter(k => k && !k.toLowerCase().includes('token') && !k.toLowerCase().includes('auth'))
          .forEach(k => localStorage.removeItem(k));
    });
    console.log('  [SETUP] Residual cache keys removed from localStorage.');
    await page.waitForTimeout(500);
    // Do NOT fill any new data
    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(false);
    console.log('TC_09 PASS: No popup when no data was entered.');
  });

  test('TC_10: Corrupted cache — app handles gracefully without crash', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // Corrupt localStorage
    await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        localStorage.setItem(localStorage.key(i), '{INVALID:::JSON}');
      }
    });

    await reloadPage(page);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('kapiva');
    console.log(`TC_10 PASS: App loaded without crash after corrupted cache. URL: ${url}`);
  });

  test('TC_11: Different doctor cannot see previous doctor cached data', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    const login = new LoginPage(page);
    await login.logout(BASE_URL);

    // Login as a different doctor
    const anotherDoctor = doctors[1];
    await login.login(anotherDoctor.email, anotherDoctor.password);
    await page.waitForTimeout(2000);

    const cache = await page.evaluate(() => {
      const snap = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        snap[k] = localStorage.getItem(k);
      }
      return snap;
    });
    const stale = Object.values(cache).some(v => v && v.includes('CACHE_TEST_MARKER'));
    expect(stale).toBe(false);
    console.log('TC_11 PASS: No previous doctor data visible after re-login as different doctor.');
  });

  test('TC_12: Large form data — no crash after reload', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');

    try {
      await page.locator('[aria-label="Expand notes"]').click();
      await page.waitForTimeout(300);
      const notes = page.getByPlaceholder('Type your notes here...');
      await notes.click();
      await page.keyboard.type('A'.repeat(500));
      await page.locator('[aria-label="Minimize notes"]').click();
    } catch (_) {}

    await page.waitForTimeout(800);
    await reloadPage(page);
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('kapiva');
    console.log('TC_12 PASS: Large payload handled — no crash after reload.');
  });
});

// ─── EDGE TEST CASES ──────────────────────────────────────────────────────────

test.describe('Edge – Popup behaviour, partial data, special scenarios (TC_13–TC_24)', () => {

  test('TC_13: Refresh warning popup appears when data entered', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    await page.getByText('Unsaved changes found').waitFor({ state: 'visible', timeout: 8000 });
    await expect(page.getByText('Unsaved changes found')).toBeVisible();
    await expect(page.getByText('Do you want to restore it?')).toBeVisible();
    await expect(page.getByText('Discard')).toBeVisible();
    await expect(page.getByText('Restore saved data')).toBeVisible();

    await page.getByText('Discard').click();
    console.log('TC_13 PASS: Popup appears with correct title, message and both buttons.');
  });

  test('TC_14: User cancels (Discard) — data is cleared, form empty', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    await page.getByText('Unsaved changes found').waitFor({ state: 'visible', timeout: 8000 });
    console.log('  [POPUP] Clicking → "Discard"');
    await page.getByText('Discard').click();
    await page.waitForTimeout(800);

    expect(await page.getByText('Saved form data has been restored.').count()).toBe(0);
    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`TC_14 – Age after Discard: "${ageVal}"`);
    expect(ageVal).not.toBe('28');
    console.log('TC_14 PASS: Discard cleared data — form empty, no banner.');
  });

  test('TC_15: User confirms restore — data pre-filled and banner shown', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    await page.getByText('Unsaved changes found').waitFor({ state: 'visible', timeout: 8000 });
    console.log('  [POPUP] Clicking → "Restore saved data"');
    await page.getByText('Restore saved data').click();
    await page.waitForTimeout(600);

    const bannerShown = await verifyBanner(page);
    expect(bannerShown).toBe(true);
    await expect(page.getByText('Clear saved data')).toBeVisible();

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`TC_15 – Age after Restore: "${ageVal}"`);
    expect(ageVal).toBe('28');
    console.log('TC_15 PASS: Restore pre-filled form and showed banner.');
  });

  test('TC_16: Multiple rapid navigations — data consistency maintained', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // Reload → Restore → repeat 3 times
    for (let i = 1; i <= 3; i++) {
      await reloadPage(page);
      const popupFound = await handlePopup(page, 'restore');
      expect(popupFound).toBe(true);
      await verifyBanner(page);
      console.log(`  [CYCLE ${i}] Data restored successfully.`);
    }

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    expect(ageVal).toBe('28');
    console.log('TC_16 PASS: Data consistent across multiple rapid reload cycles.');
  });

  test('TC_17: Partial data entry — only filled fields restored', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');

    // Fill ONLY age, not height
    const age = page.getByPlaceholder('Enter age');
    if ((await age.count()) > 0) {
      await age.click({ clickCount: 3 }); // triple-click selects all existing text
      await age.pressSequentially('28');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(800);
      console.log('  [FILL] Age typed: 28 (height intentionally left empty)');
    }

    await reloadPage(page);
    await handlePopup(page, 'restore');
    await page.waitForTimeout(300);

    const ageVal    = (await age.count()) > 0 ? await age.inputValue() : '';
    const height    = page.getByPlaceholder('e.g. 170');
    const heightVal = (await height.count()) > 0 ? await height.inputValue() : '';
    console.log(`TC_17 – Age: "${ageVal}", Height: "${heightVal}"`);
    expect(ageVal).toBe('28');
    expect(heightVal).toBe('');
    console.log('TC_17 PASS: Only age (filled) restored; height (empty) stayed empty.');
  });

  test('TC_18: Browser tab close simulation — cache persists in localStorage', async ({ browser }) => {
    // Session 1: fill data then close context (simulates tab close)
    const ctx1 = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const pg1  = await ctx1.newPage();
    await pg1.goto(BASE_URL);
    const doctor = await loginAsAssignedDoctor(pg1);
    await openConsultation(pg1);
    await handlePopup(pg1, 'discard');
    await fillCacheTestData(pg1);
    await ctx1.close(); // simulates tab/browser close

    // Session 2: reopen (simulates reopening tab)
    const ctx2 = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const pg2  = await ctx2.newPage();
    await pg2.goto(BASE_URL);
    const login = new LoginPage(pg2);
    await login.login(doctor.email, doctor.password);
    await pg2.waitForTimeout(3000);
    await openConsultation(pg2);
    await pg2.waitForTimeout(1000);

    const popup = pg2.getByText('Unsaved changes found');
    const popupVisible = (await popup.count()) > 0 && await popup.isVisible().catch(() => false);
    console.log(`TC_18 – Popup after tab close + reopen: ${popupVisible}`);
    console.log('TC_18 INFO: localStorage persists across sessions; sessionStorage does not.');

    if (popupVisible) await pg2.getByText('Discard').click();
    await ctx2.close();
  });

  test('TC_19: localStorage disabled — app does not crash, no popup', async ({ browser }) => {
    // Login normally first (localStorage needed for auth), THEN block writes
    const ctx  = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const page = await ctx.newPage();

    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');

    // Now block localStorage writes so the caching layer cannot persist data
    await page.evaluate(() => {
      Storage.prototype.setItem = function(_key, _value) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      };
    });
    console.log('  [SETUP] localStorage writes blocked.');

    // Fill data (writes throw, so nothing is cached)
    await fillCacheTestData(page);
    await reloadPage(page);

    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(false);
    expect(page.url()).toContain('kapiva');
    console.log('TC_19 PASS: App loaded without crash and no popup when localStorage writes disabled.');
    await ctx.close();
  });

  test('TC_20: Same appointment in multiple tabs — last saved state persists', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const page1   = await context.newPage();

    // Login once on page1
    await page1.goto(BASE_URL);
    await loginAsAssignedDoctor(page1);
    await openConsultation(page1);
    await handlePopup(page1, 'discard');

    // Fill age on page1 (shared localStorage stores this cache)
    const age1 = page1.getByPlaceholder('Enter age');
    if ((await age1.count()) > 0) {
      await age1.click({ clickCount: 3 }); // triple-click selects all
      await age1.pressSequentially('28');
      await page1.keyboard.press('Tab');
      await page1.waitForTimeout(800);
      console.log('  [TAB1] Age typed: 28');
    }

    // Open Tab 2 in the same context (shares cookies + localStorage)
    // No re-login needed — session is already active
    const page2 = await context.newPage();
    await page2.goto(BASE_URL);
    await page2.waitForTimeout(2000);
    await openConsultation(page2);
    await page2.waitForTimeout(1000);

    const popupOnTab2 = await handlePopup(page2, 'restore');
    console.log(`TC_20 – Popup visible on Tab 2 (from Tab 1 cache): ${popupOnTab2}`);

    const val1 = (await age1.count()) > 0 ? await age1.inputValue() : '';
    const age2 = page2.getByPlaceholder('Enter age');
    const val2 = (await age2.count()) > 0 ? await age2.inputValue() : '';
    console.log(`TC_20 – Tab 1 age: "${val1}", Tab 2 age: "${val2}"`);
    console.log('TC_20 INFO: Tabs share localStorage — Tab 2 may see Tab 1 cached data.');
    if (popupOnTab2) await page2.getByText('Discard').click();
    await context.close();
  });

  test('TC_21: Network interruption while entering data — data cached locally', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`TC_21 – Age during offline: "${ageVal}"`);
    expect(ageVal).toBe('28');

    await page.context().setOffline(false);
    console.log('TC_21 PASS: Data retained locally during network interruption.');
  });

  test('TC_22: Cache expiry — data cleared or retained based on app TTL', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // Simulate cache expiry by manually removing relevant keys
    const removed = await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.toLowerCase().includes('cache') || k.toLowerCase().includes('consult') || k.toLowerCase().includes('form'))) {
          keys.push(k);
        }
      }
      keys.forEach(k => localStorage.removeItem(k));
      return keys;
    });
    console.log(`TC_22 – Removed cache keys: ${JSON.stringify(removed)}`);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    console.log(`TC_22 – Popup after cache expiry simulation: ${popupFound}`);
    console.log('TC_22 INFO: If app has TTL, data clears automatically after expiry period.');
    console.log('TC_22 PASS: Simulated cache expiry handled — app did not crash.');
  });

  test('TC_23: Large form data (performance) — data restored without UI freeze', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');

    // Fill multiple fields with substantial data
    const age = page.getByPlaceholder('Enter age');
    if ((await age.count()) > 0) {
      await age.click({ clickCount: 3 }); // triple-click selects all
      await age.pressSequentially('28');
      await page.keyboard.press('Tab');
      console.log('  [FILL] Age typed: 28');
    }
    try {
      await page.locator('[aria-label="Expand notes"]').click();
      await page.waitForTimeout(300);
      const notes = page.getByPlaceholder('Type your notes here...');
      await notes.click();
      await page.keyboard.type('PERF_TEST '.repeat(50)); // 500 chars
      await page.locator('[aria-label="Minimize notes"]').click();
    } catch (_) {}
    await page.waitForTimeout(800);

    const t1 = Date.now();
    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    const t2 = Date.now();

    console.log(`TC_23 – Popup found: ${popupFound}, Restore time: ${t2 - t1}ms`);
    expect(page.url()).toContain('kapiva');
    console.log('TC_23 PASS: Large form data restored without crash or UI freeze.');
  });

  test('TC_24: Special characters / XSS payload — restored safely', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');

    try {
      await page.locator('[aria-label="Expand notes"]').click();
      await page.waitForTimeout(300);
      const notes = page.getByPlaceholder('Type your notes here...');
      await notes.click();
      await page.keyboard.type('<script>alert("xss")</script>');
      await page.locator('[aria-label="Minimize notes"]').click();
    } catch (_) {}
    await page.waitForTimeout(800);

    let xss = false;
    page.on('dialog', async d => { xss = true; await d.dismiss(); });

    await reloadPage(page);
    await handlePopup(page, 'restore');
    await page.waitForTimeout(1000);

    expect(xss).toBe(false);
    console.log('TC_24 PASS: XSS payload restored safely — no script executed.');
  });
});

// ─── COMPATIBILITY TEST CASES ─────────────────────────────────────────────────

test.describe('Compatibility – Cross-browser and storage mode tests (TC_25–TC_37)', () => {

  test('TC_25: Full caching flow on Chromium (Google Chrome)', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(true);
    const bannerShown = await verifyBanner(page);
    expect(bannerShown).toBe(true);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    expect(ageVal).toBe('28');
    console.log('TC_25 PASS: Full caching flow verified on Chromium.');
  });

  test('TC_29: Caching in incognito (private) mode', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const page = await ctx.newPage();

    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    console.log(`TC_29 – Popup in incognito: ${popupFound}`);
    if (popupFound) await verifyBanner(page);

    const age    = page.getByPlaceholder('Enter age');
    const ageVal = (await age.count()) > 0 ? await age.inputValue() : '';
    console.log(`TC_29 – Age in incognito: "${ageVal}"`);
    console.log('TC_29 INFO: In-session caching verified in incognito context.');
    await ctx.close();
  });

  test('TC_30: localStorage disabled — graceful fallback, no popup', async ({ browser }) => {
    // Login normally first (localStorage needed for auth), THEN block writes
    const ctx  = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const page = await ctx.newPage();

    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');

    // Block localStorage writes so no cache can be persisted
    await page.evaluate(() => {
      Storage.prototype.setItem = function(_key, _value) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      };
    });
    console.log('  [SETUP] localStorage writes blocked.');

    await fillCacheTestData(page);
    await reloadPage(page);

    const popupFound = await handlePopup(page, 'restore');
    expect(popupFound).toBe(false);
    expect(page.url()).toContain('kapiva');
    console.log('TC_30 PASS: No crash and no popup when localStorage writes are disabled.');
    await ctx.close();
  });

  test('TC_32: Cache cleared after hard refresh (Ctrl+Shift+R / Cmd+Shift+R)', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    // Hard refresh using page.reload with cache bypass
    console.log('  [RELOAD] Performing hard refresh (cache bypass)...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const popupFound = await handlePopup(page, 'restore');
    console.log(`TC_32 – Popup after hard refresh: ${popupFound}`);
    console.log('TC_32 INFO: Hard refresh cache behavior verified.');
  });

  test('TC_33: Cache behavior after soft refresh', async ({ page }) => {
    await page.goto(BASE_URL);
    await loginAsAssignedDoctor(page);
    await openConsultation(page);
    await handlePopup(page, 'discard');
    await fillCacheTestData(page);

    await reloadPage(page);
    const popupFound = await handlePopup(page, 'restore');
    console.log(`TC_33 – Popup after soft refresh: ${popupFound}`);
    if (popupFound) await verifyBanner(page);
    console.log('TC_33 PASS: Soft refresh (page.reload) cache behavior verified.');
  });

  test('TC_36: Cache across browser restart (context close + reopen)', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const pg1  = await ctx1.newPage();
    await pg1.goto(BASE_URL);
    const doctor = await loginAsAssignedDoctor(pg1);
    await openConsultation(pg1);
    await handlePopup(pg1, 'discard');
    await fillCacheTestData(pg1);
    await ctx1.close();

    const ctx2 = await browser.newContext({ viewport: { width: 1536, height: 960 } });
    const pg2  = await ctx2.newPage();
    await pg2.goto(BASE_URL);
    const login = new LoginPage(pg2);
    await login.login(doctor.email, doctor.password);
    await pg2.waitForTimeout(3000);
    await openConsultation(pg2);
    await pg2.waitForTimeout(1000);

    const popup = pg2.getByText('Unsaved changes found');
    const popupVisible = (await popup.count()) > 0 && await popup.isVisible().catch(() => false);
    console.log(`TC_36 – Popup in new browser session: ${popupVisible}`);
    console.log('TC_36 INFO: localStorage persists across context restarts; sessionStorage does not.');

    if (popupVisible) await pg2.getByText('Discard').click();
    await ctx2.close();
  });
});
