const { expect } = require('@playwright/test');

class BookingPage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page.getByText('CS/HCT Booking').click();
  }

  async searchUser(phoneNumber) {
    await this.page
      .getByPlaceholder('Enter 10-digit mobile number')
      .fill(phoneNumber);
    await this.page.getByText('Search').click();
  }

  /**
   * Waits for the User Details section to appear and verifies it has content.
   */
  async verifyUserDetails() {
    const userSection = this.page
      .getByText('User Details', { exact: false })
      .first();
    await userSection.waitFor({ state: 'visible', timeout: 15000 });

    const container = userSection.locator('..');
    const items = container.locator('input, p, span, div');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);
  }

  /**
   * Checks whether the user already has a booking for today.
   * Looks for indicators like a highlighted/selected slot, a "Cancel" button,
   * or text patterns the app uses to mark an existing booking.
   *
   * @returns {{ exists: boolean, slotText: string|null }}
   */
  async checkExistingBookingToday() {
    const bodyText = (await this.page.locator('body').textContent()) || '';

    // Common indicators that a booking already exists
    const alreadyBookedPatterns = [
      'already booked',
      'existing booking',
      'appointment confirmed',
      'booking confirmed',
    ];

    for (const pattern of alreadyBookedPatterns) {
      if (bodyText.toLowerCase().includes(pattern)) {
        console.log(`⚠️  Existing booking detected (found "${pattern}" in page text).`);
        return { exists: true, slotText: null };
      }
    }

    // Also check: if Cancel Booking button is visible, a booking exists
    const cancelBtn = this.page.getByRole('button', { name: /cancel.*booking/i });
    if ((await cancelBtn.count()) > 0) {
      const slotEl = this.page.locator('button').filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i }).first();
      const slotText = (await slotEl.count()) > 0
        ? ((await slotEl.textContent()) || '').trim()
        : null;
      console.log(`⚠️  Existing booking detected (Cancel Booking button found). Slot: ${slotText}`);
      return { exists: true, slotText };
    }

    return { exists: false, slotText: null };
  }

  /**
   * Iterates through every available date button, logs how many slots each
   * date has, then returns to today's date string.
   *
   * @returns {string} todayStr – formatted like "Apr 14"
   */
  async inspectDateSlots() {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    console.log(`Today's date: ${todayStr}`);

    const dateButtonLocator = this.page
      .locator('[class*="flex"][class*="gap"] button')
      .filter({ hasText: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}/ });

    const dateButtons = await dateButtonLocator.all();
    console.log(`Found ${dateButtons.length} date buttons`);

    for (let i = 0; i < dateButtons.length; i++) {
      const btn = dateButtons[i];
      const dateText = ((await btn.textContent()) || '').trim();

      await btn.scrollIntoViewIfNeeded();
      await btn.click({ force: true });
      await this.page.waitForTimeout(3000);

      const bodyText = (await this.page.locator('body').textContent()) || '';
      if (bodyText.includes('No slots available for this date')) {
        console.log(`Date ${i + 1}: "${dateText}" → No slots (skipping)`);
        continue;
      }

      const slots = await this.page
        .locator('button')
        .filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i })
        .all();

      console.log(
        `Date ${i + 1}: "${dateText}" → ${slots.length} slot${slots.length === 1 ? '' : 's'}`
      );
    }

    return todayStr;
  }

  /**
   * Clicks today's date button, checks if the user is already booked,
   * and if not — books the first available slot.
   *
   * @param {string} todayStr - formatted date string, e.g. "Apr 14"
   * @returns {{ booked: boolean, slotText: string|null, alreadyExisted: boolean }}
   */
  async returnToTodayAndBook(todayStr) {
    const todayBtn = this.page.locator('button', { hasText: todayStr }).first();
    await todayBtn.click({ force: true });
    await this.page.waitForTimeout(2000);

    // ── Check for an existing booking first ───────────────────────────────────
    const existing = await this.checkExistingBookingToday();
    if (existing.exists) {
      console.log('→ User already has a booking for today — skipping new booking.');
      return { booked: false, slotText: existing.slotText, alreadyExisted: true };
    }

    const bodyText = (await this.page.locator('body').textContent()) || '';
    const timeSlots = await this.page
      .locator('button')
      .filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i })
      .all();

    if (bodyText.includes('No slots available for this date') && timeSlots.length === 0) {
      console.log('→ Today has no slots — skipped');
      return { booked: false, slotText: null, alreadyExisted: false };
    }

    if (timeSlots.length === 0) {
      console.log('→ No time slot buttons found');
      return { booked: false, slotText: null, alreadyExisted: false };
    }

    console.log(`Today (${todayStr}) → ${timeSlots.length} slot(s). Booking first slot.`);

    const firstSlot = timeSlots[0];
    const slotText = ((await firstSlot.textContent()) || '').trim();
    await firstSlot.scrollIntoViewIfNeeded();
    await firstSlot.click({ force: true });
    await this.page.waitForTimeout(1000);

    const bookBtn = this.page.getByText('Book Consultation');
    await bookBtn.waitFor({ state: 'visible' });
    await bookBtn.click();

    await expect(
      this.page.getByText(/success|booked|confirmed/i).first()
    ).toBeVisible({ timeout: 15000 });

    return { booked: true, slotText, alreadyExisted: false };
  }
}

module.exports = BookingPage;
