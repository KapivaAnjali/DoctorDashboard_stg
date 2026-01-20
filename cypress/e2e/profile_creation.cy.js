describe('To validate login functionality', () => {
    beforeEach(() => {
     cy.visit('https://stg-hts.kapiva.tech/');// ← update if baseUrl is already set in cypress.config.js
    // cy.loginIfNeeded(); // ← add your login command/helper if authentication is required
    });
    it('To test with valid data', () => {
       
        cy.viewport('macbook-16'); // desktop viewport

        cy.get('[id="email"]').type('anjali.shaw@kapiva.in')

        cy.get('[id="password"]').type('a')

        cy.contains('LOGIN').click();

        cy.contains('CS/HCT Booking').click();

        cy.get("input[placeholder='Enter 10-digit mobile number']").type('9830814266');

        cy.contains('Search').click();
        cy.wait(100);

        cy.contains('Profiles').click();

        cy.contains('Create New Profile').click();
        // ───────────────────────────────────────────────
    // 1. Relationship dropdown → select "Other"
    // ───────────────────────────────────────────────
    // Click the dropdown control (the one with the arrow)
    cy.get("div[class*='select__indicator'][class*='dropdown-indicator'] svg")
      .first()           // usually first one = Relationship
      .parent()          // go to the clickable div around svg
      .click();

    // Scroll to + click "Other"
    cy.contains('Other')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();

    // Option B - if above fails, try by index (risky if order changes)
    // cy.get('div[class*="option"]').eq(5).click(); // assuming "Other" is ~6th

    // ───────────────────────────────────────────────
    // 2. Gender dropdown → select "Female"
    // locator you gave: (//*[@class="css-8mmkcg"])[2]
    // ───────────────────────────────────────────────
    cy.xpath('(//*[@class="css-8mmkcg"])[2]')
      .click();

    cy.contains('div[class*="option"]', 'Female')
      .should('be.visible').click();

    // Alternative (more robust if many react-selects exist):
    // cy.get('[class*="select__control"]').eq(1).click();
    // cy.contains('Female').click();

    // ───────────────────────────────────────────────
    // 3. First Name
    // ───────────────────────────────────────────────
    cy.get('[placeholder="Enter first name"]')
      .should('be.visible')
      .type('TestFirst');

    // ───────────────────────────────────────────────
    // 4. Last Name
    // ───────────────────────────────────────────────
    cy.get('[placeholder="Enter last name"]')
      .type('TestLast');
    cy.get('input[name="dob"]').click();  // open picker

    // Wait for popup (give it time or wait for a known element)
    cy.wait(600);   // or better: cy.get('[class*="day"], [role="gridcell"]').should('be.visible')

    // ── Year selection ──
    // If year is a <select>
    // 5. DOB – Native HTML5 date picker → just type in YYYY-MM-DD format
    cy.get('input[name="dob"]')
    .should('be.visible')
    .type('1995-06-15')           // This sets 15 June 1995
    .should('have.value', '1995-06-15');  // Internal value is ISO

    // Optional: The field may display as "15/06/1995" visually
    // But the value attribute will be "1995-06-15"

    // Age should auto-calculate (as of Jan 15, 2026 → age = 30)
    //cy.get('input[placeholder*="Enter age"]')
    //.should('have.value', '30');
    cy.xpath('(//*[@class="css-8mmkcg"])[3]').click();
    cy.contains('Agent')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();

    //cy.contains('Create Profile').click(); // To create profile
    cy.contains('button', '×').click({ force: true });

    });
      
});
