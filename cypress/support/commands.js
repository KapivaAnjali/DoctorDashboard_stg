// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
// Universal Smart Fill
Cypress.Commands.add('smartFill', (selector, value, type = 'input') => {
  cy.get(selector).then(($el) => {
    const currentVal = $el.val() || $el.text();
    const isEmpty = !currentVal || currentVal.trim() === "" || currentVal.toLowerCase().includes('select');

    if (isEmpty) {
      if (type === 'input') {
        cy.wrap($el).clear().type(value);
      } else if (type === 'select') {
        cy.wrap($el).click({ force: true });
        const regex = new RegExp(`^${value}$`); // Exact match
        cy.contains('.select__option', regex).scrollIntoView().click({ force: true });
      }
      cy.log(`✅ Filled: ${value}`);
    } else {
      cy.log(`⏭️ Skipped: ${value} (Already has value)`);
    }
  });
});

// Add Item only if not already in a list (for Vitals/Concerns)
Cypress.Commands.add('addItemIfMissing', (triggerBtnSelector, itemName) => {
  cy.get('body').then(($body) => {
    if (!$body.text().includes(itemName)) {
      cy.contains(triggerBtnSelector).click();
      cy.get('.select__input-container').last().click().type(`${itemName}{enter}`);
    }
  });
});