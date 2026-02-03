describe('Kapiva - Desktop view', () => {
  // 1. Prevent the site's internal JS errors from crashing the test
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
  });

  it('loads site and captures WebEngage events', () => {
    // 2. Setup environment and viewport
    cy.viewport('macbook-16');
   cy.intercept('POST', '**/c.in.webengage.com/**', (req) => {
  let body;
  try {
    // 1. Handle different body formats (String vs Object)
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (body && body.data) {
      // 2. Decode the Base64 data
      const decoded = JSON.parse(atob(body.data));
      const eventName = decoded.event_name || "System/User Event";

      // 3. PRINT TO CYPRESS SIDEBAR (Left column)
      Cypress.log({
        name: 'WEBENGAGE',
        displayName: 'EVENT',
        message: `Captured: **${eventName}**`,
        consoleProps: () => ({
          Event: eventName,
          Data: decoded
        })
      });

      // 4. PRINT TO BROWSER CONSOLE (F12)
      // This is what you specifically asked for!
      console.log(`%c 🔥 WebEngage Captured: ${eventName}`, 'color: #8e44ad; font-weight: bold;', decoded);
    }
  } catch (e) {
    // If it's not JSON, it might be raw text, we log that just in case
    console.warn("Could not parse WebEngage request body", req.body);
  }
}).as('webengage');

    
    // 5. EXECUTE THE TEST FLOW
    cy.visit('https://kapiva.in/');
    
    // Navigate to Login
    cy.get('#__next a[href="https://kapiva.in/login.php"]').click();
    
    // Enter Number
    cy.get('[name="number"]').type('9830814266');

    // Click the Get OTP button
    cy.get('#\\:r1\\: img').click();

    // 6. WAIT FOR OTP
    
    
    cy.log('Waiting 10 seconds for OTP receipt...');
    cy.wait(10000); 

    // Enter OTP (Manual intervention required here during wait)
    cy.get('#root input[aria-label="Digit 6"]').type('0');
    cy.get('#\\:r1\\: img').click();

    // Product Interaction
    cy.get('#\\:r1\\: a[href*="shilajit-resin-20g"] h2').first().click();
    cy.get('#__next p.hidden').click();
    cy.get('#__next button.w-\\[75\\%\\]').click();
       
    // 7. PRINT FINAL SUMMARY
    cy.then(() => {
      const allEvents = Cypress.env('analyticsEvents');
      console.log('🔥 ALL DECODED WEBENGAGE EVENTS:', allEvents);
      // Fails test if no WebEngage events were captured
      expect(allEvents.length).to.be.greaterThan(0);
    });
  });
});