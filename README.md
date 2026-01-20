# Kapiva Doctor Consultation – E2E Automation Framework

## Project Overview

This repository contains an End-to-End (E2E) automation testing framework developed to validate the **Free Consultation** and **HCT/CS Booking** workflows on the Kapiva platform.

The framework is designed to simulate real-world **patient and doctor journeys**, ensuring that booking, assignment, and consultation management flows function reliably. It also helps identify potential **edge cases and regression risks** as the product evolves.

The documentation and structure of this project are intentionally created to allow **any new team member** to quickly understand the purpose, setup, and execution of the automation suite.

---

## Objective

The automation framework aims to:

- Validate Free Consultation booking flows  
- Verify HCT / CS consultation scheduling  
- Test Doctor Working Bench operations  
- Validate Doctor Dashboard access and consultation visibility  
- Simulate post-booking doctor actions  
- Detect edge-case and failure scenarios  
- Enable long-term regression coverage for consultation workflows  

---

## Scope of Automation

### Patient Journey
1. User accesses the Kapiva platform  
2. Initiates a Free Consultation  
3. Selects HCT / CS consultation category  
4. Completes booking process  
5. Receives booking confirmation  

### Doctor Working Bench Journey
6. Doctor logs into the Working Bench  
7. Newly created consultation appears in the queue  
8. Doctor opens consultation details  
9. Doctor and patient details are verified  

### Doctor Dashboard Journey
10. Doctor logs into the Doctor Dashboard  
11. Consultation details are validated  
12. Doctor performs consultation actions  
13. Consultation status updates are verified  

---

## Rationale

Manual verification of consultation booking and doctor assignment workflows is time-intensive and prone to oversight. This automation framework ensures:

- Continuous validation of business-critical consultation flows  
- Early detection of booking and assignment issues  
- Reduced dependency on manual regression testing  
- Improved long-term stability of doctor-patient workflows  

---

## Technology Stack

- Cypress – Web Automation  
- Appium – Mobile Automation (if applicable)  
- JavaScript  
- Node.js  
- Git  

---

## Prerequisites

Before executing the tests, ensure the following are installed:

- Node.js (version 18 or above)  
- npm  
- Git  
- Google Chrome browser  
- Test credentials for:
  - Patient account  
  - Doctor account  

Verify installations:

node -v
npm -v
git -v
