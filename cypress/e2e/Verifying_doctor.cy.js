// ✅ UPDATED FUNCTION: Scrolls to 11:00 PM on EVERY day checked
function findAppointmentAndScroll(targetPatient) {
  // 1. Scroll to the bottom (11:00 PM) FIRST to load all slots for this date
  cy.log('Scrolling to 11:00 PM to ensure all appointments are loaded...');
  cy.contains('11:00 PM')
    .scrollIntoView({ duration: 1000 })
    .should('be.visible');

  // 2. Check for the patient card
  return cy.get('body').then(($body) => {
    const cards = $body.find('[class*="rounded-[20px]"][style*="background-color"]');

    const filtered = cards.filter((_, el) =>
      Cypress.$(el).text().replace(/\s+/g, ' ').trim().includes(targetPatient)
    );

    // 3. Logic: If not found, click Previous Day and RECURSE
    if (filtered.length === 0) {
      cy.log(`No consultation for ${targetPatient} today → Clicking Previous Day`);
      cy.get("button[aria-label='Previous day']").click();
      
      cy.wait(2000); // Give the new date time to load
      
      // 🔄 RECURSIVE CALL: This triggers the scroll again for the new date
      return findAppointmentAndScroll(targetPatient); 
    }

    // 4. Found! Alias the cards
    cy.wrap(filtered).as('patientCards');
    cy.wrap(filtered.last()).as('latestCard');
    if (filtered.length >= 2) cy.wrap(filtered.eq(filtered.length - 2)).as('secondLatestCard');

    return cy.wrap(filtered);
  });
}
// <--- This is the end of your first function

function fillInputIfEmpty(selector, value) {
  cy.get(selector).then($el => {
    const currentVal = $el.val()?.trim();
    
    if (!currentVal) {
      cy.wrap($el)
        .clear({ force: true })
        .type(value, { force: true });
      cy.log(`Filled ${selector} with ${value}`);
    } else {
      cy.log(`Skipped ${selector} — already has "${currentVal}"`);
    }
  });
}
function selectDropdownIfEmpty(selectControl, optionText) {
  cy.get(selectControl).then($ctrl => {

    // Get currently selected text inside react-select
    const selectedText = $ctrl.text().trim();

    // If nothing selected or only placeholder shown
    if (
      selectedText === '' ||
      selectedText.toLowerCase().includes('select')
    ) {
      cy.wrap($ctrl).click({ force: true });

      cy.contains('.select__option', optionText)
        .scrollIntoView({ block: 'center' })
        .click({ force: true });

      cy.log(`Selected ${optionText} in dropdown`);
    } 
    else {
      cy.log(`Skipped dropdown — already has "${selectedText}"`);
    }
  });
}
// ──────────────────────────────────────────────────────────────────────────────for 
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
    cy.wait(5000);
    


    // Go to appointments
    cy.contains('Todays Appointments').click();
    


    // Optional scroll & click
    cy.contains('11:00 PM')
      .scrollIntoView({ duration: 1000 })
      .should('be.visible')
      .click();

    // Step 2: Get green cards & alias them
    findAppointmentAndScroll(targetPatient);

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

        //cy.wait(2000);

        // Logout
        cy.get('.rounded-full, [class*="avatar"], [class*="profile"], [aria-label*="profile"], [class*="user-menu"]', { timeout: 15000 })
          .first()
          .as('profileGroup');
        cy.wait(1000);
        cy.get('@profileGroup')
          .realHover({ force: true })
          .trigger('mouseover', { force: true })
          .trigger('mouseenter', { force: true });

        //cy.wait(1000);

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
    cy.contains('Todays Appointments').click();
    cy.wait(2000);
    

    // Step 5: Post-login, scroll to same patient's consultation
    findAppointmentAndScroll(targetPatient);
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

    // Replace your current click logic with this:
  cy.contains('.select__option', /^Chronic Health$/) // Finds exactly "Chronic Health"
  .scrollIntoView({ duration: 300 })
  .should('be.visible')
  .click({ force: true });
    cy.get('[placeholder="e.g. 170"]').type('165');
    cy.get('[placeholder="e.g. 70"]').type('70');
    cy.xpath("//p[normalize-space()='Add Vital Field']").click();

    cy.xpath("//div[@class='select__value-container select__value-container--is-multi css-1izopxs']//div[@class='select__input-container css-vlaq4p']").click();
    cy.contains('Blood Glucose')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();

    //cy.xpath("(//p[@class='font-avenir leading-[24px] relative shrink-0 text-[16px] text-[#909a5d] text-nowrap whitespace-pre'])[1]").click();
    cy.contains('Add Other Concern').click();

   // 1. Type without triggering a page jump
