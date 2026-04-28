# Kapiva Doctor Dashboard – E2E Automation Framework (Playwright)

## Project Overview

This repository contains an End-to-End (E2E) automation testing framework built with **Playwright** to validate the **Doctor Dashboard**, **Free Consultation**, **HCT/CS Booking**, **Program Booking**, and **OmniCare** workflows on the Kapiva platform.

The framework simulates real-world **patient and doctor journeys**, ensuring that booking, assignment, consultation management, prescription generation, and e-commerce flows function reliably. It also covers **edge cases, regression scenarios, and data-caching behaviour** as the product evolves.

---

## Objectives

- Validate Free Consultation and HCT / CS consultation booking flows
- Verify Program Booking workflows end-to-end
- Test Doctor Working Bench operations (vitals, medical history, prescription)
- Validate consultation form data caching and recovery
- Test OmniCare storefront product flows on mobile viewports
- Detect edge-case and failure scenarios automatically
- Enable long-term regression coverage with Slack notifications

---

## Technology Stack

| Tool / Library | Version | Purpose |
|---|---|---|
| Playwright | ^1.59.1 | Primary E2E test framework |
| Node.js | 18+ | Runtime |
| JavaScript (ES6) | – | Test language |
| Chromium | bundled | Browser under test |
| Slack API | – | Test result notifications |
| Cypress | ^15.8.2 | Legacy framework (kept for reference) |

---

## Project Structure

```
DoctorDashboard Playwright/
│
├── tests/
│   ├── specs/                             # Core test suites
│   │   ├── CachingConsultation.spec.js    # Form data caching & recovery (37 TCs)
│   │   ├── HCT_booking.spec.js            # CS/HCT consultation booking
│   │   ├── profile_creation.spec.js       # Patient profile creation
│   │   ├── FirstMilestone_Verifying_Prescription.spec.js
│   │   └── SecondMilestone.spec.js        # Full consultation & prescription
│   │
│   ├── omnicare/
│   │   ├── specs/
│   │   │   └── OmniCare.spec.js           # OmniCare mobile storefront tests
│   │   └── pages/
│   │       └── OmniCarePage.js            # Page object for OmniCare
│   │
│   ├── pages/                             # Page Object Model (POM) layer
│   │   ├── LoginPage.js
│   │   ├── AppointmentsPage.js
│   │   ├── ConsultationPage.js
│   │   ├── BookingPage.js
│   │   └── ProfilePage.js
│   │
│   └── helpers/
│       └── slackHelper.js                 # Slack notification utility
│
├── cypress/
│   └── fixtures/
│       └── doctors.json                   # Doctor credentials (120+ entries)
│
├── playwright.config.js                   # Playwright configuration
├── cypress.config.js                      # Legacy Cypress config
├── package.json
└── README.md
```

---

## Test Suites

### 1. CachingConsultation.spec.js
Validates the consultation form's **data caching and recovery** mechanism across 37 test cases.

| Category | TCs | What is tested |
|---|---|---|
| Positive | TC_01–TC_06 | Data persists during form fill, survives navigation, is appointment-specific, fields restore on reload, tab navigation, prescription-less caching |
| Negative | TC_07–TC_12 | Cache clears on discard, cross-appointment isolation, no popup for empty data, corrupted cache, different doctor access, large form data |
| Edge Cases | TC_13–TC_24 | Popup UI/buttons, partial data entry, browser tab closure, localStorage-disabled, multi-tab shared cache, network interruption, cache expiry, XSS safety |
| Compatibility | TC_25–TC_37 | Chromium tests, incognito mode, localStorage fallback, hard/soft refresh, context restart |

**Flow:** Admin login → find patient → extract assigned doctor → re-login as doctor → open consultation → fill form → reload → verify popup & data restoration.

---

### 2. HCT_booking.spec.js
Validates the **CS/HCT consultation slot booking** workflow.

- Search user by phone number
- Verify User Details section is populated
- Inspect all available date slots
- Book first available slot on today's date
- Detect and skip if already booked
- Send Slack notification on successful booking

