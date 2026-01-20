describe('CS/HCT Booking - Dynamic Dates & Slot Availability Check', () => {
  beforeEach(() => {
    cy.visit('https://stg-hts.kapiva.tech/cs-hct-booking'); // ← update if baseUrl is already set in cypress.config.js
    // cy.loginIfNeeded(); // ← add your login command/helper if authentication is required
  });

  it('Checks next 7 days, logs slot availability, books today if slots exist', () => {
   
  });

});
describe('CS/HCT Booking - Check all visible dates then book today', () => {
  before(() => {
    // Visit once — we'll navigate via UI clicks afterward
    cy.visit('/cs-hct-booking'); // use baseUrl + path or full URL
    // cy.loginIfNeeded();       // uncomment if needed
  });

  it('Clicks every visible date → logs slots → returns to today → books if possible', () => {
    // ── Helper: get today's date string in "Jan 14" format ───────────────────────
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }); // → "Jan 14"

    cy.log(`Today's expected date string: ${todayStr}`);

    // ── 1. Find all date buttons in the calendar row ─────────────────────────────
    // Adjust selector if needed — looking for buttons inside the date container
    cy.get('[class*="flex"][class*="gap"] button') // common parent flex container
      .filter((_, el) => {
        const txt = Cypress.$(el).text().trim();
        // Heuristic: contains month abbreviation + number (Jan 14, Feb 5, etc.)
        return /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}/.test(txt);
      })
      .as('dateButtons');

    // Log how many dates are visible
    cy.get('@dateButtons').should('have.length.gte', 1).its('length').then((count) => {
      cy.log(`Found ${count} date buttons visible on page`);
    });

    // ── 2. Click each date one by one and check slots ────────────────────────────
    cy.get('@dateButtons').each(($btn, index) => {
      const dateText = $btn.text().trim();
      cy.wrap($btn)
        .scrollIntoView({ offset: { top: -100, left: 0 } })
        .click({ force: true });

      cy.wait(700); // time for slots to reload — tune this value

      // Find visible time-slot buttons
      cy.get('button')
        .filter((_, el) => {
          const t = Cypress.$(el).text().trim();
          return /\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)/i.test(t);
        })
        .its('length')
        .then((slotCount) => {
          cy.log(`Date ${index + 1}: "${dateText}" → ${slotCount} slot${slotCount === 1 ? '' : 's'} visible`);
        });
    });

    // ── 3. Return to today's date ────────────────────────────────────────────────
    cy.log('→ Returning to today to attempt booking');

    cy.get('@dateButtons')
      .filter((_, el) => {
        const txt = Cypress.$(el).text().trim();
        return txt.includes(todayStr);
      })
      .should('have.length.gte', 1, `Today's date button (${todayStr}) should still be visible`)
      .first()
      .click({ force: true });

    cy.wait(800);

    // ── 4. Check slots on today and book first available ─────────────────────────
    cy.get('button')
      .filter((_, el) => {
        const t = Cypress.$(el).text().trim();
        return /\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)/i.test(t);
      })
      .then(($slots) => {
        const count = $slots.length;

        cy.log(`Today (${todayStr}) → ${count} slot${count === 1 ? '' : 's'} available`);

        if (count > 0) {
          cy.log(`→ Booking first visible slot on today`);

          cy.wrap($slots)
            .first()
            .should('be.visible')
            .and('not.be.disabled')
            .click({ force: true });

          cy.wait(600);

          // Book / Confirm button — adjust regex if button text varies
          
            cy.contains(/Book Consultation|Confirm|Proceed|Book Now/i)
            .should('be.visible')
            .and('be.enabled')
            .click();

          // Optional: verify success (customize!)
          // cy.contains(/booked|success|confirmed/i, { timeout: 12000 }).should('exist');
        } else {
          cy.log('→ No slots available today — booking skipped');
        }
      });
  });
});