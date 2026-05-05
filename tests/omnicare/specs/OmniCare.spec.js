/**
 * OmniCare – Kapiva Staging E2E Flow
 *
 * Validates:
 *  1. Mobile viewport launch
 *  2. Initial testing-site popup dismissed
 *  3. Navigate to "Blood Sugar & Chronic Care" category
 *  4. Click "View All" and dismiss popup via X
 *  5. Select "Dia Free Juice - Blood Sugar Management"
 *  6. Assert banner image (PDP-main-b-e.png) is visible
 *  7. Click "How it works"
 *  8. Assert benefits image (benefits-img-e-3.png) is visible
 */

const { test, expect } = require('@playwright/test');
const OmniCarePage = require('../pages/OmniCarePage');

const BASE_URL = 'https://staging.kapiva.in/';

test.describe('OmniCare – Blood Sugar & Chronic Care Product Flow', () => {
  // ── Run all tests in this suite in iPhone 12 mobile viewport ──────────────
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 12
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) ' +
      'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });

  test('Verify Dia Free Juice PDP banner and benefits images', async ({ page }) => {
    const omniCare = new OmniCarePage(page);

    // ── Step 1: Open in Mobile View ──────────────────────────────────────────
    console.log('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 1 — Opening URL in mobile view (iPhone 12)');
    console.log(`           URL: ${BASE_URL}`);
    await omniCare.navigate(BASE_URL);
    console.log('  STEP 1 ✅ Page loaded in mobile viewport (390×844).');

    // ── Step 2: Handle initial "KAPIVA - TESTING" popup ──────────────────────
    console.log('\n  STEP 2 — Closing initial testing-site popup...');
    await omniCare.closePopupIfPresent();
    console.log('  STEP 2 ✅ Initial popup dismissed.');

    // ── Step 3: Navigate to "Blood Sugar & Chronic Care" category ────────────
    console.log('\n  STEP 3 — Clicking "Blood Sugar & Chronic Care"...');
    await omniCare.clickBloodSugarCategory();
    await page.waitForTimeout(2000);
    console.log(`  STEP 3 ✅ Navigated. Current URL: ${page.url()}`);

    // ── Step 4: Click "View All" then close popup via X ──────────────────────
    console.log('\n  STEP 4 — Clicking "View All" and closing popup by X...');
    await omniCare.clickViewAll();
    await omniCare.closePopupByX();
    await page.waitForTimeout(1000);
    console.log(`  STEP 4 ✅ Product listing visible. URL: ${page.url()}`);

    // ── Step 5: Select "Dia Free Juice" and close popup ───────────────────────
    console.log('\n  STEP 5 — Selecting "Dia Free Juice - Blood Sugar Management"...');
    await omniCare.selectDiaFreeJuice();
    await omniCare.closePopupIfPresent();
    await page.waitForTimeout(1500);
    console.log(`  STEP 5 ✅ Product page opened. URL: ${page.url()}`);

    // ── Step 6: Verify banner image ───────────────────────────────────────────
    console.log('\n  STEP 6 — Verifying banner image (PDP-main-b-e.png)...');
    const bannerVisible = await omniCare.verifyBannerImage();
    expect(bannerVisible, 'Banner image (PDP-main-b-e.png) should be visible on PDP').toBe(true);
    console.log('  STEP 6 ✅ Banner image is visible.');

    // ── Step 7: Click "How it works" ─────────────────────────────────────────
    console.log('\n  STEP 7 — Clicking "How it works"...');
    await omniCare.clickHowItWorks();
    console.log('  STEP 7 ✅ "How it works" section expanded.');

    // ── Step 8: Verify benefits image ─────────────────────────────────────────
    console.log('\n  STEP 8 — Verifying benefits image (benefits-img-e-3.png)...');
    const benefitsVisible = await omniCare.verifyBenefitsImage();
    expect(benefitsVisible, 'Benefits image (benefits-img-e-3.png) should be visible after "How it works" is clicked').toBe(true);
    console.log('  STEP 8 ✅ Benefits image is visible.');

    // ── Step 8a: Close "How it works" section ────────────────────────────────
    console.log('\n  STEP 8a — Closing "How it works" section...');
    await omniCare.closeHowItWorks();
    console.log('  STEP 8a ✅ "How it works" section closed.');

    // ── Step 9: Verify rotating offer texts above BUY NOW ─────────────────────
    console.log('\n  STEP 9 — Verifying rotating offer texts above BUY NOW...');
    const offerResults = await omniCare.verifyOfferTexts();
    expect(offerResults['WORLD DIABETES DAY OFFER'],
      '"WORLD DIABETES DAY OFFER" text should be present in the offer ticker').toBe(true);
    expect(offerResults['INCLUDES 3 FREE CONSULTATIONS'],
      '"INCLUDES 3 FREE CONSULTATIONS" text should be present in the offer ticker').toBe(true);
    console.log('  STEP 9 ✅ Both offer texts verified.');

    // ── Step 10: Click BUY NOW ────────────────────────────────────────────────
    console.log('\n  STEP 10 — Clicking "BUY NOW"...');
    await omniCare.clickBuyNow();
    console.log(`  STEP 10 ✅ BUY NOW clicked. URL: ${page.url()}`);

    // ── Step 11: Handle checkout popup (close via X) ──────────────────────────
    console.log('\n  STEP 11 — Handling post-BUY NOW popup...');
    await omniCare.handleCheckoutPopup();
    console.log('  STEP 11 ✅ Checkout popup dismissed.');

    console.log('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ALL STEPS PASSED ✅');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
