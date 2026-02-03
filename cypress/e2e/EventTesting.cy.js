describe('Kapiva - Desktop view', () => {
  it('loads site and captures WebEngage events', () => {
    // 1. Set Viewport
    cy.viewport('macbook-16');
    
    // 2. INITIALIZE TRACKING (Place it here!)
    Cypress.env('analyticsEvents', []); 
    cy.intercept('POST', '**/c.in.webengage.com/**', (req) => {
      try {
        const payload = JSON.parse(req.body);
        const decoded = JSON.parse(atob(payload.data));
        
        const currentEvents = Cypress.env('analyticsEvents');
        currentEvents.push(decoded.event_name);
        Cypress.env('analyticsEvents', currentEvents);
    
        // This makes it show up in the left-hand sidebar log
        Cypress.log({
          name: 'WebEngage',
          message: `Captured: **${decoded.event_name}**`
        });
      } catch (e) {
        console.error("Decoding failed", e);
      }
    }).as('webengage');
    
    // 3. START ACTIONS
    cy.visit('https://kapiva.in/');
    
    // ... rest of your login and product click code ...
    
       
    
    // 4. PRINT RESULTS
    cy.then(() => {
      const events = Cypress.env('analyticsEvents');
      console.log('🔥 All Captured WebEngage Events:', events);
    });
    cy.get('#__next a[href="https://kapiva.in/login.php"]').click();
    cy.get('[name="number"]').type('9830814266');
    
    cy.get('#\\:r1\\: img').click();
    
    cy.get('#root input[aria-label="Digit 6"]').type('1');
    cy.get('#\\:r1\\:').click();
    cy.get('#root input[aria-label="Please enter verification code. Digit 1"]').click();
  });
});