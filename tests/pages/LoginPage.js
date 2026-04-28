class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    // exact:true prevents "LOGIN WITH GMAIL (SSO)" from also matching
    this.loginButton = page.getByRole('button', { name: 'LOGIN', exact: true });
  }

  /**
   * Fills credentials and waits for the post-login navigation to settle.
   */
  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    // Wait for navigation triggered by the login click to complete
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.loginButton.click(),
    ]);
  }

  /**
   * Hovers the profile avatar to reveal the Logout link, then clicks it.
   * Waits for the page to return to the login screen before resolving.
   *
   * @param {string} [expectedUrl] - glob/regex/exact URL to wait for after logout.
   *   Defaults to a glob that matches any page on the same origin.
   */
  async logout(expectedUrl = '**/') {
    const avatar = this.page
      .locator(
        '.rounded-full, [class*="avatar"], [class*="profile"], [aria-label*="profile"], [class*="user-menu"]'
      )
      .first();
    await avatar.waitFor({ state: 'visible', timeout: 15000 });
    await avatar.hover();

    const logoutBtn = this.page.getByText('Logout', { exact: true });
    await logoutBtn.waitFor({ state: 'visible', timeout: 15000 });
    await logoutBtn.click({ force: true });

    // Use a glob so trailing-slash and minor URL variations don't cause failures
    await this.page.waitForURL(expectedUrl, { timeout: 15000 });
  }
}

module.exports = LoginPage;
