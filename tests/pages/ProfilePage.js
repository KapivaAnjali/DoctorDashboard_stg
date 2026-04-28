class ProfilePage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page.getByText('Profiles').click();
  }

  async createNewProfile() {
    await this.page.getByText('Create New Profile').click();
  }

  /**
   * Selects a relationship from the first React-Select dropdown
   * (the dropdown-indicator arrow).
   */
  async selectRelationship(relationship = 'Other') {
    await this.page
      .locator("div[class*='select__indicator'][class*='dropdown-indicator'] svg")
      .first()
      .locator('..')
      .click();
    const option = this.page.getByText(relationship);
    await option.scrollIntoViewIfNeeded();
    await option.click();
  }

  /**
   * Selects a gender from the second css-8mmkcg control.
   */
  async selectGender(gender = 'Female') {
    await this.page.locator('xpath=(//*[@class="css-8mmkcg"])[2]').click();
    const option = this.page.locator('[class*="option"]', { hasText: gender });
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async fillFirstName(firstName) {
    await this.page.getByPlaceholder('Enter first name').fill(firstName);
  }

  async fillLastName(lastName) {
    await this.page.getByPlaceholder('Enter last name').fill(lastName);
  }

  async fillName(firstName, lastName) {
    await this.fillFirstName(firstName);
    await this.fillLastName(lastName);
  }

  /**
   * Fills the native HTML5 date-of-birth input (YYYY-MM-DD format).
   */
  async fillDOB(dob = '1995-06-15') {
    const dobInput = this.page.locator('input[name="dob"]');
    await dobInput.click();
    await this.page.waitForTimeout(600);
    await dobInput.fill(dob);
  }

  /**
   * Selects the source/referred-by from the third css-8mmkcg control.
   */
  async selectSource(source = 'Agent') {
    await this.page.locator('xpath=(//*[@class="css-8mmkcg"])[3]').click();
    const option = this.page.getByText(source);
    await option.scrollIntoViewIfNeeded();
    await option.click();
  }

  /**
   * Closes the profile creation modal with the × button.
   */
  async closeModal() {
    await this.page.getByRole('button', { name: '×' }).click({ force: true });
  }

  /**
   * Closes using the text-xl (×) elements that appear inside consultation view.
   * The SecondMilestone test uses two such close buttons.
   */
  async closeProfileModalsInConsultation() {
    await this.page.locator('xpath=(//*[@class="text-xl"])[2]').click();
    await this.page.waitForTimeout(1000);
    await this.page.locator('xpath=(//*[@class="text-xl"])[1]').click();
  }
}

module.exports = ProfilePage;
