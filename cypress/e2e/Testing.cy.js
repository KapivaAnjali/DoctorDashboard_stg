describe('', () => {
    it('', () => {
        cy.visit('https://stg-hts.kapiva.tech/');
        cy.viewport('macbook-16');
        
        
               
        cy.get('#email').click();
        cy.get('#email').type('prayaga@kapiva.in');
        cy.get('#password').click();
        cy.get('#password').type('p');
               
        cy.get('button.mt-\\[20px\\]').click();
        cy.get('div:nth-child(2) div.text-base').click();
        cy.get('div.min-w-\\[214px\\]').click();
        cy.get('div.gap-\\[52px\\] p.relative').click();
        cy.get('#react-select-6-placeholder').click();
        cy.get('#react-select-6-option-0').click();
    });
});