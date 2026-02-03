// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
require('cypress-xpath');
import 'cypress-real-events/support';
import 'cypress-file-upload';

// -------------------------------
// Initialize analytics events storage
// -------------------------------
Cypress.env('analyticsEvents', [])

// -------------------------------
// Stub navigator.sendBeacon globally
// -------------------------------
Cypress.on('window:before:load', (win) => {
  if (win.navigator && win.navigator.sendBeacon) {
    cy.stub(win.navigator, 'sendBeacon').callsFake((url, data) => {
      const events = Cypress.env('analyticsEvents') || []
      events.push({ type: 'sendBeacon', url, payload: data })
      Cypress.env('analyticsEvents', events)
      console.log('📡 sendBeacon Event:', url, data)
      return true
    })
  }
})

// -------------------------------
// Intercept all POST requests to analytics endpoints
// -------------------------------
Cypress.on('test:before:run', () => {
  Cypress.env('analyticsEvents', []) // reset before each test
})

beforeEach(() => {
  cy.intercept('POST', '**/s2s.kapiva.in/**', (req) => {
    const events = Cypress.env('analyticsEvents') || []
    events.push({ type: 'XHR', url: req.url, payload: req.body })
    Cypress.env('analyticsEvents', events)
    console.log('📊 XHR Event:', req.body)
  })
})

// -------------------------------
// Ignore known uncaught exceptions
// -------------------------------
Cypress.on('uncaught:exception', (err) => {
  const host = window?.location?.hostname
  const isKapiva = host && host.includes('kapiva.in')
  const msg = err?.message || ''

  if (isKapiva && (msg.includes('nitro.view is not a function') || msg.includes('nitro.productView is not a function'))) return false
  if (isKapiva && msg.includes('jQuery is not defined')) return false
  if (isKapiva && msg.includes('Script error')) return false
  if (isKapiva && !msg && !err.stack) return false
})