cy.get('[placeholder="Enter condition"]')
  .type('Testing', { scrollBehavior: 'center', force: true });

// 2. Click the dropdown indicator
cy.xpath('(//*[@class="select__indicator select__dropdown-indicator css-ylcbsx-indicatorContainer"])[40]').click();

// 3. Use a more specific wait for the option
cy.xpath('(//*[@class="select__single-value css-u1e4k7-singleValue"])[3]').click // specifically targets react-select options
  

    cy.get('[placeholder="Type Here"]').type('Testing')
    cy.contains('Add Other Concern').click();
    cy.xpath("(//img[@alt='Remove'])[2]").click();
    
// Target the hidden input field directly. Use {force: true} because it's usually invisible.
cy.get('input[type="file"]')
  .selectFile('cypress/fixtures/Doc_sample.png', { force: true });
  cy.get('[class="select__placeholder css-juw58-placeholder"]').click({ force: true });

    cy.contains('Imaging')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();
    cy.get('input[type="file"]')
  .selectFile('cypress/fixtures/Doc_sample.png', { force: true });
  cy.xpath('(//*[@alt="Remove file"])[2]').click({ force: true });
  cy.contains('Upload Files').click();
  cy.wait(2000);
  cy.xpath('(//*[@alt="Download file"])[1]').click();
  cy.wait(200);

  cy.get('[alt="Expand"]').click();
  cy.get('[placeholder="Type your notes here..."]').type('Testing notes');
  cy.get('[alt="Minimize"]').click();

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
   // cy.xpath('(//*[@class="css-8mmkcg"])[3]').click();
    cy.xpath('(//*[@class="text-xl"])[2]').click();
    cy.wait(1000);
    cy.xpath('(//*[@class="text-xl"])[1]').click();


    //cy.contains('Create Profile').click(); // To create profile
    //cy.contains('button', '×').click({ force: true });


    cy.contains('Send Reminder').click();
    cy.wait(2000);
    cy.contains('Raise a Ticket').click();
    // Scope the search to the specific form in the modal
cy.get('form.p-2.font-avenir').within(() => {

  // Define the fields we want to check
  const fieldsToCheck = ['Name', 'Email', 'Phone'];

  fieldsToCheck.forEach((label) => {
    // 1. Find the label text (e.g., "Name")
    // 2. Go up to the parent container
    // 3. Find the 'input' tag inside that container
    cy.contains(label)
      .parent()
      .find('input')
      .invoke('val') // Grab the value inside the input box
      .then((value) => {
        
        // A. Type the value in the Console (Browser DevTools)
        console.log(`${label} Field Value:`, value);
        
        // B. Log the value in the Cypress Runner (Left sidebar)
        cy.log(`${label} is: ${value}`);

        // C. Verify the field is NOT empty
        expect(value).to.not.be.empty;
      });
  });
});
cy.get('[placeholder="Alt Phone"]').type('9876543210');
cy.xpath('(//*[@class="select__input-container css-vlaq4p"])[1]').click();
cy.contains('Health Support')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click()
  cy.xpath('(//*[@class="select__input-container css-vlaq4p"])[2]').click();
