class AppointmentsPage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page.getByText('Todays Appointments').waitFor({ state: 'visible', timeout: 10000 });
    await this.page.getByText('Todays Appointments').click();
    try {
      await this.page.getByText('Loading').waitFor({ state: 'hidden', timeout: 20000 });
    } catch (_) {}
  }

  async clickToday() {
    await this.page.getByRole('button', { name: 'Today' }).click({ force: true });
  }

  /**
   * If the consultant dropdown exists and is NOT already showing "Select",
   * resets it to "Select" (all consultants).
   * Silently skips in doctor view where the dropdown is absent.
   *
   * Strategy: open and select are done atomically inside page.evaluate() so
   * Playwright never moves DOM focus between the two steps, which would cause
   * React Select to close the menu before the option is clicked.
   */
  async handleConsultantDropdown() {
    const dropdown = this.page.locator('.select__control').first();
    if ((await dropdown.count()) === 0) return;
    const text = (await dropdown.textContent()) || '';
    if (text.includes('Select')) return;

    // Step 1: fire mousedown on the control (opens the React Select menu)
    await this.page.evaluate(() => {
      const ctrl = document.querySelector('.select__control');
      if (ctrl) {
        ctrl.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, which: 1 })
        );
      }
    });

    // Step 2: wait until the option list is actually in the DOM
    try {
      await this.page.waitForFunction(
        () => document.querySelectorAll('.select__option').length > 0,
        { timeout: 5000 }
      );
    } catch (_) {
      console.log('Consultant dropdown menu did not open — skipping reset.');
      return;
    }

    // Step 3: click the correct option — all in JS, no Playwright focus change
    await this.page.evaluate(() => {
      const options = [...document.querySelectorAll('.select__option')];
      const target =
        options.find((o) => /^select$/i.test(o.textContent.trim())) ?? options[0];
      if (!target) return;
      target.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })
      );
      target.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
      );
    });

    await this.page.waitForTimeout(1000);
  }

  /**
   * Scrolls to 11:00 PM to load all appointments, then searches for the target
   * patient's card. Recursively goes to the previous day if not found.
   * Returns the LAST (most recent) matching card element.
   *
   * @param {string} targetPatient - patient name to look for
   * @returns {import('@playwright/test').Locator} - the latest matching card locator
   */
  /**
   * Scrolls from 9 AM down through the day one hour at a time, checking for
   * the patient card at each stop.  Returns as soon as the card is found so
   * the locator is still in the DOM (avoids virtual-scroll staleness).
   * Falls back to the previous day if not found after a full sweep.
   */
  async findLatestPatientCard(targetPatient, daysBack = 0) {
    if (daysBack > 7) throw new Error(`Patient card for "${targetPatient}" not found in the last 7 days.`);
    const scrollStops = [
      '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
      '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
      '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
    ];

    for (const time of scrollStops) {
      try {
        await this.page.getByText(time).first().scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);
      } catch (_) {}

      // Check for a matching card at this scroll position
      const cards = await this.page.locator('[class*="rounded-[20px]"]').all();
      const match = [];
      for (const card of cards) {
        const text = ((await card.textContent()) || '').replace(/\s+/g, ' ').trim();
        if (text.includes(targetPatient)) match.push(card);
      }

      if (match.length > 0) {
        // Scroll the found card into view so it stays in DOM when clicked
        await match[match.length - 1].scrollIntoViewIfNeeded();
        // Return a live locator (not a stale snapshot element)
        return this.page
          .locator('[class*="rounded-[20px]"]')
          .filter({ hasText: targetPatient })
          .last();
      }
    }

    // Not found today → go to previous day
    await this.page.getByRole('button', { name: 'Previous day' }).click();
    try {
      await this.page.getByText('Loading').waitFor({ state: 'hidden', timeout: 15000 });
    } catch (_) {}
    await this.handleConsultantDropdown();
    return await this.findLatestPatientCard(targetPatient, daysBack + 1);
  }

  /**
   * Finds ALL matching cards and returns them as an array.
   * Also separately returns the latest and second-latest.
   */
  async findAllPatientCards(targetPatient) {
    try {
      const elevenPm = this.page.getByText('11:00 PM');
      await elevenPm.waitFor({ timeout: 10000 });
      await elevenPm.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
    } catch (_) {}

    const allCards = await this.page.locator('[class*="rounded-[20px]"]').all();
    const matchingCards = [];
    for (const card of allCards) {
      const text = ((await card.textContent()) || '').replace(/\s+/g, ' ').trim();
      if (text.includes(targetPatient)) {
        matchingCards.push(card);
      }
    }

    if (matchingCards.length === 0) {
      await this.page.getByRole('button', { name: 'Previous day' }).click();
      await this.page.waitForTimeout(2000);
      return await this.findAllPatientCards(targetPatient);
    }

    return matchingCards;
  }

  /**
   * Extracts the doctor ProfID from a patient card.
   * The card shows something like "Dr. Name (Prof104)".
   *
   * @param {import('@playwright/test').Locator} card
   * @returns {string} - extracted profId e.g. "Prof104"
   */
  async extractDoctorId(card) {
    const smallText = card.locator('div.text-\\[10px\\]');
    const fullText = ((await smallText.textContent()) || '').trim();
    const match = fullText.match(/\(([^)]+)\)/);
    return match ? match[1].trim() : fullText;
  }

  /**
   * Extracts the doctor display name (small text) from a patient card.
   *
   * @param {import('@playwright/test').Locator} card
   * @returns {string}
   */
  async extractDoctorName(card) {
    const nameEl = card
      .locator('[class*="text-xs"], [class*="text-[10px]"], [class*="text-10px"]')
      .last();
    return ((await nameEl.textContent()) || '').trim();
  }
}

module.exports = AppointmentsPage;
