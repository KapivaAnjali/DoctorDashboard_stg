describe('To validate login functionality', () => {
  beforeEach(() => {
    cy.visit('https://stg-hts.kapiva.tech/');
  });

  it('To test with valid data', () => {
    cy.viewport('macbook-16');

    // Login
    cy.get('[id="email"]').type('anjali.shaw@kapiva.in');
    cy.get('[id="password"]').type('a');
    cy.contains('LOGIN').click();

    // CS/HCT Booking
    cy.contains('CS/HCT Booking').click();

    // Search user
    cy.get("input[placeholder='Enter 10-digit mobile number']").type('9830814266');
    cy.contains('Search').click();

    // User details
    cy.contains('p', 'User Details', { timeout: 15000 })
      .should('be.visible')
      .closest('.flex.flex-col.gap-\\[8px\\]')
      .as('userSection');

    cy.get('@userSection')
      .find('input, p, span, div')
      .filter((i, el) => {
        const $el = Cypress.$(el);
        return (
          $el.is('input') ||
          ($el.is('p, span, div') && $el.text().trim().length > 0 && !$el.text().includes('User Details'))
        );
      })
      .each(($el) => {
        const isInput = $el.is('input');
        const value = isInput ? $el.val()?.trim() : $el.text().trim();
        if (value) cy.log(`Found value: ${value} (from ${isInput ? 'input' : 'text'})`);
      })
      .its('length')
      .should('be.gte', 2);

    cy.xpath("//textarea[@placeholder='Type Here']").type('testing');

    // Today's date string
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    cy.log(`Today's date: ${todayStr}`);

    // Find date buttons
    cy.get('[class*="flex"][class*="gap"] button')
      .filter((_, el) => {
        const txt = Cypress.$(el).text().trim();
        return /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}/.test(txt);
      })
      .as('dateButtons');

    cy.get('@dateButtons')
      .its('length')
      .then(count => cy.log(`Found ${count} date buttons`));

    // Check each date
    cy.get('@dateButtons').each(($btn, index) => {
      const dateText = $btn.text().trim();

      cy.wrap($btn)
        .scrollIntoView({ offset: { top: -100, left: 0 } })
        .click({ force: true });

      cy.wait(1500);

      cy.get('body').then($body => {
        if ($body.text().includes('No slots available for this date')) {
          cy.log(`Date ${index + 1}: "${dateText}" → No slots (skipping)`);
          return;
        }

        // Debug: log all buttons text
        cy.get('button').then($allBtns => {
          cy.log(`All buttons on "${dateText}": ${$allBtns.length}`);
          $allBtns.each((i, b) => cy.log(`  Button ${i+1}: "${Cypress.$(b).text().trim()}"`));
        });

        cy.get('button', { timeout: 20000 })
          .should('have.length.gte', 1)
          .filter((_, el) => {
            const t = Cypress.$(el).text().trim();
            // Broader regex: single time OR range (handles en-dash "–" and regular "-")
            return /\d{1,2}:\d{2}\s*(AM|PM)\s*(?:[-–]\s*\d{1,2}:\d{2}\s*(AM|PM))?/i.test(t);
          })
          .as('timeSlots');

        cy.get('@timeSlots')
          .its('length')
          .then(count => cy.log(`Date ${index + 1}: "${dateText}" → ${count} slot${count === 1 ? '' : 's'}`));
      });
    });

    // Return to today
    cy.log('→ Returning to today');

    cy.get('@dateButtons')
      .filter((_, el) => Cypress.$(el).text().trim().includes(todayStr))
      .should('have.length.gte', 1)
      .first()
      .click({ force: true });

    cy.wait(2000);

    // Book on today
    cy.get('body').then($body => {
      if ($body.text().includes('No slots available for this date')) {
        cy.log('→ Today has no slots — skipped');
        return;
      }

      cy.get('button', { timeout: 20000 })
        .should('have.length.gte', 1)
        .filter((_, el) => {
          const t = Cypress.$(el).text().trim();
          return /\d{1,2}:\d{2}\s*(AM|PM)\s*(?:[-–]\s*\d{1,2}:\d{2}\s*(AM|PM))?/i.test(t);
        })
        .then(($slots) => {
          const count = $slots.length;
          cy.log(`Today (${todayStr}) → ${count} slot${count === 1 ? '' : 's'}`);

          if (count > 0) {
            cy.log('→ Booking first slot');

            cy.wrap($slots)
              .first()
              .scrollIntoView({ offset: { top: -100, left: 0 } })
              .click({ force: true });

            cy.wait(1000);

            cy.contains('Book Consultation')
              .should('be.visible')
              .and('be.enabled')
              .click();

            cy.contains(/success|booked|confirmed/i, { timeout: 15000 })
              .should('exist');
          } else {
            cy.log('→ No slots today');
          }
        });
    });
  });
});