---

### 3. profile_creation.spec.js
Validates **patient profile creation** within the booking flow.

- Open the Profile creation modal
- Select relationship, gender
- Fill first name, last name, date of birth
- Select source / referred-by
- Close the modal

---

### 4. FirstMilestone_Verifying_Prescription.spec.js
Validates the **full consultation form fill and prescription generation** workflow (Milestone 1).

- Match doctor credentials against `doctors.json` fixture
- Fill vitals: age, height, language, gender
- Handle unsaved-changes popup
- Fill medical history (concern, medications, allergies)
- Add surgery and condition history
- Fill lifestyle details and medication/Rx
- Select final review status and recommendation
- Preview and generate prescription
- Send Slack notification with prescription details

---

### 5. SecondMilestone.spec.js
Validates **complex multi-section consultation** with file operations (Milestone 2).

- Doctor matching from patient cards
- Vitals: age, height, weight, blood group, program dropdown
- Add Blood Glucose vital field
- Diagnostic file upload, removal, and download
- Medical history: medications, allergies
- Surgery entry and condition history with family relations
- Create new patient profile inside consultation
- Full lifestyle, medication, final review, and prescription flow

---

### 6. OmniCare.spec.js
Validates **OmniCare storefront product flow** on a mobile viewport (iPhone 12: 390×844).

- Dismiss testing-site popup automatically
- Navigate to "Blood Sugar & Chronic Care" category
- Click "View All" and select "Dia Free Juice"
- Verify banner image on Product Detail Page
- Expand "How it works" section
- Verify benefits image loads correctly

---

## Page Object Model

### LoginPage.js
| Method | Description |
|---|---|
| `login(email, password)` | Fill credentials and wait for navigation |
| `logout(expectedUrl)` | Hover avatar, click logout, assert URL |

### AppointmentsPage.js
| Method | Description |
|---|---|
| `navigate()` | Open Today's Appointments tab |
| `clickToday()` | Navigate to today's date |
| `handleConsultantDropdown()` | Reset to "Select All Consultants" |
| `findLatestPatientCard(patient, daysBack)` | Scroll through hourly slots, search up to 7 days back |
| `extractDoctorId(card)` | Parse ProfID from card text (e.g. Prof104) |

### ConsultationPage.js
| Method | Description |
|---|---|
| `fillLanguageAndGender()` | Fill language and gender dropdowns |
| `fillAge() / fillHeight() / fillWeight()` | Fill vital fields |
| `fillMedicalHistory()` | Fill concern, medications, allergies |
| `cleanupAndAddSurgery()` | Remove old entries and add new surgery |
| `cleanupAndAddCondition()` | Remove old entries and add condition history |
| `fillLifestyle(notes)` | Fill lifestyle notes |
| `fillMedicationRx(product, dosage)` | Select product via react-select and fill dosage |
| `fillFinalReview(advice, status, rec)` | Fill advice, status, recommendation |
| `previewPrescription()` | Open prescription preview |
| `generatePrescription()` | Tick SVG checkbox and confirm generation |

### BookingPage.js
| Method | Description |
|---|---|
| `navigate()` | Click CS/HCT Booking |
| `searchUser(phone)` | Enter phone number and search |
| `verifyUserDetails()` | Assert User Details section is populated |
| `inspectDateSlots()` | Iterate all dates, log slot counts, return today's string |
| `returnToTodayAndBook(todayStr)` | Return to today and book first available slot |
| `checkExistingBookingToday()` | Detect if booking already exists for today |

### ProfilePage.js
| Method | Description |
|---|---|
| `navigate()` | Open Profiles section |
| `createNewProfile()` | Click Create New Profile |
| `selectRelationship(rel)` | Select from react-select |
| `selectGender(gender)` | CSS-based gender selector |
| `fillName() / fillDOB(dob)` | Fill name and date of birth |
| `selectSource(source)` | Select referred-by source |
| `closeModal()` | Close the modal |

