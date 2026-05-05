/**
 * CheckoutPage – Page Object for Kapiva Staging Checkout Flow
 *
 * Covers the guest checkout steps after clicking BUY NOW:
 *   • Phone entry + Send OTP (arrow button)
 *   • Pencil / edit icon click on OTP screen
 *   • Phone re-entry + Send OTP again
 *   • Manual OTP entry wait (detects saved address or address form)
 *   • New address form fill
 *   • Coupon / promo code apply
 */

class CheckoutPage {
  constructor(page) {
    this.page = page;
  }

  // ─── Phone + OTP ──────────────────────────────────────────────────────────────

  /**
   * Enters the phone number into the checkout phone field.
   * @param {string} phone  10-digit mobile number
   */
  async enterPhone(phone) {
    const filled = await this._fillField(
      ['input[type="tel"]', 'input[name="phone"]', 'input[name="mobile"]',
       'input[placeholder*="phone" i]', 'input[placeholder*="mobile" i]',
       'input[placeholder*="number" i]'],
      phone
    );
    if (filled) {
      console.log(`  [CHECKOUT] Phone entered: ${phone}`);
    } else {
      console.log('  [CHECKOUT] ⚠️  Phone input not found.');
    }
    return filled;
  }

  /**
   * Clicks the "Send OTP" arrow button next to the phone input.
   * Searches parent containers for any button (icon-only or text).
   */
  async clickSendOTP() {
    await this.page.waitForTimeout(800);
    const result = await this.page.evaluate(() => {
      const tel = document.querySelector(
        'input[type="tel"], input[name="phone"], input[name="mobile"], input[placeholder*="phone" i]'
      );
      if (!tel) return null;
      let el = tel;
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (!el) break;
        const btn = el.querySelector('button, input[type="submit"], [role="button"]');
        if (btn) { btn.click(); return btn.getAttribute('aria-label') || btn.innerText?.trim() || 'arrow-button'; }
      }
      const form = tel.closest('form');
      if (form) {
        const sb = form.querySelector('button[type="submit"], input[type="submit"], button');
        if (sb) { sb.click(); return 'form-submit'; }
      }
      return null;
    });

