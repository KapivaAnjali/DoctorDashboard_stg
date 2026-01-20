describe('To validate user login', () => {
    beforeEach(() => {
    cy.visit('https://innovation.kapiva.in/');
    cy.viewport('macbook-16');
  });

    it('To verify user login with valid credential', () => {
        
        cy.contains('View Guidelines').click();
        cy.contains('Apply for Funding').click();
        cy.get('[placeholder="Enter your full name"]').type('Testing Anjali2');
        cy.get('[placeholder="your@email.com"]').type('sampleuser11@example.com');
        cy.get('[placeholder="Create password (min 6 characters)"]').type('password123');
        cy.get('[placeholder="Confirm password"]').type('password123');
        cy.contains('Register & Continue').click();
        
    });
});