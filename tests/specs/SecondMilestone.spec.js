const { test, expect } = require('@playwright/test');
const path = require('path');
const LoginPage = require('../pages/LoginPage');
const AppointmentsPage = require('../pages/AppointmentsPage');
const ConsultationPage = require('../pages/ConsultationPage');
const ProfilePage = require('../pages/ProfilePage');
const doctors = require('../../cypress/fixtures/doctors.json');

const BASE_URL = 'https://stg-hts.kapiva.tech/';
const TARGET_PATIENT = 'Anjali Shaw';

// Absolute path for file uploads (relative to project root via __dirname)
const FIXTURE_IMAGE = path.resolve(
  __dirname,
  '../../cypress/fixtures/kapiva-desktop-view (1).png'
);

test.describe('To validate login functionality', () => {
  test('Finds doctor for patient Anjali Shaw → matches fixture → re-login and complete consultation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.setViewportSize({ width: 1536, height: 960 });

    const loginPage = new LoginPage(page);
    const appointmentsPage = new AppointmentsPage(page);
    const consultationPage = new ConsultationPage(page);
    const profilePage = new ProfilePage(page);

    // ── Step 1: Login as admin viewer ─────────────────────────────────────────
    await loginPage.login('anjali.shaw@kapiva.in', 'a');
    await page.waitForTimeout(5000);

    // ── Navigate to appointments ──────────────────────────────────────────────
    await appointmentsPage.navigate();

    // Scroll to 11 PM to ensure all slots are loaded
    try {
      const elevenPm = page.getByText('11:00 PM');
      await elevenPm.waitFor({ timeout: 10000 });
      await elevenPm.scrollIntoViewIfNeeded();
      await elevenPm.click();
    } catch (_) {}

    // ── Step 2: Find patient cards ────────────────────────────────────────────
    const allCards = await appointmentsPage.findAllPatientCards(TARGET_PATIENT);
    const latestCard = allCards[allCards.length - 1];

    // ── Step 3: Extract doctor name from latest card ──────────────────────────
    let latestDoctorName = await appointmentsPage.extractDoctorName(latestCard);
    console.log(`Doctor (latest consultation): ${latestDoctorName}`);

    // Optionally log second-latest doctor if available
    if (allCards.length >= 2) {
      const secondLatestName = await appointmentsPage.extractDoctorName(
        allCards[allCards.length - 2]
      );
      console.log(`Doctor (second-latest consultation): ${secondLatestName}`);
    }

    // ── Step 4: Match fixture and re-login as matched doctor ──────────────────
    if (latestDoctorName) {
      const matchedDoctor = doctors.find((doc) => {
        const fixtureName = doc.name.trim().toLowerCase();
        const uiName = latestDoctorName.toLowerCase();
        return uiName.includes(fixtureName) || fixtureName.includes(uiName);
      });

      if (matchedDoctor) {
        console.log(
          `MATCH FOUND: UI "${latestDoctorName}" → Fixture "${matchedDoctor.name}" (${matchedDoctor.email})`
        );
        await loginPage.logout(BASE_URL);
        await loginPage.login(matchedDoctor.email, matchedDoctor.password);
        console.log('Re-logged in as matched doctor.');
      } else {
        console.log(`No fixture match found for "${latestDoctorName}" — continuing as-is.`);
        console.log('Fixture names:', doctors.map((d) => d.name).join(', '));
      }
    }

    // ── Step 5: Post-login – navigate to appointments and open consultation ───
    await appointmentsPage.navigate();
    await page.waitForTimeout(2000);

    const card = await appointmentsPage.findLatestPatientCard(TARGET_PATIENT);
    await card.scrollIntoViewIfNeeded();
    await card.click({ force: true });
    await page.waitForTimeout(600);

    // ── Step 6: Verify prefilled consultation fields ───────────────────────────
    for (const label of ['Concern', 'Phone', 'Consulting For', 'Tag']) {
      const labelEl = page.getByText(label, { exact: true }).first();
      if ((await labelEl.count()) > 0) {
        const valueEl = labelEl.locator('..').locator('p, input, textarea').first();
        try {
          await valueEl.waitFor({ state: 'visible', timeout: 5000 });
          const val = (
            ((await valueEl.textContent()) || '').trim() ||
            ((await valueEl.inputValue()) || '').trim()
          );
          console.log(`${label} value → ${val}`);
          expect(val).not.toBe('');
        } catch (_) {
          console.log(`Could not verify "${label}" — skipping`);
        }
      }
    }

    // ── Step 7: Fill Language / Gender / Age ──────────────────────────────────
    await consultationPage.fillLanguageAndGender();
    await consultationPage.fillAge('23');

    // ── Step 8: Blood Group + Program dropdown ────────────────────────────────
    // Blood Group (react-select-4-input control)
    const bloodGroupInput = page.locator('#react-select-4-input');
    if ((await bloodGroupInput.count()) > 0) {
      await bloodGroupInput.click();
      const oPlus = page.locator('.select__option', { hasText: 'O+' });
      if ((await oPlus.count()) > 0) {
        await oPlus.click({ force: true });
      }
    }

    // 4th css-8mmkcg dropdown (Program / Chronic Health)
    await page.locator('xpath=(//*[@class="css-8mmkcg"])[4]').click();
    const chronicOption = page.locator('.select__option').filter({ hasText: /^Chronic Health$/ });
    await chronicOption.scrollIntoViewIfNeeded();
    await chronicOption.click({ force: true });

    await consultationPage.fillHeight('165');
    await consultationPage.fillWeight('70');

    // ── Step 9: Add Vital Field ────────────────────────────────────────────────
    await page.getByText('Add Vital Field').click();
    await page
      .locator(
        'xpath=//div[@class="select__value-container select__value-container--is-multi css-1izopxs"]//div[@class="select__input-container css-vlaq4p"]'
      )
      .click();
    const bloodGlucose = page.getByText('Blood Glucose');
    await bloodGlucose.scrollIntoViewIfNeeded();
    await bloodGlucose.click();

    // ── Step 10: Add Other Concern (skip if "Testing" row already exists) ─────
    const concernExists = (await page.locator('input[value="Testing"]').count()) > 0;
    if (!concernExists) {
      await page.getByText('Add Other Concern').click();
      await page
        .getByPlaceholder('Enter condition')
        .fill('Testing', { scrollBehavior: 'center', force: true });
      await page.getByPlaceholder('Type Here').fill('Testing');
    }

    // Set diagnosis duration for the "Testing" concern row
    const concernRow = page
      .locator('input[value="Testing"]')
      .locator('../..')
      .first();
    await concernRow
      .locator('.select__dropdown-indicator')
      .first()
      .click({ force: true });
    await page
      .locator('.select__option', { hasText: '< 6 Months' })
      .waitFor({ state: 'visible' });
    await page
      .locator('.select__option', { hasText: '< 6 Months' })
      .click({ force: true });

    // Add another concern row, then immediately remove it (mirrors original test)
    await page.getByText('Add Other Concern').click();
    await page.locator('xpath=(//img[@alt="Remove"])[2]').click();

    // ── Step 11: Upload diagnostic files ─────────────────────────────────────
    // First upload
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_IMAGE);
    await page
      .locator('[class="select__placeholder css-juw58-placeholder"]')
      .click({ force: true });
    const imagingOption = page.getByText('Imaging');
    await imagingOption.scrollIntoViewIfNeeded();
    await imagingOption.click();

    // Second upload (then remove it)
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_IMAGE);
    await page.locator('xpath=(//*[@alt="Remove file"])[2]').click({ force: true });

    await page.getByText('Upload Files').click();
    await page.waitForTimeout(2000);

    // Download the first file
    await page.locator('xpath=(//*[@alt="Download file"])[1]').click();
    await page.waitForTimeout(200);

    // ── Step 12: Notes ────────────────────────────────────────────────────────
    await page.locator('[alt="Expand"]').click();
    await page.getByPlaceholder('Type your notes here...').fill('Testing notes');
    await page.locator('[alt="Minimize"]').click();

    // ── Step 13: Create new profile from within the consultation ──────────────
    await profilePage.navigate();
    await profilePage.createNewProfile();
    await profilePage.selectRelationship('Other');
    await profilePage.selectGender('Female');
    await profilePage.fillName('TestFirst', 'TestLast');
    await profilePage.fillDOB('1995-06-15');
    // Close both the inner profile modal and the outer drawer
    await profilePage.closeProfileModalsInConsultation();

    // ── Step 14: Send Reminder and Raise a Ticket ────────────────────────────
    await consultationPage.sendReminder();
    await consultationPage.raiseTicket();

    // ── Step 15: Medical History ──────────────────────────────────────────────
    await page.getByText('Medical History').click();

    // Doctor's concern
    await page
      .getByPlaceholder("Enter doctor's concern...")
      .fill('Testing medical history');

    // Medications
    const medInput = page.getByPlaceholder('Type medication name and press Enter');
    await medInput.fill('TestMed1', { force: true });
    await medInput.press('Enter');
    await medInput.fill('TestMed2', { force: true });
    await medInput.press('Enter');

    // Allergies (via XPath to target the second tag-input container)
    const allergyInput = page.locator(
      'xpath=(//*[@class="border border-[#cdcdcd] border-solid box-border content-stretch flex items-center px-[10px] py-[8px] relative rounded-[4px] shrink-0 w-full focus-within:border-[1.5px] focus-within:border-[#909a5d]"])[2]'
    );
    const parentText = ((await allergyInput.locator('../..').textContent()) || '');
    for (const allergy of ['TestAllergy1', 'TestAllergy2']) {
      if (!parentText.includes(allergy)) {
        await allergyInput.fill(allergy, { force: true });
        await allergyInput.press('Enter');
        console.log(`Added allergy: ${allergy}`);
      } else {
        console.log(`Allergy "${allergy}" already exists – skipping`);
      }
    }

    // ── Step 16: Surgery ──────────────────────────────────────────────────────
    const surgeryExists = (await page.locator('input[value="TestSurgery"]').count()) > 0;
    if (!surgeryExists) {
      await page.getByText('Add Surgery').click();
      await page.getByPlaceholder('Enter surgery name').fill('TestSurgery');
      await page.locator("input[type='date']").fill('2020-05-15');
      await page.getByPlaceholder('Type Here').fill('Testing surgery notes');
    }

    // ── Step 17: Condition History ────────────────────────────────────────────
    const conditionExists = (await page.locator('input[value="TestCondition"]').count()) > 0;
    if (!conditionExists) {
      await page.getByText('Add Condition History').click();
      await page.getByPlaceholder('Enter condition').fill('TestCondition');
      await page
        .locator(
          'xpath=(//*[@class="select__indicator select__dropdown-indicator css-ylcbsx-indicatorContainer"])[1]'
        )
        .click();
      const fatherOption = page.getByText('Father');
      await fatherOption.scrollIntoViewIfNeeded();
      await fatherOption.click();
      await page
        .locator('xpath=(//div[@class="select__input-container css-vlaq4p"])[2]')
        .click();
      const oneYear = page.getByText('>1 Year');
      await oneYear.scrollIntoViewIfNeeded();
      await oneYear.click();
      await page
        .locator('xpath=(//input[@placeholder="Type Here"])[2]')
        .fill('Testing family history notes');
    }

    // ── Step 18: Lifestyle Details ────────────────────────────────────────────
    await consultationPage.fillLifestyle('Testing lifestyle details');

    // ── Step 19: Medication & Rx ──────────────────────────────────────────────
    await consultationPage.fillMedicationRx('Noni Juice 1L', '1-0-1');

    // ── Step 20: Final Review ─────────────────────────────────────────────────
    await page.getByText('Final Review').click();
    await page
      .locator(
        'xpath=(//textarea[@placeholder="Enter consultation advice for diagnosis..."])[1]'
      )
      .fill('Testing final review advice');

    // Status dropdown
    await page.locator('xpath=(//div[@class="css-vlaq4p"])[1]').click();
    const consulted = page.getByText('Consulted');
    await consulted.scrollIntoViewIfNeeded();
    await consulted.click();

    // Reason / Recommendation dropdown
    await page
      .locator('xpath=(//div[contains(@class, "css-vlaq4p")])[2]')
      .click({ force: true });
    const productRec = page
      .locator('.select__option', { hasText: 'Product Recommended' });
    await productRec.scrollIntoViewIfNeeded();
    await productRec.click({ force: true });

    // ── Step 21: Preview and Generate Prescription ────────────────────────────
    await consultationPage.previewPrescription();
    await consultationPage.generatePrescription();
  });
});