    if (result) {
      console.log(`  [CHECKOUT] Send OTP clicked ("${result}").`);
    } else {
      await this.page.keyboard.press('Enter');
      console.log('  [CHECKOUT] Pressed Enter to send OTP.');
    }
    await this.page.waitForTimeout(2000);
    return !!result;
  }

  /**
   * Clicks the pencil / edit icon on the OTP screen (resets to phone entry).
   */
  async clickPencilEdit() {
    const clicked = await this.page.evaluate(() => {
      const allBtns = [...document.querySelectorAll('button, [role="button"], a, span')];

      // By aria-label / title / class
      const byLabel = allBtns.find(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        const cls   = (b.className || '').toLowerCase();
        const title = (b.getAttribute('title') || '').toLowerCase();
        return label.includes('edit') || label.includes('pencil') || label.includes('change') ||
               title.includes('edit') || title.includes('pencil') ||
               cls.includes('edit')   || cls.includes('pencil');
      });
      if (byLabel) { byLabel.click(); return true; }

      // By position: icon-only button adjacent to the phone number text
      const phoneEl = [...document.querySelectorAll('p, span, div, label')]
        .find(el => /\d{10}/.test((el.innerText || el.textContent || '').trim()) && el.children.length === 0);
      if (phoneEl) {
        const parent = phoneEl.parentElement;
        if (parent) {
          const btn = parent.querySelector('button, [role="button"], svg');
          if (btn) { (btn.closest('button') || btn).click(); return true; }
        }
      }
      return false;
    });

    if (clicked) {
      console.log('  [CHECKOUT] ✏️  Pencil/edit icon clicked.');
      await this.page.waitForTimeout(1500);
    } else {
      console.log('  [CHECKOUT] No pencil icon found — skipping.');
    }
    return clicked;
  }

  /**
   * Full OTP request flow:
   *   1. Enter phone
   *   2. Click Send OTP
   *   3. Click pencil (if present) → re-enter phone → click Send OTP again
   *
   * @param {string} phone
   */
  async requestOTP(phone) {
    await this.page.waitForTimeout(1000);
    await this.enterPhone(phone);
    await this.clickSendOTP();

    const pencilFound = await this.clickPencilEdit();
    if (pencilFound) {
      await this.enterPhone(phone);
      await this.clickSendOTP();
    }
  }

  /**
   * Shows a console banner and waits up to `timeoutMs` for either
   * a saved address card or a new address form to appear after OTP.
   *
   * @param {number} timeoutMs  Default 120 000 ms (2 minutes)
   * @returns {'saved'|'form'|'timeout'}
   */
  async waitForAddressAfterOTP(timeoutMs = 120000) {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════════════════╗');
    console.log('  ║  OTP sent. Please enter it in the browser window     ║');
    console.log('  ║  within the next 2 minutes.                          ║');
    console.log('  ║  Test continues automatically once the address page   ║');
    console.log('  ║  loads (saved address or address form detected).      ║');
    console.log('  ╚═══════════════════════════════════════════════════════╝');
    console.log('');

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = await this.page.evaluate(() => {
        const saved = document.querySelector(
          '[class*="address-card"], [class*="addressCard"], [class*="saved-address"], ' +
          '[class*="address-item"], [class*="addressItem"], [class*="delivery-address"]'
        );
        if (saved && saved.getBoundingClientRect().height > 0) return 'saved';

        const formInput = document.querySelector(
          'input[name="name"], input[placeholder*="Name" i], ' +
          'input[name="address"], input[placeholder*="Address" i]'
        );
        if (formInput && formInput.getBoundingClientRect().height > 0) return 'form';

        return 'waiting';
      });

      if (state !== 'waiting') {
        console.log(`  [CHECKOUT] ✅ Address state detected: "${state}"`);
        return state;
      }
      await this.page.waitForTimeout(1000);
    }

    console.log('  [CHECKOUT] ⚠️  Timed out waiting for address page.');
    return 'timeout';
  }

  // ─── Address form ─────────────────────────────────────────────────────────────

  /**
   * Fills the new address form fields.
   * @param {{ name, phone, email, address, pincode }} details
   */
  async fillAddressForm(details) {
    await this._fillField(
      ['input[name="name"]', 'input[placeholder*="Name" i]', 'input[placeholder*="Full name" i]'],
      details.name
    );
    await this._fillField(
      ['input[name="email"]', 'input[type="email"]', 'input[placeholder*="Email" i]'],
      details.email
    );
    await this._fillField(
      ['input[name="pincode"]', 'input[placeholder*="Pincode" i]', 'input[placeholder*="PIN" i]'],
      details.pincode
    );
    await this._fillField(
      ['input[name="address"]', 'input[name="address1"]',
       'input[placeholder*="Address" i]', 'input[placeholder*="House" i]', 'textarea'],
      details.address
    );
    console.log('  [CHECKOUT] ✅ Address form filled.');
  }

  // ─── Coupon ───────────────────────────────────────────────────────────────────

  /**
   * Scrolls to the coupon input, enters the code, and clicks Apply.
   * @param {string} couponCode
   * @returns {boolean}
   */
  async applyCoupon(couponCode) {
    // Scroll down to bring coupon section into view
    for (let i = 0; i < 10; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.page.waitForTimeout(300);
      const found = await this.page.evaluate(() =>
        !!document.querySelector(
          'input[name="coupon"], input[placeholder*="coupon" i], ' +
          'input[placeholder*="promo" i], input[placeholder*="discount" i], input[placeholder*="code" i]'
        )
      );
      if (found) break;
    }

    const filled = await this.page.evaluate(({ code }) => {
      const input = document.querySelector(
        'input[name="coupon"], input[placeholder*="coupon" i], ' +
        'input[placeholder*="promo" i], input[placeholder*="discount" i], input[placeholder*="code" i]'
      );
      if (!input) return false;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) nativeSetter.call(input, code);
      else input.value = code;
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { code: couponCode });

    if (!filled) {
      console.log('  [COUPON] ⚠️  Coupon input not found.');
      return false;
    }
    console.log(`  [COUPON] Entered code: "${couponCode}"`);
    await this.page.waitForTimeout(500);

    const applied = await this.page.evaluate(() => {
      const input = document.querySelector(
        'input[name="coupon"], input[placeholder*="coupon" i], ' +
        'input[placeholder*="promo" i], input[placeholder*="discount" i], input[placeholder*="code" i]'
      );
      if (!input) return null;
      let el = input;
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (!el) break;
        const btn = [...el.querySelectorAll('button, [role="button"]')].find(b => {
          const t = (b.innerText || b.textContent || '').trim().toUpperCase();
          return t === 'APPLY' || t.includes('APPLY');
        });
        if (btn) { btn.click(); return (btn.innerText || btn.textContent || '').trim(); }
      }
      return null;
    });

    if (applied) {
      console.log(`  [COUPON] ✅ Applied via "${applied}" button.`);
      await this.page.waitForTimeout(2000);
      return true;
    }

    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);
    console.log('  [COUPON] Applied via Enter key.');
    return true;
  }

  /**
   * Checks whether a coupon error/invalid message is visible.
   * @returns {string|null} Error text, or null if no error shown.
   */
  async getCouponError() {
    return await this.page.evaluate(() => {
      const errorSelectors = [
        '[class*="coupon-error"]', '[class*="couponError"]',
        '[class*="error"]', '[class*="invalid"]', '[class*="alert"]',
      ];
      for (const sel of errorSelectors) {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().height > 0) {
          return (el.innerText || el.textContent || '').trim();
        }
      }
      return null;
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  async _fillField(selectors, value) {
    for (const sel of selectors) {
      const filled = await this.page.evaluate(({ selector, val }) => {
        const input = document.querySelector(selector);
        if (!input || (input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA')) return false;
        const nativeSetter =
          Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
          Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(input, val);
        else input.value = val;
        input.dispatchEvent(new Event('input',  { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, { selector: sel, val: value });

      if (filled) {
        await this.page.waitForTimeout(300);
        console.log(`  [FORM] Filled "${sel}" → "${value}"`);
        return true;
      }
    }
    console.log(`  [FORM] ⚠️  No field found for value "${value}"`);
    return false;
  }
}

module.exports = CheckoutPage;