cy.contains('Mid')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click()
  cy.get('[id="details-textarea"]').type('testing');
  //cy.contains('Submit').click();
  //cy.wait(2000);
  cy.get('[class="text-xl"]').click();
  
    cy.contains('Medical History').click();
    cy.xpath('//textarea[@placeholder="Enter doctor\'s concern..."]').type('Testing medical history');
    cy.get('[placeholder="Type medication name and press Enter"]').type('TestMed1{enter}TestMed2{enter}',{ force: true });
    cy.get('[placeholder="Type allergy name and press Enter"]').type('TestAllergy1{enter}TestAllergy2{enter}',{ force: true });
    cy.contains('Add Surgery').click();
    cy.get('[placeholder="Enter surgery name"]').type('TestSurgery');
    cy.get("input[type='date']").type('2020-05-15');
    cy.get('[placeholder="Type Here"]').type('Testing surgery notes');
    cy.contains('Add Condition History').click();
    cy.get('[placeholder="Enter condition"]').type('TestCondition');
    cy.xpath('(//*[@class="select__indicator select__dropdown-indicator css-ylcbsx-indicatorContainer"])[1]').click();
    cy.contains('Father')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();
    cy.xpath("(//div[@class='select__input-container css-vlaq4p'])[2]").click();
    cy.contains('>1 Year')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();
    cy.xpath("(//input[@placeholder='Type Here'])[2]").type('Testing family history notes');

    cy.contains('Lifestyle Details').click();
    cy.xpath("(//input[@placeholder='Type here'])[5]").type('Testing lifestyle details');
    cy.contains('Medication & Rx').click();
    cy.xpath("(//div[@class='css-vlaq4p'])[1]").click();
    cy.contains('Noni Juice 1L')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click({force: true });
    cy.wait(2000);
    cy.xpath("(//input[@placeholder='Type Here'])[1]").type('1-0-1');
    cy.contains('Final Review').click();
    cy.xpath("(//textarea[@placeholder='Enter consultation advice for diagnosis...'])[1]").type('Testing final review advice');
    cy.xpath("(//div[@class='css-vlaq4p'])[1]").click();
    cy.contains('Consulted')
    .scrollIntoView({ duration: 300 })   // scrolls the OPTION into view inside the dropdown
    .should('be.visible')
    .click();
    cy.xpath("(//div[@class='css-vlaq4p'])[2]").click();
    // ✅ IMPROVED SELECTOR: Targets the option div specifically
    cy.get('[class*="-option"]') // Target the dropdown option container
      .contains('Product Recommended')
      .scrollIntoView({ duration: 300 })
      .should('be.visible')
      .click({ force: true });
    cy.contains('Preview Prescription').click();
    cy.xpath("(//*[name()='path'])[6]").click();
    // 1. Scroll to the bottom of the popup
// We target 'Signature' because it's at the footer of the modal
cy.contains('Signature')
  .scrollIntoView({ duration: 800 }) 
  .should('be.visible');

// 2. Verify and Print the Data Row
// We find the row by looking for the product name "Noni Juice 1L"
// cy.contains('Noni Juice 1L')
//   .parents('div[class*="grid"], div[class*="flex"]') // Move up to the row container
//   .first() // Ensure we have the immediate row
//   .within(() => {
    
//     // --- VERIFY DATA IS VISIBLE ---
//     cy.contains('1').should('be.visible'); // Unit
//     cy.contains('3 months').should('be.visible'); // Duration
    
//     // Verify the usage instructions (Partial text match is safer for long text)
//     cy.contains('Take a 35g scoop').should('be.visible');

//     // --- PRINT DATA TO CONSOLE ---
//     cy.get('div, p, span').each(($el) => {
//       const text = $el.text().trim();
//       if (text.length > 0) {
//         // Prints to the Browser Console (F12)
//         console.log('Treatment Data:', text);
        
//         // Prints to the Cypress Command Log
//         cy.log('Treatment Data: ' + text);
//       }
//     });
//   });
  cy.xpath("(//*[name()='rect'])[1]").click({force: true});
  cy.contains('Generate Prescription').click();
    
    
  



});
  
});
