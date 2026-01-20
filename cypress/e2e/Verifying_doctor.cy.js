// ✅ ADD THIS FUNCTION AT THE TOP (LINE 1)
function getGreenCards(targetPatient) {
  return cy.get('body').then(($body) => {
    const cards = $body.find('[class*="rounded-[20px]"][style*="background-color"]');

    // normalize text for reliable matching
    const filtered = cards.filter((_, el) =>
      Cypress.$(el).text().replace(/\s+/g, ' ').trim().includes(targetPatient)
    );

    if (filtered.length === 0) {
      cy.log(`No consultation for ${targetPatient} → going to previous day`);
      cy.get("button[aria-label='Previous day']").click();
      cy.wait(1000);
      return getGreenCards(targetPatient); // retry recursively
    }

    // Wrap and alias filtered cards
    cy.wrap(filtered).as('patientCards');
    cy.wrap(filtered.last()).as('latestCard');
    if (filtered.length >= 2) cy.wrap(filtered.eq(filtered.length - 2)).as('secondLatestCard');

    return cy.wrap(filtered);
  });
}

describe('To validate login functionality', () => {
  const baseUrl = 'https://stg-hts.kapiva.tech/';
  const targetPatient = 'Anjali Shaw';
  let doctorsFromFixture = [];

  // Load fixture once before all tests
  before(() => {
    cy.fixture('doctors.json').then((data) => {
      doctorsFromFixture = data;
      cy.log(`Loaded ${doctorsFromFixture.length} doctors from doctors.json`);
    });
  });

  beforeEach(() => {
    cy.visit(baseUrl);
    cy.viewport('macbook-16');
  });

  it('Finds doctor for patient Anjali Shaw → matches fixture → re-login if latest matches', () => {
    let latestDoctorName = null;

    // Step 1: Login as viewer (Anjali Shaw)
    cy.get('#email').type('anjali.shaw@kapiva.in');
    cy.get('#password').type('a');
    cy.contains('LOGIN').click();

    // Go to appointments
    cy.contains('Todays Appointments').click();

    // Optional scroll & click
    cy.contains('11:00 PM')
      .scrollIntoView({ duration: 1000 })
      .should('be.visible')
      .click();

    // Step 2: Get green cards & alias them
    getGreenCards(targetPatient);

    // Step 3: Extract doctor name from the LATEST card
    cy.get('@latestCard').within(() => {
      cy.get('[class*="text-xs"], [class*="text-[10px]"], [class*="text-10px"]')
        .last()
        .invoke('text')
        .then((doctorText) => {
          latestDoctorName = doctorText.trim();
          cy.log(`Doctor (latest consultation): ${latestDoctorName}`);
        });
    });

    // Optional: Log second-latest doctor name if exists
    cy.get('body').then(() => {
      if (Cypress.$('[data-cy-alias="secondLatestCard"]').length > 0) {
        cy.get('@secondLatestCard').within(() => {
          cy.get('[class*="text-xs"], [class*="text-[10px]"], [class*="text-10px"]')
            .last()
            .invoke('text')
            .then((doctorText) => {
              const secondName = doctorText.trim();
              cy.log(`Doctor (second-latest consultation): ${secondName}`);
            });
        });
      }
    });

    // Step 4: Match fixture & re-login using the LATEST doctor
    cy.then(() => {
      if (!latestDoctorName) {
        cy.log('No doctor name extracted → skipping re-login');
        return;
      }

      const matchedDoctor = doctorsFromFixture.find((doc) => {
        const fixtureName = doc.name.trim().toLowerCase();
        const uiName = latestDoctorName.toLowerCase();
        return uiName.includes(fixtureName) || fixtureName.includes(uiName);
      });

      if (matchedDoctor) {
        cy.log(`MATCH FOUND! UI: "${latestDoctorName}" → Fixture: "${matchedDoctor.name}" (${matchedDoctor.email})`);

        cy.wait(2000);

        // Logout
        cy.get('.rounded-full, [class*="avatar"], [class*="profile"], [aria-label*="profile"], [class*="user-menu"]', { timeout: 15000 })
          .first()
          .as('profileGroup');

        cy.get('@profileGroup')
          .realHover({ force: true })
          .trigger('mouseover', { force: true })
          .trigger('mouseenter', { force: true });

        cy.wait(1000);

        cy.contains('Logout', { timeout: 15000 })
          .should('be.visible')
          .should('have.css', 'opacity', '1')
          .click({ force: true });

        cy.url({ timeout: 15000 }).should('eq', baseUrl);
        cy.contains('LOGIN').should('be.visible');
        cy.log('Logout successful');

        // Re-login as matched doctor
        cy.log(`Logging in as: ${matchedDoctor.name} (${matchedDoctor.email})`);
        cy.get('#email').clear().type(matchedDoctor.email);
        cy.get('#password').clear().type(matchedDoctor.password);
        cy.contains('LOGIN').click();

        cy.log('Successfully re-logged in as matched doctor!');
      } else {
        cy.log(`No matching doctor found for "${latestDoctorName}"`);
        cy.log('Fixture doctor names: ' + doctorsFromFixture.map(d => d.name).join(', '));
      }
    });

    // Step 5: Post-login, scroll to same patient's consultation
    getGreenCards(targetPatient);
    cy.get('@latestCard').scrollIntoView({ duration: 1000 }).should('be.visible');
    cy.log('Scrolled to appointment for same patient after doctor login');

    // Click on the consultation
    cy.get('@latestCard').click({ force: true });
    cy.wait(600)

    // Wait for consultation details section to load
    cy.xpath("(//*[@class=\"font-['Avenir:Roman',sans-serif] leading-[24px] text-[16px] text-[#1e1e1e]\"])")
      .should('have.length.gte', 6);

    // Function to log & verify value
    function verifyPrefilled(xpath, fieldName) {
      cy.xpath(xpath)
        .invoke('text')
        .then(text => text.trim())
        .then(val => {
          cy.log(`${fieldName} value → ${val}`);
          expect(val).to.not.be.empty;
        });
    }

    // Verify consultation details
    verifyPrefilled("(//*[@class=\"font-['Avenir:Roman',sans-serif] leading-[24px] text-[16px] text-[#1e1e1e]\"])[1]", "Concern");
    verifyPrefilled("(//*[@class=\"font-['Avenir:Roman',sans-serif] leading-[24px] text-[16px] text-[#1e1e1e]\"])[2]", "Phone");
    cy.wait(3000);
    verifyPrefilled("(//*[@class=\"font-['Avenir:Roman',sans-serif] leading-[24px] text-[16px] text-[#1e1e1e]\"])[3]", "Consulting For");
    verifyPrefilled("(//*[@class=\"font-['Avenir:Roman',sans-serif] leading-[24px] text-[16px] text-[#1e1e1e]\"])[6]", "Tag");

    // Update dropdowns and input fields
    cy.xpath('(//*[@class="css-8mmkcg"])[1]').click();
    cy.contains('English').scrollIntoView().should('be.visible').click();

    cy.xpath('(//*[@class="css-8mmkcg"])[2]').click();
    cy.contains('Female').scrollIntoView().should('be.visible').click();

    cy.get('[placeholder="Enter age"]').clear().type('23');

    cy.get('#react-select-4-input').click({ force: true });
    cy.contains('.select__option', 'O+').scrollIntoView().should('be.visible').click();
    cy.xpath('(//*[@class="css-8mmkcg"])[4]').click();

    cy.contains('Chronic Health')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();
    cy.get('[placeholder="e.g. 170"]').type('165');
    cy.get('[placeholder="e.g. 70"]').type('70');
    cy.contains('Add Vital Field').click();

    cy.xpath('(//*[@class="select__input-container css-vlaq4p"])[39]').click();
    cy.contains('Blood Glucose')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();

    cy.xpath('(//*[@class="css-8mmkcg"])[39]').click();
    cy.contains('Add Other Concern').click();

    cy.get('[placeholder="Enter condition"]').click();
    cy.xpath('(//*[@class="css-8mmkcg"])[42]')
    cy.contains('< 6 Months')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();

    cy.get('[placeholder="Type Here"]').type('Testing')
    cy.contains('Add Other Concern').click();
    cy.get('[alt="Remove"]').click();
    cy.get('input[type="file"]').attachFile([
    'Doc_sample.jpg'
  ]);
    cy.get('[class="select__control css-m8qcbi-control"]').click();
    cy.contains('Imaging')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();


  });
});
