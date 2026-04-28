class ConsultationPage {
  constructor(page) {
    this.page = page;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Click a React-Select control (by 0-based index among .select__control elements)
   * and choose an option, but only if the control currently shows nothing / "Select …".
   * Silently skips when the dropdown does not exist on the page (e.g. doctor view).
   */
  async _selectDropdownIfEmpty(index, optionText) {
    const allCtrls = this.page.locator('.select__control');
    if ((await allCtrls.count()) <= index) return; // dropdown not present — skip

    const ctrl = allCtrls.nth(index);
    const selectedText = ((await ctrl.textContent({ timeout: 5000 })) || '').trim();
    if (selectedText === '' || selectedText.toLowerCase().includes('select')) {
      await ctrl.click({ force: true });
      await this.page.waitForTimeout(300);
      const option = this.page.locator('.select__option', { hasText: optionText });
      await option.scrollIntoViewIfNeeded();
      await option.click({ force: true });
    }
  }

  /**
   * Fill a plain input only when it is currently empty.
   */
  async _fillIfEmpty(selector, value) {
    const el = this.page.locator(selector);
    const current = ((await el.inputValue()) || '').trim();
    if (!current) {
      await el.fill(value, { force: true });
    }
  }

  // ─── Basic patient details ───────────────────────────────────────────────────

  async fillLanguage() {
    await this._selectDropdownIfEmpty(0, 'English');
  }

  async fillGender() {
    await this._selectDropdownIfEmpty(1, 'Female');
  }

  async fillLanguageAndGender() {
    await this.fillLanguage();
    await this.fillGender();
  }

  async fillAge(age = '23') {
    await this._fillIfEmpty('[placeholder="Enter age"]', age);
  }

  async fillHeight(height = '165') {
    const el = this.page.getByPlaceholder('e.g. 170');
    const val = ((await el.inputValue()) || '').trim();
    if (!val) {
      await el.fill(height, { force: true });
    }
  }

  async fillWeight(weight = '70') {
    await this._fillIfEmpty('[placeholder="e.g. 70"]', weight);
  }

  // ─── Notes panel ────────────────────────────────────────────────────────────

  async expandAndFillNotes(notes = 'Automated testing notes') {
    await this.page.locator('[aria-label="Expand notes"]').click();
    await this.page.getByPlaceholder('Type your notes here...').fill(notes);
    await this.page.locator('[aria-label="Minimize notes"]').click();
  }

  // ─── Send Reminder / Raise a Ticket ─────────────────────────────────────────

  async sendReminder() {
    await this.page.getByText('Send Reminder').click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Opens the Raise a Ticket modal, verifies Name/Email/Phone are pre-filled,
   * fills the remaining fields, then closes the modal.
   */
  async raiseTicket() {
    await this.page.getByText('Raise a Ticket').click();

    const form = this.page.locator('form.p-2.font-avenir');
    for (const label of ['Name', 'Email', 'Phone']) {
      const value = await form
        .getByText(label)
        .locator('..')
        .locator('input')
        .first()
        .inputValue();
      console.log(`${label} Field Value:`, value);
      if (!value) throw new Error(`${label} field should not be empty`);
    }

    await this.page.getByPlaceholder('Alt Phone').fill('9876543210');

    await this.page
      .locator('xpath=(//*[@class="select__input-container css-vlaq4p"])[1]')
      .click();
    const healthSupport = this.page.getByText('Health Support');
    await healthSupport.scrollIntoViewIfNeeded();
    await healthSupport.click();

    await this.page
      .locator('xpath=(//*[@class="select__input-container css-vlaq4p"])[2]')
      .click();
    const mid = this.page.getByText('Mid');
    await mid.scrollIntoViewIfNeeded();
    await mid.click();

    await this.page.locator('#details-textarea').fill('testing');
    await this.page.locator('[class="text-xl"]').click();
  }

  // ─── Medical History ────────────────────────────────────────────────────────

  async fillMedicalHistory() {
    await this.page.getByText('Medical History').click();

    // Doctor's concern textarea
    const concern = this.page.getByPlaceholder("Enter doctor's concern...");
    if (!((await concern.inputValue()) || '').trim()) {
      await concern.fill('Testing medical history', { force: true });
    }

    // Medications
    const medInput = this.page.locator("xpath=(//input[@type='text'])[2]");
    if ((await medInput.count()) > 0 && !((await medInput.inputValue()) || '').trim()) {
      await medInput.fill('TestMed1', { force: true });
      await medInput.press('Enter');
      await medInput.fill('TestMed2', { force: true });
      await medInput.press('Enter');
    }

    // Allergies (optional field — guard with count check)
    // After adding the first tag, the placeholder attribute is removed from the
    // input so the XPath locator won't match again. Keyboard.type() works because
    // focus stays on the allergy input after each Enter press.
    const allergyInput = this.page.locator("xpath=(//input[@placeholder='Type allergy name and press Enter'])[1]");
    if ((await allergyInput.count()) > 0 && !((await allergyInput.inputValue()) || '').trim()) {
      await allergyInput.fill('TestAllergy1', { force: true });
      await allergyInput.press('Enter');
      await this.page.waitForTimeout(400);
      await this.page.keyboard.type('TestAllergy2');
      await this.page.keyboard.press('Enter');
    }
  }

  // ─── Surgery section ────────────────────────────────────────────────────────

  async cleanupAndAddSurgery() {
    await this._cleanupSurgeries();
  }

  async _cleanupSurgeries() {
    const removeBtns = await this.page.locator('img[alt="Remove"]').all();
    if (removeBtns.length > 0) {
      await removeBtns[0].click({ force: true });
      await this.page.waitForTimeout(800);
      await this._cleanupSurgeries();
    } else {
      await this.page.getByText('Add Surgery').click({ force: true });
      await this.page.waitForTimeout(500);
      const surgeryInput = this.page.getByPlaceholder('Enter surgery name').last();
      if (!((await surgeryInput.inputValue()) || '').trim()) {
        await surgeryInput.fill('TestSurgery', { force: true });
        await this.page.locator("input[type='date']").last().fill('2020-05-15', { force: true });
        await this.page.getByPlaceholder('Type Here').first().fill('Testing surgery notes', { force: true });
      }
    }
  }

  // ─── Condition History section ───────────────────────────────────────────────

  async cleanupAndAddCondition() {
    await this._cleanupCondition();
  }

  async _cleanupCondition() {
    const removeBtns = await this.page.locator('img[alt="Remove"]').all();
    // Surgery already occupies 1 remove button; extras belong to Condition History
    if (removeBtns.length > 1) {
      await removeBtns[removeBtns.length - 1].click({ force: true });
      await this.page.waitForTimeout(800);
      await this._cleanupCondition();
    } else {
      const addBtn = this.page.getByText('Add Condition History');
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click({ force: true });
      await this.page.waitForTimeout(500);
      const conditionInput = this.page.getByPlaceholder('Enter condition').last();
      if (!((await conditionInput.inputValue()) || '').trim()) {
        await conditionInput.fill('TestCondition', { force: true });
        await this.page.locator('.select__control').last().click({ force: true });
        await this.page
          .locator('.select__option', { hasText: '>1 Year' })
          .click({ force: true });
        await this.page.locator('.select__input-container').last().click({ force: true });
        await this.page
          .locator('.select__option', { hasText: '>1 Year' })
          .click({ force: true });
        await this.page
          .getByPlaceholder('Type Here')
          .last()
          .fill('Testing family history notes', { force: true });
      }
    }
  }

  // ─── Lifestyle Details ───────────────────────────────────────────────────────

  async fillLifestyle(notes = 'Testing lifestyle details') {
    await this.page.getByText('Lifestyle Details').click();
    await this.page
      .locator('xpath=(//input[@placeholder="Type here"])[5]')
      .fill(notes);
  }

  // ─── Medication & Rx ────────────────────────────────────────────────────────

  async fillMedicationRx(productName = 'Shilajit Energy Sips', dosage = '1-0-1') {
    await this.page.getByText('Medication & Rx').click();
    await this.page.locator('xpath=(//div[@class="css-vlaq4p"])[1]').click();
    const product = this.page.getByText(productName);
    await product.scrollIntoViewIfNeeded();
    await product.click({ force: true });
    await this.page.waitForTimeout(2000);
    await this.page
      .locator('xpath=(//input[@placeholder="Type Here"])[1]')
      .fill(dosage);
  }

  // ─── Final Review ────────────────────────────────────────────────────────────

  async fillFinalReview(
    advice = 'Testing final review advice',
    status = 'Consulted',
    recommendation = 'Product Recommended'
  ) {
    await this.page.getByText('Final Review').click();
    await this.page
      .locator('xpath=(//textarea[@placeholder="Enter consultation advice for diagnosis..."])[1]')
      .fill(advice);

    // Status dropdown (1st)
    await this.page.locator('xpath=(//div[@class="css-vlaq4p"])[1]').click();
    const statusOption = this.page.getByRole('option', { name: status, exact: true });
    await statusOption.scrollIntoViewIfNeeded();
    await statusOption.click();

    // Recommendation dropdown (2nd)
    await this.page.locator('xpath=(//div[@class="css-vlaq4p"])[2]').click({ force: true });
    const recOption = this.page.locator('[class*="-option"]', { hasText: recommendation });
    await recOption.scrollIntoViewIfNeeded();
    await recOption.click({ force: true });
  }

  // ─── Preview Prescription ────────────────────────────────────────────────────

  async previewPrescription() {
    const btn = this.page.getByText('Preview Prescription');

    // If button is not on page at all, skip gracefully
    try {
      await btn.waitFor({ state: 'visible', timeout: 10000 });
    } catch (_) {
      console.log('Preview Prescription button not found on page — skipping.');
      return;
    }

    // If the button is greyed out (disabled colour), skip
    const cls = (await btn.getAttribute('class')) || '';
    if (cls.includes('b9b9b9')) {
      console.log('Preview Prescription is disabled — skipping.');
      return;
    }

    await btn.click();
    // Navigate/expand inside the preview modal
    await this.page.locator("xpath=(//*[name()='path'])[6]").click();
    const signature = this.page.getByText('Signature');
    await signature.scrollIntoViewIfNeeded();
    await signature.waitFor({ state: 'visible' });
  }

  // ─── Generate Prescription ───────────────────────────────────────────────────

  async generatePrescription() {
    // If preview was skipped (modal not open), the rect won't exist — skip
    const checkbox = this.page.locator("xpath=(//*[name()='rect'])[1]");
    if ((await checkbox.count()) === 0) {
      console.log('Generate Prescription skipped — preview modal not open.');
      return;
    }
    // Tick the signature checkbox (SVG rect element)
    await checkbox.click({ force: true });
    await this.page.getByText('Generate Prescription').click();
    // Wait for the post-generation overlay to disappear before returning
    await this.page.waitForTimeout(2000);
    try {
      await this.page
        .locator('[class*="backdrop-blur"]')
        .waitFor({ state: 'hidden', timeout: 10000 });
    } catch (_) {}
    await this.page.waitForTimeout(500);
  }
}

module.exports = ConsultationPage;
