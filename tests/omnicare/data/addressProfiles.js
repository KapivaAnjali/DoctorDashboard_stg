/**
 * Address Profiles for OmniCare Checkout Flow
 *
 * HOW TO USE:
 *   1. Add or edit any profile below.
 *   2. Change ACTIVE_PROFILE to the key you want to use.
 *   3. Run the test — when it reaches Step 12, enter the OTP manually
 *      in the browser window. The test waits up to 2 minutes for you.
 *
 * ACTIVE_PROFILE options:
 *   'anjali' | 'rahul' | 'priya' | 'arjun' | 'sneha' |
 *   'vikram' | 'meera' | 'rohan' | 'kavya' | 'amit'
 */

// ── Change this one line to switch between profiles ──────────────────────────
const ACTIVE_PROFILE = 'anjali';
// ─────────────────────────────────────────────────────────────────────────────

const ADDRESS_PROFILES = {

  anjali: {
    name:    'Anjali Shaw',
    phone:   '9830814266',
    email:   'anjali.shaw@kapiva.in',
    address: '123 MG Road, Kolkata',
    pincode: '700001',
  },

  rahul: {
    name:    'Rahul Sharma',
    phone:   '9876543210',
    email:   'rahul.sharma@example.com',
    address: '45 Brigade Road, Bengaluru',
    pincode: '560001',
  },

  priya: {
    name:    'Priya Mehta',
    phone:   '9123456789',
    email:   'priya.mehta@example.com',
    address: '7 Marine Lines, Mumbai',
    pincode: '400020',
  },

  arjun: {
    name:    'Arjun Nair',
    phone:   '9988776655',
    email:   'arjun.nair@example.com',
    address: '88 Anna Salai, Chennai',
    pincode: '600002',
  },

  sneha: {
    name:    'Sneha Reddy',
    phone:   '9001234567',
    email:   'sneha.reddy@example.com',
    address: '22 Jubilee Hills, Hyderabad',
    pincode: '500033',
  },

  vikram: {
    name:    'Vikram Singh',
    phone:   '9812345678',
    email:   'vikram.singh@example.com',
    address: '10 Connaught Place, New Delhi',
    pincode: '110001',
  },

  meera: {
    name:    'Meera Iyer',
    phone:   '9700123456',
    email:   'meera.iyer@example.com',
    address: '3 Residency Road, Bengaluru',
    pincode: '560025',
  },

  rohan: {
    name:    'Rohan Desai',
    phone:   '9654321098',
    email:   'rohan.desai@example.com',
    address: '56 FC Road, Pune',
    pincode: '411004',
  },

  kavya: {
    name:    'Kavya Krishnan',
    phone:   '9543210987',
    email:   'kavya.krishnan@example.com',
    address: '14 Park Street, Kolkata',
    pincode: '700016',
  },

  amit: {
    name:    'Amit Joshi',
    phone:   '9432109876',
    email:   'amit.joshi@example.com',
    address: '9 CG Road, Ahmedabad',
    pincode: '380009',
  },

};

// Validate that the chosen profile exists
if (!ADDRESS_PROFILES[ACTIVE_PROFILE]) {
  throw new Error(
    `[addressProfiles] Unknown profile "${ACTIVE_PROFILE}". ` +
    `Valid options: ${Object.keys(ADDRESS_PROFILES).join(', ')}`
  );
}

module.exports = {
  ADDRESS_PROFILES,
  ACTIVE_PROFILE,
  activeAddress: ADDRESS_PROFILES[ACTIVE_PROFILE],
};
