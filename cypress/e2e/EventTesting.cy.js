describe('Event Testing', () => {
    
    describe('Kapiva Staging Test', () => {
  beforeEach(() => {
    cy.visit('https://staging.kapiva.in/');
    cy.handleStagingPopup(); // Close it on initial load
  });

  it('should navigate to products', () => {
    cy.get('.some-category-link').click();
    
    // THE CRITICAL STEP: Call it again after clicks
    cy.handleStagingPopup(); 
    
    cy.get('.product-item').should('be.visible');
  });
});
});