### OmniCarePage.js
| Method | Description |
|---|---|
| `navigate(url)` | Navigate with prod→staging URL interception and auto popup close |
| `closePopupIfPresent()` | Multi-strategy popup dismissal (SVG X, class patterns, Escape) |
| `clickBloodSugarCategory()` | Scroll with 10 passes to find and click category |
| `selectDiaFreeJuice()` | Lazy-render scroll (8 passes) to find and click product |
| `verifyBannerImage()` | Scroll until PDP banner image is visible |
| `clickHowItWorks()` | Scroll, click, wait for benefits image |
| `verifyBenefitsImage()` | Scroll until benefits image is visible |

---

## Helpers

### slackHelper.js
Sends test result notifications to the **HTS Staging Slack channel**.

```js
sendSlackMessage({ token, channel, message })
```

- Uses Node.js native `https` module
- Returns `Promise<boolean>`
- Gracefully handles errors (logs and resolves `false`)

---

## Test Data

### cypress/fixtures/doctors.json
Contains credentials for **120+ doctors** used for re-login in consultation tests.

```json
[
  {
    "profId": "Prof136",
    "name": "Kruti Bhavsar",
    "email": "kruti@kapiva.in",
    "password": "k"
  }
]
```

**Matching logic:** Tests extract a ProfID from a patient card on the Appointments page, look up the matching entry in `doctors.json`, and re-login as that doctor to open the consultation.

---

## Configuration

### playwright.config.js

```js
{
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 120000,           // 2 min per test
  expect: { timeout: 15000 },
  use: {
    baseURL: 'https://stg-hts.kapiva.tech/',
    viewport: { width: 1536, height: 960 },
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
}
```

---

## Prerequisites

- Node.js v18 or above
- npm
- Git
- Google Chrome (Playwright manages its own Chromium binary)
- Test credentials for admin and doctor accounts

Verify installations:

```bash
node -v
npm -v
git --version
```

---

## Setup & Installation

```bash
# Clone the repository
git clone https://github.com/KapivaAnjali/DoctorDashboard_stg.git
cd DoctorDashboard_stg

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

---

## Running Tests

```bash
# Run all Playwright tests (headless)
npm run test:pw

# Run with a visible browser window
npm run test:pw:headed

# Run in interactive UI mode
npm run test:pw:ui

# Run a specific spec file
npx playwright test tests/specs/HCT_booking.spec.js

# Run a specific spec file with browser visible
npx playwright test tests/specs/HCT_booking.spec.js --headed
```

---

## Test Results & Artifacts

- **Screenshots**: Captured automatically on test failure (`test-results/`)
- **Videos**: Retained on failure for replay
- **Slack notifications**: Sent to HTS Staging channel on booking/prescription events
- **HTML report**: Generated after each run

```bash
# Open the last HTML report
npx playwright show-report
```

---

## Environment

| Setting | Value |
|---|---|
| Base URL (HTS) | `https://stg-hts.kapiva.tech/` |
| OmniCare URL | `https://staging.kapiva.in/` |
| Browser | Chromium (Desktop Chrome) |
| Viewport | 1536 × 960 (Desktop), 390 × 844 (Mobile – OmniCare) |

---

## Key Design Patterns

- **Page Object Model (POM)** – all selectors and actions encapsulated in page classes
- **React Select handling** – DOM event dispatch (`mousedown` + `click`) to handle React dropdowns
- **Virtual scroll** – hourly scroll stops (9 AM–11 PM) to surface patient cards
- **Lazy loading** – progressive multi-pass scrolling for OmniCare product listing
- **Popup automation** – multi-strategy detection and dismissal (SVG X, class patterns, JavaScript evaluate, Escape key)
- **Conditional fills** – `_fillIfEmpty()` and `_selectDropdownIfEmpty()` prevent re-filling already populated fields
- **Slack integration** – automated pass/fail notifications with context

---

## Contributing

1. Create a feature branch: `git checkout -b feat/<feature-name>`
2. Make your changes and write/update specs
3. Run the test suite: `npm run test:pw:headed`
4. Push and open a pull request against `main`
