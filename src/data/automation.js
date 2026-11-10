// Automation data for QualityView: the no-code test library, test batteries, the remote
// device farm, user stories waiting for tests and scheduled executions.
// All of it is fictional and belongs to the Meridian Bank R4.2 release.

export const STEP_TYPES = {
  open: { label: 'Open page', target: 'URL or screen', value: false },
  click: { label: 'Click', target: 'Element', value: false },
  type: { label: 'Type text', target: 'Field', value: true },
  select: { label: 'Select option', target: 'Dropdown', value: true },
  wait: { label: 'Wait for', target: 'Element or text', value: false },
  assertText: { label: 'Check text', target: 'Element', value: true },
  assertVisible: { label: 'Check visible', target: 'Element', value: false },
};

export const DEVICES = [
  { id: 'chrome', label: 'Chrome 131', kind: 'Desktop', os: 'Windows 11' },
  { id: 'edge', label: 'Edge 131', kind: 'Desktop', os: 'Windows 11' },
  { id: 'firefox', label: 'Firefox 133', kind: 'Desktop', os: 'macOS 15' },
  { id: 'safari', label: 'Safari 18', kind: 'Desktop', os: 'macOS 15' },
  { id: 'pixel', label: 'Pixel 9', kind: 'Mobile', os: 'Android 15' },
  { id: 'galaxy', label: 'Galaxy S24', kind: 'Mobile', os: 'Android 14' },
  { id: 'iphone', label: 'iPhone 16', kind: 'Mobile', os: 'iOS 18' },
  { id: 'ipad', label: 'iPad Air', kind: 'Tablet', os: 'iPadOS 18' },
];

export const ENVIRONMENTS = ['SIT', 'UAT', 'Pre-production'];

const s = (type, target, value = '') => ({ type, target, value });

// Automated scripts built in the no-code builder. `tc` links back to a test case.
export const initialLibrary = [
  {
    id: 'AT-01',
    tc: 'TC-201',
    reqId: 'REQ-101',
    title: 'Valid Portuguese IBAN is accepted',
    source: 'Builder',
    steps: [
      s('open', 'Payments › New instant transfer'),
      s('type', 'IBAN field', 'PT50 0002 0123 1234 5678 9015 4'),
      s('click', 'Continue button'),
      s('assertVisible', 'Beneficiary summary'),
    ],
  },
  {
    id: 'AT-02',
    tc: 'TC-210',
    reqId: 'REQ-102',
    title: 'SCA challenge shown before every instant payment',
    source: 'Builder',
    steps: [
      s('open', 'Payments › New instant transfer'),
      s('type', 'Amount field', '250.00'),
      s('click', 'Confirm button'),
      s('assertVisible', 'SCA challenge dialog'),
    ],
  },
  {
    id: 'AT-03',
    tc: 'TC-230',
    reqId: 'REQ-104',
    title: '€100,000.01 transfer is rejected',
    source: 'AI',
    steps: [
      s('open', 'Payments › New instant transfer'),
      s('type', 'Amount field', '100000.01'),
      s('click', 'Confirm button'),
      s('assertText', 'Error message', 'exceeds the instant payment limit'),
    ],
  },
  {
    id: 'AT-04',
    tc: 'TC-250',
    reqId: 'REQ-106',
    title: 'Double-tap on Confirm sends one payment',
    source: 'Builder',
    steps: [
      s('open', 'Payments › New instant transfer'),
      s('type', 'Amount field', '50.00'),
      s('click', 'Confirm button'),
      s('click', 'Confirm button'),
      s('assertText', 'Transactions list', '1 new payment'),
    ],
  },
  {
    id: 'AT-05',
    tc: 'TC-260',
    reqId: 'REQ-107',
    title: 'TIPS outage routes payment to standard SCT',
    source: 'Builder',
    steps: [
      s('open', 'Admin › Simulators › TIPS'),
      s('select', 'TIPS status', 'Unavailable'),
      s('open', 'Payments › New instant transfer'),
      s('click', 'Confirm button'),
      s('assertText', 'Confirmation banner', 'next business day'),
    ],
  },
  {
    id: 'AT-06',
    tc: 'TC-270',
    reqId: 'REQ-108',
    title: 'Push notification within 10 s of settlement',
    source: 'Builder',
    steps: [
      s('open', 'Payments › New instant transfer'),
      s('click', 'Confirm button'),
      s('wait', 'Push notification'),
      s('assertText', 'Push notification', 'Payment sent'),
    ],
  },
  {
    id: 'AT-07',
    tc: 'TC-280',
    reqId: 'REQ-109',
    title: 'Reason AM04 shown in plain Portuguese',
    source: 'AI',
    steps: [
      s('open', 'Definições › Idioma'),
      s('select', 'Idioma', 'Português'),
      s('open', 'Pagamentos › Transferência imediata'),
      s('assertText', 'Mensagem de erro', 'Saldo insuficiente'),
    ],
  },
  {
    id: 'AT-08',
    tc: 'TC-290',
    reqId: 'REQ-110',
    title: 'PDF receipt lists fees and timestamps',
    source: 'Builder',
    steps: [
      s('open', 'Accounts › History'),
      s('click', 'Latest instant payment'),
      s('click', 'Download receipt'),
      s('assertText', 'Receipt', 'Fee'),
    ],
  },
];

export const initialBatteries = [
  { id: 'smoke', name: 'Smoke – payment journey', tests: ['AT-01', 'AT-02', 'AT-03'] },
  { id: 'regression', name: 'Full regression R4.2', tests: ['AT-01', 'AT-02', 'AT-03', 'AT-04', 'AT-05', 'AT-06', 'AT-07', 'AT-08'] },
  { id: 'limits', name: 'Limits and duplicates', tests: ['AT-03', 'AT-04'] },
];

// New or changed user stories picked up from the backlog: these drive the Smart alerts.
export const userStories = [
  {
    id: 'US-431',
    project: 'Core Payments',
    found: 'Today 08:42',
    text: `As a retail customer
I want to save a beneficiary after an instant payment
So that I can pay them again faster

Acceptance criteria:
- The "Save beneficiary" option appears on the confirmation screen
- A saved beneficiary needs a nickname of up to 30 characters
- The same IBAN cannot be saved twice
- Saved beneficiaries appear first in the payee list`,
  },
  {
    id: 'US-428',
    project: 'Core Payments',
    found: 'Yesterday 17:05',
    text: `As a business customer
I want to approve instant payments above €15,000 with a second approver
So that large payments follow the four-eyes rule

Acceptance criteria:
- Payments above €15,000 go to "Awaiting approval"
- The approver cannot be the person who created the payment
- A pending payment expires after 24 hours
- The creator is notified when the payment is approved or rejected`,
  },
  {
    id: 'US-425',
    project: 'Mobile App',
    found: 'Mon 14:20',
    text: `As a customer
I want to see the status of an instant payment in the app
So that I know when the money has arrived

Acceptance criteria:
- Status shows Sent, Settled or Rejected
- A rejected payment shows the reason in plain language
- The status updates without refreshing the screen`,
  },
];

export const initialSchedules = [
  { id: 'SCH-1', battery: 'regression', devices: ['chrome', 'iphone', 'pixel'], env: 'SIT', recurrence: 'weekdays', time: '02:00', selfHealing: true },
  { id: 'SCH-2', battery: 'smoke', devices: ['chrome'], env: 'UAT', recurrence: 'daily', time: '07:30', selfHealing: true },
];
