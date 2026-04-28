const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const AppointmentsPage = require('../pages/AppointmentsPage');
const ConsultationPage = require('../pages/ConsultationPage');
const { sendSlackMessage } = require('../helpers/slackHelper');
const doctors = require('../../cypress/fixtures/doctors.json');

const BASE_URL = 'https://stg-hts.kapiva.tech/';
const TARGET_PATIENT = 'sam ok';

const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;

// ─── Refresh + popup check helper ────────────────────────────────────────────
async function refreshAndCheckPopup(page) {
  console.log('\n  ========================================');
  console.log(`  [STEP] Refreshing page now (Command+R)...`);
  console.log(`  [STEP] URL before refresh: ${page.url()}`);
  await page.keyboard.press('Meta+r');
  await page.waitForTimeout(2000);
  console.log(`  [STEP] URL after  refresh: ${page.url()}`);

  const popup = page.getByText('Unsaved changes found');
  const popupVisible = (await popup.count()) > 0 && await popup.isVisible();

  if (popupVisible) {
    console.log('  [POPUP] ✅ "Unsaved changes found" popup appeared!');
    console.log('  [POPUP] Clicking → "Restore saved data"');
    await page.getByText('Restore saved data').click();
    await page.waitForTimeout(600);
    console.log('  [POPUP] "Restore saved data" selected — form data restored.');
    const bannerVisible = await page.getByText('Saved form data has been restored.').isVisible().catch(() => false);
    console.log(bannerVisible
      ? '  [BANNER] ✅ Restore banner appeared successfully.'
      : '  [BANNER] ❌ Restore banner did NOT appear.');
  } else {
    console.log('  [POPUP] ❌ "Unsaved changes found" popup did NOT appear.');
  }
  console.log('  ========================================\n');
}

test.describe('Doctor Verification and Prescription Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.setViewportSize({ width: 1536, height: 960 });
  });

  test('Verifies doctor profile, matches with credentials, and generates prescription', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const appointmentsPage = new AppointmentsPage(page);
    const consultationPage = new ConsultationPage(page);

    // ── 1. Login as admin viewer ────────────────────────────────────────────
    await loginPage.login('anjali.shaw@kapiva.in', 'a');
    await page.waitForTimeout(2000);

    // ── 2. Navigate to Today's Appointments and find the patient ────────────
    await appointmentsPage.navigate();
    await appointmentsPage.clickToday();
    await appointmentsPage.handleConsultantDropdown();
    const adminCard = await appointmentsPage.findLatestPatientCard(TARGET_PATIENT);

    // ── 3. Extract the assigned doctor's ProfID from the card ───────────────
    const extractedProfId = await appointmentsPage.extractDoctorId(adminCard);
    console.log(`Extracted Doctor ID: ${extractedProfId}`);

    // ── 4. Match ProfID against fixture and re-login as that doctor ─────────
    const matchedDoctor = doctors.find(
      (doc) => doc.profId.trim().toLowerCase() === extractedProfId.toLowerCase()
    );
    if (!matchedDoctor) {
      throw new Error(`Doctor ID "${extractedProfId}" not found in doctors fixture.`);
    }

    await loginPage.logout(BASE_URL);
    await loginPage.login(matchedDoctor.email, matchedDoctor.password);
    await page.waitForTimeout(4000);

    // ── 5. Navigate to appointments again and open the consultation ─────────
    await appointmentsPage.navigate();
    const doctorCard = await appointmentsPage.findLatestPatientCard(TARGET_PATIENT);
    await doctorCard.click({ force: true });
    await page.waitForTimeout(2000);

    // ── 6. Fill vitals with real typing so React caches the data ────────────
    await consultationPage.fillLanguageAndGender();

    const ageInput = page.getByPlaceholder('Enter age');
    if ((await ageInput.count()) > 0) {
      await ageInput.click();
      await page.keyboard.press('Control+A');
      await ageInput.pressSequentially('23');
      await page.waitForTimeout(300);
      console.log('  [VITALS] Age typed: 23');
    }

    const heightInput = page.getByPlaceholder('e.g. 170');
    if ((await heightInput.count()) > 0) {
      await heightInput.click();
      await page.keyboard.press('Control+A');
      await heightInput.pressSequentially('165');
      await page.waitForTimeout(300);
      console.log('  [VITALS] Height typed: 165');
    }

    // Allow app to write data to cache before refresh
    await page.waitForTimeout(800);

    // ── 7. Refresh page and check for "Unsaved changes found" popup ──────────
    await refreshAndCheckPopup(page);

    // ── 8. Continue filling the rest of the form ─────────────────────────────
    await consultationPage.expandAndFillNotes('Automated testing notes');
    await consultationPage.sendReminder();
    await consultationPage.raiseTicket();

    // Medical History
    await consultationPage.fillMedicalHistory();

    // ── Reload page after filling Medical History and check for popup ─────────
    console.log('\n  ========================================');
    console.log('  [RELOAD] Reloading page after Medical History fill...');
    console.log(`  [RELOAD] URL before reload: ${page.url()}`);
    await page.reload();
    await page.waitForTimeout(2000);
    console.log(`  [RELOAD] URL after  reload: ${page.url()}`);

    const popup = page.getByText('Unsaved changes found');
    const popupVisible = (await popup.count()) > 0 && await popup.isVisible();

    if (popupVisible) {
      console.log('  [POPUP] ✅ "Unsaved changes found" popup appeared after reload!');
      // Test "Restore saved data"
      console.log('  [POPUP] Clicking → "Restore saved data"');
      await page.getByText('Restore saved data').click();
      await page.waitForTimeout(600);
      const banner = await page.getByText('Saved form data has been restored.').isVisible().catch(() => false);
      console.log(banner
        ? '  [BANNER] ✅ "Saved form data has been restored." banner appeared!'
        : '  [BANNER] ❌ Banner did NOT appear.');
    } else {
      console.log('  [POPUP] ❌ "Unsaved changes found" popup did NOT appear after reload.');
    }
    console.log('  ========================================\n');

    // After reload, re-click Medical History tab before continuing
    await page.getByText('Medical History').click();
    await page.waitForTimeout(500);
    await consultationPage.cleanupAndAddSurgery();
    await consultationPage.cleanupAndAddCondition();

    // Lifestyle
    await consultationPage.fillLifestyle('Testing lifestyle details');

    // Medication & Rx
    await consultationPage.fillMedicationRx('Shilajit Energy Sips', '1-0-1');

    // Final Review
    await consultationPage.fillFinalReview(
      'Testing final review advice',
      'Consulted',
      'Product Recommended'
    );

    // ── 9. Preview and generate prescription ────────────────────────────────
    await consultationPage.previewPrescription();
    await consultationPage.generatePrescription();

    await consultationPage.previewPrescription();
    await consultationPage.generatePrescription();

    // ── 10. Notify Slack on success ──────────────────────────────────────────
    await sendSlackMessage({
      token: SLACK_TOKEN,
      channel: SLACK_CHANNEL,
      message: `✅ *Prescription Generated*\n*Patient:* ${TARGET_PATIENT}\n*Doctor ID:* ${extractedProfId}`,
    });
  });
});
