/**
 * OmniCarePage – Page Object for Kapiva Staging Store
 * Covers: popup handling, category navigation, product selection,
 *         banner/benefits image assertions.
 */
class OmniCarePage {
  constructor(page) {
    this.page = page;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  /**
   * Opens the staging URL and installs a route interceptor that rewrites
   * any accidental navigation to production (kapiva.in) back to staging
   * (staging.kapiva.in) for the entire life of this page.
   */
  async navigate(url = 'https://staging.kapiva.in/') {
    // ── Intercept ONLY exact production domain (regex avoids staging.kapiva.in) ──
    await this.page.route(/^https?:\/\/kapiva\.in(\/|$)/, async (route) => {
      const original  = route.request().url();
      const isRootNav =
        /^https?:\/\/kapiva\.in\/?$/.test(original) &&
        route.request().resourceType() === 'document';

      if (isRootNav) {
        // The popup body contains <a href="http://kapiva.in/">kapiva.in</a>.
        // Abort this navigation so we stay on the current page (product / category).
        console.log(`  [INTERCEPT] Aborted root redirect: ${original}`);
        await route.abort();
        return;
      }

      // All other production URLs → rewrite to staging
      const stagingUrl = original.replace('://kapiva.in', '://staging.kapiva.in');
      console.log(`  [INTERCEPT] ${original} → ${stagingUrl}`);
      await route.continue({ url: stagingUrl });
    });

    // ── Auto-close the KAPIVA-TESTING popup on EVERY page load ──────────────
    // Targets only <button> elements so the "kapiva.in" text link in the
    // popup body is never accidentally clicked (which would cause a redirect loop).
    // observer.disconnect() after one successful click prevents repeated firing.
    await this.page.addInitScript(() => {
      let closed = false;

      function tryCloseKapivaPopup() {
        if (closed) return;

        const containers = document.querySelectorAll('div, section, aside');

        // Find the SMALLEST container that has the popup text.
        // Large wrappers (body, page root) also contain "KAPIVA"+"TESTING" but
        // are not the popup itself — we want the tightest bounding box.
        let bestContainer = null;
        let bestArea = Infinity;

        for (const container of containers) {
          const text = (container.innerText || '').trim();
          if (
            text.includes('KAPIVA') &&
            (text.includes('testing') || text.includes('TESTING'))
          ) {
            const rect = container.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > 100 && area < bestArea) {
              bestArea = area;
              bestContainer = container;
            }
          }
        }

        if (!bestContainer) return;

        // ── Only click an SVG that is the X cross icon ─────────────────────
        // The X icon uses <line> elements. WhatsApp / social icons use <path>.
        // We search ONLY inside the popup container (bestContainer).
        const svgs = bestContainer.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.querySelector('line')) {
            // This SVG has crossing line elements — it's the X close button.
            // Always resolve to the parent <button> so .click() is always valid.
            const btn = /** @type {HTMLElement} */ (svg.closest('button') || svg.parentElement || svg);
            btn.click();
            closed = true;
            observer.disconnect();
            return;
          }
        }

        // Fallback: first <button> DIRECTLY inside the popup (not a nested nav button)
        const btn = bestContainer.querySelector('button');
        if (btn) {
          btn.click();
          closed = true;
          observer.disconnect();
        }
      }

      const observer = new MutationObserver(tryCloseKapivaPopup);

      const attach = () => {
        observer.observe(document.body, { childList: true, subtree: true });
        tryCloseKapivaPopup();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
      } else {
        attach();
      }
    });

    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    console.log(`  [NAV] Opened (staging): ${url}`);
  }

  // ─── Popup helpers ────────────────────────────────────────────────────────────

  /**
   * Closes any visible popup / modal overlay.
   *
   * Strategy order:
   *  1. Wait up to 3 s for a known popup text to appear
   *  2. Look for a close button INSIDE the modal that contains the popup text
   *  3. Try a broad list of common close-button patterns across the whole page
   *  4. Click the backdrop (outside the modal box)
   *  5. Press Escape as a last resort
   */
  async closePopupIfPresent() {
    try {
      // Wait up to 3 s for any overlay to appear
      await this.page.waitForTimeout(3000);

      // ── Strategy 1: target the exact SVG X icon inside the Kapiva popup ──
      const popupTexts = ['KAPIVA - TESTING', 'testing website', 'kapiva.in to order'];
      for (const txt of popupTexts) {
        const container = this.page.locator('div, section').filter({ hasText: txt }).last();
        if ((await container.count()) > 0) {
          console.log(`  [POPUP] Detected popup with text: "${txt}"`);

          // 1a. SVG that has <line> children = X cross icon (not WhatsApp/social icons)
          const svgs = await container.locator('svg').all();
          for (const svg of svgs) {
            const hasLines = await svg.locator('line').count() > 0;
            if (hasLines && await svg.isVisible({ timeout: 300 }).catch(() => false)) {
              await svg.click({ force: true });
              await this.page.waitForTimeout(800);
              console.log('  [POPUP] ✅ Closed via SVG X icon (line-based cross).');
              return true;
            }
          }

          // 1b. Fallback: first button inside the popup (never an <a> link)
          const closeInModal = container.locator('button').first();
          if ((await closeInModal.count()) > 0) {
            await closeInModal.click({ force: true });
            await this.page.waitForTimeout(800);
            console.log('  [POPUP] ✅ Closed via first button inside popup container.');
            return true;
          }
        }
      }

      // ── Strategy 2: common class/aria patterns page-wide ──────────────────
      const candidates = [
        '[aria-label="close"]',
        '[aria-label="Close"]',
        '[class*="close-btn"]',
        '[class*="closeBtn"]',
        '[class*="close-button"]',
        '[class*="closeButton"]',
        '[class*="modal-close"]',
        '[class*="popup-close"]',
        'button.close',
        '.close',
        'button:has-text("×")',
        'button:has-text("✕")',
        'button:has-text("Close")',
        'img[alt="close"]',
      ];

      for (const selector of candidates) {
        try {
          const el = this.page.locator(selector).first();
          if ((await el.count()) > 0 && await el.isVisible({ timeout: 500 }).catch(() => false)) {
            await el.click({ force: true });
            await this.page.waitForTimeout(600);
            console.log(`  [POPUP] ✅ Closed via: ${selector}`);
            return true;
          }
        } catch (_) {}
      }

      // ── Strategy 3: JS — click button inside any fixed/modal overlay ──────
      const closed = await this.page.evaluate(() => {
        const overlays = document.querySelectorAll(
          '[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"]'
        );
        for (const overlay of overlays) {
          if (overlay.getBoundingClientRect().height > 0) {
            const btn = overlay.querySelector('button, [class*="close"], [class*="cross"]');
            if (btn) { btn.click(); return true; }
          }
        }
        return false;
      });
      if (closed) {
        await this.page.waitForTimeout(600);
        console.log('  [POPUP] ✅ Closed via JS evaluate on overlay.');
        return true;
      }

      // ── Strategy 4: Escape ─────────────────────────────────────────────────
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      console.log('  [POPUP] Sent Escape key (popup may or may not have closed).');
      return false;

    } catch (e) {
      if (e.message && e.message.includes('closed')) {
        console.log('  [POPUP] ⚠️ Page closed during popup handling — skipping.');
        return false;
      }
      throw e;
    }
  }

  /**
   * Closes a popup by its X / cross icon (used after "View All" and on PDP).
   * Scopes all selectors INSIDE the popup container to avoid hitting page-wide
   * elements like the WhatsApp floating button (which also uses SVG + w-[18px]).
   */
  async closePopupByX() {
    await this.page.waitForTimeout(1500);

    // ── Strategy 1: scope to the Kapiva popup container ─────────────────────
    const popupTexts = ['KAPIVA - TESTING', 'testing website', 'kapiva.in to order'];
    for (const txt of popupTexts) {
      const container = this.page.locator('div, section').filter({ hasText: txt }).last();
      if ((await container.count()) > 0) {
        // 1a. SVG X icon scoped inside the popup (NOT page-wide)
        const svgX = container.locator('svg').first();
        if ((await svgX.count()) > 0 && await svgX.isVisible({ timeout: 800 }).catch(() => false)) {
          await svgX.click({ force: true });
          await this.page.waitForTimeout(600);
          console.log('  [POPUP-X] ✅ Closed via SVG X icon (scoped inside popup).');
          return true;
        }
        // 1b. Any button inside the popup
        const btn = container.locator('button').first();
        if ((await btn.count()) > 0 && await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click({ force: true });
          await this.page.waitForTimeout(600);
          console.log('  [POPUP-X] ✅ Closed via button inside popup container.');
          return true;
        }
      }
    }

    // ── Strategy 2: JS click on close button inside any overlay ─────────────
    const closed = await this.page.evaluate(() => {
      const overlays = document.querySelectorAll(
        '[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"]'
      );
      for (const overlay of overlays) {
        if (overlay.getBoundingClientRect().height > 0) {
          const btn = overlay.querySelector('button, [class*="close"], [class*="cross"]');
          if (btn) { btn.click(); return true; }
        }
      }
      return false;
    });
    if (closed) {
      await this.page.waitForTimeout(600);
      console.log('  [POPUP-X] ✅ Closed via JS evaluate on overlay.');
      return true;
    }

    // Escape as last resort
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    console.log('  [POPUP-X] Sent Escape key.');
    return false;
  }

  // ─── Category & listing ───────────────────────────────────────────────────────

  async clickBloodSugarCategory() {
    // The category label varies by viewport / site version:
    // desktop: "Blood Sugar & Chronic Care"  |  mobile: "Sugar Management"
    const textVariants = [
      'Blood Sugar & Chronic Care',
      'Blood Sugar',
      'Sugar Management',
      'Diabetes',
      'Blood Sugar Management',
    ];

    // Scroll progressively to surface lazy-loaded categories
    for (let pass = 0; pass < 10; pass++) {
      for (const variant of textVariants) {
        const el = this.page.getByText(variant, { exact: false }).first();
        if ((await el.count()) > 0 && await el.isVisible().catch(() => false)) {
          await el.scrollIntoViewIfNeeded();
          await el.click({ force: true });
          await this.page.waitForTimeout(2000);
          console.log(`  [NAV] Clicked category: "${variant}"`);
          return;
        }
      }
      // Scroll down a bit and retry
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.page.waitForTimeout(400);
    }

    // Hard fallback: try JS click on any element whose text matches
    const clicked = await this.page.evaluate((variants) => {
      const all = [...document.querySelectorAll('a, button, span, div, li')];
      for (const v of variants) {
        const el = all.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(v.toLowerCase()));
        if (el) { el.click(); return v; }
      }
      return null;
    }, textVariants);

    if (clicked) {
      await this.page.waitForTimeout(2000);
      console.log(`  [NAV] Clicked category via JS: "${clicked}"`);
      return;
    }

    throw new Error(
      `Could not find category. Tried: ${textVariants.join(', ')}`
    );
  }

 async clickViewAll() {
    const btn = this.page.getByText('View all', { exact: true }).first();

    await btn.waitFor({ state: 'visible', timeout: 15000 });

    // Scroll down in small steps until "View all" is visible
    console.log('  [SCROLL] Scrolling page down to bring "View all" into view...');
    for (let i = 0; i < 60; i++) {
      const box = await btn.boundingBox();
      // Adjust check: we want it to be well above the bottom to avoid floating icons
      if (box && box.y > 0 && box.y + box.height < (this.page.viewportSize()?.height ?? 844) - 150) {
        console.log(`  [SCROLL] ✅ "View all" is visible and clear of footer icons.`);
        break;
      }
      await this.page.evaluate(() => window.scrollBy(0, 80));
      await this.page.waitForTimeout(120);
    }

    // EXTRA FIX: If it's still being blocked, move it to the TOP of the screen
    await btn.scrollIntoViewIfNeeded(); 
    // This pushes the element to the top/middle, away from the bottom-right WhatsApp icon.

    await this.page.waitForTimeout(600);
    
    // Use a regular click first; if it fails, the {force: true} you already have 
    // will bypass the "interception" check, but scrolling is the cleaner fix.
    await btn.click({ force: true });
    await this.page.waitForTimeout(3000);
    console.log('  [NAV] Clicked "View All"');
  }
  // ─── Product page ─────────────────────────────────────────────────────────────

  async selectDiaFreeJuice() {
    const productText = 'Dia Free Juice';

    // Scroll down progressively to surface lazy-rendered products
    for (let i = 0; i < 8; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 400));
      await this.page.waitForTimeout(500);

      const card = this.page
        .locator('[class*="product"], [class*="card"], a')
        .filter({ hasText: productText })
        .first();

      if ((await card.count()) > 0 && await card.isVisible().catch(() => false)) {
        await card.scrollIntoViewIfNeeded();
        await card.click({ force: true });
        // Wait for navigation + give MutationObserver time to auto-close popup
        await this.page.waitForTimeout(3000);
        console.log(`  [NAV] Clicked product: "${productText}"`);
        await this._closeMilestonePopup('product page load');
        return;
      }
    }

    // Fallback: any element with "Dia Free Juice" text
    const fallback = this.page.getByText(productText, { exact: false }).first();
    await fallback.waitFor({ state: 'visible', timeout: 15000 });
    await fallback.scrollIntoViewIfNeeded();
    await fallback.click({ force: true });
    await this.page.waitForTimeout(3000);
    console.log(`  [NAV] Clicked product (fallback): "${productText}"`);
    await this._closeMilestonePopup('product page load');
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  /**
   * Scrolls until the banner image is in view and asserts it is visible.
   * Banner src: ...omni-care-v2/PDP-main-b-e.png
   */
  async verifyBannerImage() {
    const img = this.page.locator('img[src*="PDP-main-b-e.png"]');

    // Scroll down to find the image (it may be below the fold)
    for (let i = 0; i < 8; i++) {
      if ((await img.count()) > 0 && await img.isVisible().catch(() => false)) break;
      await this.page.evaluate(() => window.scrollBy(0, 350));
      await this.page.waitForTimeout(400);
    }

    await img.waitFor({ state: 'visible', timeout: 15000 });
    const visible = await img.isVisible();
    console.log(`  [ASSERT] Banner image (PDP-main-b-e.png) visible: ${visible}`);
    return visible;
  }

  async clickHowItWorks() {
    const btn = this.page.getByText('How it works', { exact: false }).first();

    // Scroll to find the button
    for (let i = 0; i < 6; i++) {
      if ((await btn.count()) > 0 && await btn.isVisible().catch(() => false)) break;
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.page.waitForTimeout(400);
    }

    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });

    // Wait for the accordion/section content to expand
    await this.page.waitForFunction(
      () => document.querySelector('img[src*="benefits-img-e-3.png"]') !== null,
      { timeout: 10000 }
    ).catch(() => console.log('  [WAIT] Benefits image not in DOM yet — continuing.'));

    await this.page.waitForTimeout(1000);
    console.log('  [ACTION] Clicked "How it works"');
  }

  /**
   * Collapses the "How it works" accordion by clicking the button again,
   * then scrolls back up so the page is ready for the next action.
   */
  async closeHowItWorks() {
    const btn = this.page.getByText('How it works', { exact: false }).first();

    for (let i = 0; i < 6; i++) {
      if ((await btn.count()) > 0 && await btn.isVisible().catch(() => false)) break;
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.page.waitForTimeout(400);
    }

    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
    await this.page.waitForTimeout(800);

    // Scroll back to top so the sticky BUY NOW bar is reachable
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);
    console.log('  [ACTION] "How it works" section collapsed.');
  }

  /**
   * Verifies the benefits image is visible after "How it works" is expanded.
   * Benefits src: ...omni-care-v2/benefits-img-e-3.png
   */
  async verifyBenefitsImage() {
    const img = this.page.locator('img[src*="benefits-img-e-3.png"]');

    // Scroll to bring the image into view
    for (let i = 0; i < 6; i++) {
      if ((await img.count()) > 0 && await img.isVisible().catch(() => false)) break;
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.page.waitForTimeout(400);
    }

    await img.waitFor({ state: 'visible', timeout: 15000 });
    const visible = await img.isVisible();
    console.log(`  [ASSERT] Benefits image (benefits-img-e-3.png) visible: ${visible}`);
    return visible;
  }

  // ─── Offer ticker verification ────────────────────────────────────────────────

  /**
   * Verifies that both rotating offer texts are present in the page DOM
   * (in the sticky bar above the BUY NOW button). The ticker cycles through
   * slides so we check the full DOM text rather than only the visible slide.
   *
   * Texts verified:
   *   • "WORLD DIABETES DAY OFFER: 500ml"
   *   • "INCLUDES 3 FREE CONSULTATIONS"
   */
  async verifyOfferTexts() {
    const offerTexts = [
      'WORLD DIABETES DAY OFFER',
      'INCLUDES 3 FREE CONSULTATIONS',
    ];

    // Scroll toward the sticky bottom bar where the offer ticker lives
    for (let i = 0; i < 12; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.page.waitForTimeout(300);
    }

    // Wait a moment for the ticker to mount its slides
    await this.page.waitForTimeout(2000);

    // Read the full DOM text of the page (includes hidden/rotating slides)
    const pageText = await this.page.evaluate(() => document.body.innerText);

    const results = {};
    for (const txt of offerTexts) {
      const found = pageText.includes(txt);
      results[txt] = found;
      console.log(`  [ASSERT] Offer text "${txt}" found in DOM: ${found}`);
    }
    return results;
  }

  // ─── Buy Now ──────────────────────────────────────────────────────────────────

  /**
   * Clicks the "BUY NOW" button in the PDP sticky bar.
   * Uses JS evaluate so the click is never blocked by viewport/interception issues.
   */
  async clickBuyNow() {
    // Scroll to a mid-page position so the sticky bar is fully rendered
    await this.page.evaluate(() => window.scrollTo(0, 500));
    await this.page.waitForTimeout(800);

    // Try JS click on the actual <button> or <a> element containing "BUY NOW"
    const clicked = await this.page.evaluate(() => {
      const allButtons = [...document.querySelectorAll('button, a')];
      const buyNow = allButtons.find(el => {
        const text = (el.innerText || el.textContent || '').trim().toUpperCase();
        return text === 'BUY NOW' || text.includes('BUY NOW');
      });
      if (buyNow) {
        buyNow.click();
        return (buyNow.innerText || buyNow.textContent || '').trim();
      }
      return null;
    });

    if (clicked) {
      await this.page.waitForTimeout(3000);
      console.log(`  [ACTION] Clicked "BUY NOW" via JS (matched: "${clicked}")`);
      return;
    }

    // Playwright fallback in case JS evaluate didn't find it
    const btn = this.page.locator('button, a').filter({ hasText: /buy now/i }).first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await btn.click({ force: true });
    await this.page.waitForTimeout(3000);
    console.log('  [ACTION] Clicked "BUY NOW" via Playwright fallback');
  }

  // ─── Checkout popup + address ─────────────────────────────────────────────────

  /**
   * After BUY NOW a Milestone carousel popup appears (Slide 1, 2, 3…).
   * Delegates to the shared _closeMilestonePopup helper.
   */
  async handleCheckoutPopup() {
    await this._closeMilestonePopup('BUY NOW');
    console.log('  [POPUP] Checkout popup handled.');
  }

  /**
   * Shared helper — waits for the Milestone popup, scrolls through every
   * slide using the ">" next arrow, then closes via button[aria-label='Close'].
   *
   * @param {string} context  Label used in console logs for traceability.
   */
  async _closeMilestonePopup(context = '') {
    const closeBtn = this.page.locator("//button[@aria-label='Close']//*[name()='svg']");
    const POLL_MS  = 500;
    const MAX_MS   = 15000;
    let elapsed    = 0;

    console.log(`  [MILESTONE] Watching for popup${context ? ` (after ${context})` : ''} — up to 15 s...`);

    // Wait for popup to appear
    while (elapsed < MAX_MS) {
      if (await closeBtn.isVisible().catch(() => false)) break;
      await this.page.waitForTimeout(POLL_MS);
      elapsed += POLL_MS;
    }

    if (elapsed >= MAX_MS) {
      console.log(`  [MILESTONE] No popup appeared within ${MAX_MS / 1000} s — skipping.`);
      return;
    }

    // Scroll through all slides using the ">" next button
    let slide = 1;
    console.log(`  [MILESTONE] Popup detected. Scrolling through slides...`);

    while (true) {
      // Look for a "next" arrow button (">") inside the popup
      const nextBtn = await this.page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')];
        // The next arrow is the rightmost/last navigation button in the popup
        // It typically contains ">" or a right-pointing SVG chevron
        const next = buttons.find(btn => {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          const text  = (btn.innerText || '').trim();
          return label.includes('next') || label.includes('right') || text === '>' || text === '›';
        });
        if (next) { next.click(); return true; }
        return false;
      });

      if (nextBtn) {
        console.log(`  [MILESTONE] Moved to slide ${++slide}.`);
        await this.page.waitForTimeout(800);
      } else {
        // No next button found — we're on the last slide
        break;
      }

      // Safety cap: max 10 slides
      if (slide > 10) break;
    }

    // Now close the popup
    console.log(`  [MILESTONE] On last slide. Clicking Close...`);
    await this.page.evaluate(() => {
      const btn = document.querySelector("button[aria-label='Close']");
      if (btn) btn.click();
    });
    await this.page.waitForTimeout(800);
    console.log(`  [MILESTONE] ✅ Milestone popup closed after ${slide} slide(s).`);
  }

  /**
   * Adds a delivery address on the checkout / cart page.
   *
   * - If an address card is already visible, skips the form.
   * - If not, clicks the first "+Add" / "Add new address" button and fills the form.
   *
   * Edit the values passed from the spec file at the top of OmniCare.spec.js.
   *
   * @param {{ name: string, phone: string, email: string, address: string, pincode: string }} details
   */
  async fillAddressIfNeeded(details) {
    await this.page.waitForTimeout(2000);

    // ── Check whether an address is already saved ──────────────────────────
    const savedAddress = this.page.locator(
      '[class*="address-card"], [class*="addressCard"], [class*="saved-address"]'
    ).first();

    if ((await savedAddress.count()) > 0 && await savedAddress.isVisible().catch(() => false)) {
      console.log('  [ADDRESS] Saved address found — skipping form fill.');
      return;
    }

    // ── Click "+ Add" / "Add new address" button ───────────────────────────
    const addBtnCandidates = [
      this.page.getByText('+Add', { exact: false }).first(),
      this.page.getByText('+ Add', { exact: false }).first(),
      this.page.getByText('Add new address', { exact: false }).first(),
      this.page.getByText('Add Address', { exact: false }).first(),
      this.page.locator('button').filter({ hasText: /\+\s*add/i }).first(),
    ];

    let addClicked = false;
    for (const btn of addBtnCandidates) {
      if ((await btn.count()) > 0 && await btn.isVisible().catch(() => false)) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ force: true });
        await this.page.waitForTimeout(2000);
        console.log('  [ADDRESS] Clicked "+Add" button.');
        addClicked = true;
        break;
      }
    }

    if (!addClicked) {
      console.log('  [ADDRESS] ⚠️  "+Add" button not found — form may already be open.');
    }

    // ── Fill each field (all selectors scoped to input/textarea only) ─────
    await this._fillField(['input[name="name"]', 'input[placeholder*="Name" i]', 'input[placeholder*="Full name" i]'], details.name);
    await this._fillField(['input[name="phone"]', 'input[name="mobile"]', 'input[placeholder*="Phone" i]', 'input[placeholder*="Mobile" i]'], details.phone);
    await this._fillField(['input[name="email"]', 'input[placeholder*="Email" i]'], details.email);
    await this._fillField(['input[name="pincode"]', 'input[name="zip"]', 'input[placeholder*="Pincode" i]', 'input[placeholder*="PIN" i]'], details.pincode);
    await this._fillField(
      ['input[name="address"]', 'input[name="address1"]', 'input[placeholder*="Address" i]', 'input[placeholder*="House" i]', 'textarea'],
      details.address
    );

    await this.page.waitForTimeout(500);
    console.log('  [ADDRESS] ✅ Address form filled.');
  }

  /**
   * Tries each selector in order and fills the first input found.
   * Uses JS evaluate to set the value directly — bypasses viewport/scroll
   * issues completely, works for React-controlled inputs via native setter.
   * @private
   */
  async _fillField(selectors, value) {
    for (const sel of selectors) {
      const filled = await this.page.evaluate(({ selector, val }) => {
        const input = document.querySelector(selector);
        if (!input || (input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA')) return false;

        // Use React's native input value setter so onChange fires
        const nativeSetter =
          Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
          Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

        if (nativeSetter) {
          nativeSetter.call(input, val);
        } else {
          input.value = val;
        }

        input.dispatchEvent(new Event('input',  { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, { selector: sel, val: value });

      if (filled) {
        await this.page.waitForTimeout(300);
        console.log(`  [FORM] Filled "${sel}" → "${value}"`);
        return;
      }
    }
    console.log(`  [FORM] ⚠️  No matching field found for value "${value}"`);
  }
}

module.exports = OmniCarePage;
