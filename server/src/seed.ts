/**
 * SYNTHETIC DATA ONLY (BR-048, Gate 0). Generated from src/data/mockDb.ts so the server starts
 * from exactly the dataset the frontend mock uses. Dates are relative to the moment of seeding.
 */
import type {
  AIInteraction, AbsenceState, AccessRequest, AppNotification, AppointmentRequest, AuditEvent, AuditPara,
  CalendarEvent, ComplianceReminder, ConfigState, Contact, CsrProject, DakItem, DecideItem, DecisionEntry, Device,
  Draft, Emergency, Expense, FamilyEvent, Holding, Inspection, JobRun, LegalCase, Liability, Meeting, OfficeDocument,
  PeaceSettings, Policy, PrivateDue, QueueEntry, SecurityAlert, ServiceHealth, StatutoryItem, Task, User, VaultFolder,
  Visitor, WardSummary,
} from '../../src/types/index.js';
import { at, minutesAgo } from './util.js';

export const CATEGORIES = [
  'Water supply', 'Building permission', 'Roads', 'Solid waste', 'Storm water drains', 'Health',
  'Encroachment', 'Property tax', 'Gardens and trees', 'Participate Mumbai', 'Redevelopment', 'Other',
];
export const WARDS = ['W1', 'W2', 'W3', 'W4'];

export function createSeed() {
  const users: User[] = [
    { id: 'U-01', name: 'A. Deshmukh (synthetic)', post: 'Deputy Municipal Commissioner, Zone II', role: 'ROLE-01', scope: 'Wards W1–W4', mfa: 'passkey', devices: 1, lastSignIn: minutesAgo(35), status: 'active', email: 'dmc.z2@synthetic.example' },
    { id: 'U-02', name: 'P. Sawant (synthetic)', post: 'PA to DMC', role: 'ROLE-02', scope: 'Office', mfa: 'passkey', devices: 2, lastSignIn: minutesAgo(5), status: 'active', email: 'pa.dmc@synthetic.example' },
    { id: 'U-03', name: 'R. Iyer (synthetic)', post: 'Office Administrator', role: 'ROLE-03', scope: 'Office', mfa: 'otp-app', devices: 1, lastSignIn: minutesAgo(300), status: 'active' },
    { id: 'U-04', name: 'Reception Desk (synthetic)', post: 'Reception', role: 'ROLE-04', scope: 'Office (today)', mfa: 'pin', devices: 1, lastSignIn: minutesAgo(90), status: 'active' },
    { id: 'U-05', name: 'S. Kulkarni (synthetic)', post: 'Assistant Engineer, Ward W3', role: 'ROLE-05', scope: 'Ward W3', mfa: 'otp-app', devices: 1, lastSignIn: minutesAgo(2900), status: 'active' },
    { id: 'U-06', name: 'M. Shaikh (synthetic)', post: 'Executive Engineer, Roads', role: 'ROLE-06', scope: 'Roads (Zone II)', mfa: 'otp-app', devices: 1, lastSignIn: minutesAgo(1500), status: 'active' },
    { id: 'U-07', name: 'N. Rao (synthetic)', post: 'Participate Mumbai Coordinator', role: 'ROLE-07', scope: 'PM cell', mfa: 'otp-app', devices: 1, lastSignIn: minutesAgo(720), status: 'active' },
    { id: 'U-08', name: 'K. Pillai (synthetic)', post: 'System Administrator (BMC IT)', role: 'ROLE-08', scope: 'Platform', mfa: 'passkey', devices: 1, lastSignIn: minutesAgo(60), status: 'active' },
    { id: 'U-09', name: 'AASIOM Support (synthetic)', post: 'Support Engineer', role: 'ROLE-09', scope: 'Break-glass only', mfa: 'passkey', devices: 1, lastSignIn: minutesAgo(9000), status: 'active' },
    { id: 'U-10', name: 'V. Menon (synthetic)', post: 'Security Auditor', role: 'ROLE-10', scope: 'Audit (read-only)', mfa: 'passkey', devices: 1, lastSignIn: minutesAgo(4300), status: 'active' },
    { id: 'U-11', name: 'A. Deshmukh — private (synthetic)', post: 'Personal Environment Owner', role: 'ROLE-11', scope: 'Private app', mfa: 'passkey', devices: 1, lastSignIn: minutesAgo(1440), status: 'active' },
    { id: 'U-12', name: 'J. Fernandes (synthetic)', post: 'Junior Engineer, Ward W1', role: 'ROLE-05', scope: 'Ward W1', mfa: 'otp-app', devices: 0, lastSignIn: minutesAgo(20000), status: 'deactivated' },
  ];
  
  const calendar: CalendarEvent[] = [
    { id: 'EV-01', title: 'Daily stand-up with PA', type: 'internal', start: at(0, '09:00'), end: at(0, '09:30'), location: 'DMC office' },
    { id: 'EV-02', title: 'Ward review — Ward W2', type: 'meeting', start: at(0, '10:30'), end: at(0, '11:30'), location: 'DMC office', ward: 'W2', attendees: ['AC Ward W2', 'EE Roads', 'EE Water', 'PA'], meetingId: 'MT-01', briefReady: true },
    { id: 'EV-03', title: 'Buffer', type: 'buffer', start: at(0, '11:30'), end: at(0, '11:45') },
    { id: 'EV-04', title: 'Visitor: R. Kulkarni (synthetic)', type: 'appointment', start: at(0, '12:00'), end: at(0, '12:20'), location: 'DMC office', briefReady: true },
    { id: 'EV-05', title: 'Busy', type: 'busy', start: at(0, '13:00'), end: at(0, '14:00') },
    { id: 'EV-06', title: 'Monsoon readiness review', type: 'meeting', start: at(0, '14:30'), end: at(0, '15:30'), location: 'Conference room 2', meetingId: 'MT-02', attendees: ['AC W1', 'AC W3', 'EE SWD', 'Disaster cell'] },
    { id: 'EV-07', title: 'Focus block', type: 'focus', start: at(0, '16:00'), end: at(0, '17:30') },
    { id: 'EV-08', title: 'Walk-in window', type: 'walkin-window', start: at(0, '17:30'), end: at(0, '18:30'), location: 'Public hall' },
    { id: 'EV-09', title: 'Site visit — Nullah N-4, Ward W3', type: 'site-visit', start: at(1, '08:30'), end: at(1, '10:00'), ward: 'W3', location: 'Ward W3' },
    { id: 'EV-10', title: 'Contractor review — road restoration', type: 'meeting', start: at(1, '11:00'), end: at(1, '12:00'), location: 'DMC office', meetingId: 'MT-03' },
    { id: 'EV-11', title: 'Focus block', type: 'focus', start: at(1, '15:00'), end: at(1, '16:30') },
    { id: 'EV-12', title: 'Ward review — Ward W4', type: 'meeting', start: at(2, '10:30'), end: at(2, '11:30'), ward: 'W4', location: 'DMC office' },
    { id: 'EV-13', title: 'Visitor: Housing society delegation (synthetic)', type: 'appointment', start: at(2, '12:00'), end: at(2, '12:30') },
    { id: 'EV-14', title: 'Busy', type: 'busy', start: at(2, '18:00'), end: at(2, '20:00') },
    { id: 'EV-15', title: 'Participate Mumbai partner review', type: 'meeting', start: at(3, '11:00'), end: at(3, '12:00') },
    { id: 'EV-16', title: 'Site visit — Ward W4 market', type: 'site-visit', start: at(3, '15:00'), end: at(3, '16:30'), status: 'proposed', proposedBy: 'PA', ward: 'W4' },
    { id: 'EV-17', title: 'Zone coordination meeting', type: 'meeting', start: at(4, '10:00'), end: at(4, '11:30') },
    { id: 'EV-18', title: 'Walk-in window', type: 'walkin-window', start: at(4, '17:30'), end: at(4, '18:30') },
    { id: 'EV-19', title: 'Daily stand-up with PA', type: 'internal', start: at(1, '09:00'), end: at(1, '09:30') },
    { id: 'EV-20', title: 'Daily stand-up with PA', type: 'internal', start: at(2, '09:00'), end: at(2, '09:30') },
  ];
  
  const requests: AppointmentRequest[] = [
    { id: 'AR-1042', receivedAt: minutesAgo(95), channel: 'web', visitorName: 'M. Joshi (synthetic)', mobile: '98XXXXXX14', category: 'Water supply', ward: 'W2', purpose: 'Low water pressure in building for 3 weeks', reserved: false, priorVisits: 1, status: 'requested', visitorId: 'V-03' },
    { id: 'AR-1041', receivedAt: minutesAgo(120), channel: 'phone', visitorName: 'Society rep (synthetic)', mobile: '97XXXXXX40', category: 'Redevelopment', ward: 'W1', purpose: 'Query on redevelopment permission status', reserved: false, priorVisits: 0, status: 'requested' },
    { id: 'AR-1040', receivedAt: minutesAgo(600), channel: 'email', visitorName: 'Housing society delegation (synthetic)', mobile: '99XXXXXX02', category: 'Encroachment', ward: 'W1', purpose: 'Footpath encroachment near society gate', reserved: true, priorVisits: 2, status: 'requested' },
    { id: 'AR-1039', receivedAt: minutesAgo(1500), channel: 'letter', visitorName: 'NGO Sahyog (synthetic)', mobile: '90XXXXXX77', category: 'Participate Mumbai', ward: '—', purpose: 'CSR proposal for school toilets', reserved: false, priorVisits: 2, status: 'requested' },
    { id: 'AR-1038', receivedAt: minutesAgo(2000), channel: 'web', visitorName: 'T. Gaikwad (synthetic)', mobile: '88XXXXXX51', category: 'Property tax', ward: 'W4', purpose: 'Assessment correction request', reserved: false, priorVisits: 0, status: 'requested' },
    { id: 'AR-1037', receivedAt: minutesAgo(4800), channel: 'phone', visitorName: 'Corporator office (synthetic)', mobile: '98XXXXXX88', category: 'Roads', ward: 'W3', purpose: 'Road restoration after utility work', reserved: true, priorVisits: 4, status: 'requested' },
    { id: 'AR-1036', receivedAt: minutesAgo(5200), channel: 'web', visitorName: 'L. D\'Souza (synthetic)', mobile: '91XXXXXX33', category: 'Gardens and trees', ward: 'W2', purpose: 'Dangerous tree before monsoon', reserved: false, priorVisits: 0, status: 'requested' },
    { id: 'AR-1035', receivedAt: minutesAgo(5500), channel: 'web', visitorName: 'K. Naik (synthetic)', mobile: '93XXXXXX09', category: 'Solid waste', ward: 'W1', purpose: 'Garbage collection timing', reserved: false, priorVisits: 1, status: 'requested' },
    { id: 'AR-1034', receivedAt: minutesAgo(7000), channel: 'walk-in', visitorName: 'Traders association (synthetic)', mobile: '95XXXXXX61', category: 'Encroachment', ward: 'W4', purpose: 'Hawking zone concerns', reserved: false, priorVisits: 3, status: 'requested' },
  ];
  
  const queue: QueueEntry[] = [
    { id: 'Q-1', token: 'A-07', visitorName: 'S. Patil (synthetic)', type: 'appointment', category: 'Water supply', ward: 'W2', arrivedAt: at(0, '11:10'), appointmentTime: at(0, '11:30'), status: 'in-meeting', waitMin: [0, 0], purpose: 'Pipeline replacement follow-up' },
    { id: 'Q-2', token: 'W-12', visitorName: 'G. Kadam (synthetic)', type: 'walk-in', category: 'Building permission', ward: 'W3', arrivedAt: at(0, '10:40'), status: 'waiting', waitMin: [10, 20], routeSuggestion: 'Ward W3 Assistant Engineer (Building)', purpose: 'Occupation certificate delay' },
    { id: 'Q-3', token: 'A-08', visitorName: 'Delegation (synthetic)', type: 'appointment', category: 'Roads', ward: 'W1', arrivedAt: at(0, '11:40'), appointmentTime: at(0, '12:00'), status: 'waiting', waitMin: [25, 40], purpose: 'Road widening concerns' },
    { id: 'Q-4', token: 'W-13', visitorName: 'Sunita More (synthetic)', type: 'walk-in', category: 'Building permission', ward: 'W3', arrivedAt: at(0, '11:44'), status: 'waiting', waitMin: [30, 45], repeatMatch: true, visitorId: 'V-01', purpose: 'Follow-up on pending application' },
    { id: 'Q-5', token: 'W-14', visitorName: 'H. Bhosale (synthetic)', type: 'walk-in', category: 'Solid waste', ward: 'W2', arrivedAt: at(0, '11:52'), status: 'waiting', waitMin: [40, 60], routeSuggestion: 'Ward W2 Solid Waste Officer', purpose: 'Missed collection on lane 4' },
    { id: 'Q-6', token: 'W-15', visitorName: 'F. Qureshi (synthetic)', type: 'walk-in', category: 'Health', ward: 'W4', arrivedAt: at(0, '12:01'), status: 'waiting', waitMin: [50, 70], purpose: 'Mosquito breeding complaint' },
    { id: 'Q-7', token: 'W-11', visitorName: 'B. Jadhav (synthetic)', type: 'walk-in', category: 'Property tax', ward: 'W4', arrivedAt: at(0, '10:05'), status: 'done', waitMin: [0, 0] },
  ];
  
  const visitors: Visitor[] = [
    {
      id: 'V-01', name: 'Sunita More (synthetic)', mobile: '98XXXXXX21', language: 'mr', noticeVersion: '1.2', noticeDate: at(0, '11:44'),
      visits: [
        { date: at(0, '11:44'), type: 'Walk-in', ref: 'W-13', purpose: 'Building follow-up', outcome: 'Waiting' },
        { date: at(-18, '12:00'), type: 'Appointment', ref: 'AR-0988', purpose: 'Building application', outcome: 'Task created → AE W3' },
        { date: at(-67, '17:40'), type: 'Walk-in', ref: 'W-04', purpose: 'Water supply', outcome: 'Redirected to ward' },
      ],
      commitments: [{ text: 'Status update on application within 7 days', owner: 'AE Ward W3', due: at(-11), overdue: true }],
    },
    {
      id: 'V-02', name: 'R. Kulkarni (synthetic)', mobile: '97XXXXXX18', language: 'en', noticeVersion: '1.2', noticeDate: at(-3),
      visits: [{ date: at(-40, '12:00'), type: 'Appointment', ref: 'AR-0950', purpose: 'Society drainage', outcome: 'Task created → EE SWD' }],
      commitments: [],
    },
    {
      id: 'V-03', name: 'M. Joshi (synthetic)', mobile: '98XXXXXX14', language: 'mr', noticeVersion: '1.2', noticeDate: at(0),
      visits: [{ date: at(-25, '17:45'), type: 'Walk-in', ref: 'W-09', purpose: 'Water pressure', outcome: 'Redirected to EE Water W2' }],
      commitments: [{ text: 'Pressure test and report', owner: 'EE Water W2', due: at(2), overdue: false }],
    },
  ];
  
  function hist(...steps: [Task['state'], number, string][]) {
    return steps.map(([state, d, by]) => ({ state, at: at(d, '10:00'), by }));
  }
  
  const tasks: Task[] = [
    { id: 'T-101', title: 'Desilting report for nullah N-4', source: 'Meeting', sourceRef: 'MT-00 · 03 Nov review', ownerPost: 'AE Ward W3', ward: 'W3', due: at(-1), state: 'acknowledged', verificationRequired: true, evidence: 0, nudgesThisWeek: 2, nudgeCap: 3, priority: 'high', createdBy: 'DMC', createdAt: at(-6), history: hist(['draft', -6, 'PA'], ['assigned', -6, 'PA'], ['acknowledged', -5, 'AE Ward W3']) },
    { id: 'T-102', title: 'Footpath repair outside municipal school', source: 'Visit', sourceRef: 'Site visit 21 Oct', ownerPost: 'JE Ward W1', ward: 'W1', due: at(2), state: 'submitted', verificationRequired: true, evidence: 3, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: 'DMC', createdAt: at(-18), history: hist(['assigned', -18, 'PA'], ['acknowledged', -17, 'JE Ward W1'], ['in-progress', -10, 'JE Ward W1'], ['submitted', 0, 'JE Ward W1']) },
    { id: 'T-103', title: 'Hawker survey data — market lane', source: 'Voice', sourceRef: 'Voice note (confirmed)', ownerPost: 'Ward W1 nodal officer', ward: 'W1', due: at(0), state: 'acknowledged', verificationRequired: false, evidence: 0, nudgesThisWeek: 1, nudgeCap: 3, priority: 'normal', createdBy: 'DMC', createdAt: at(-4), history: hist(['assigned', -4, 'PA'], ['acknowledged', -3, 'Ward W1 nodal']) },
    { id: 'T-104', title: 'Reply to resident association letter', source: 'Document', sourceRef: 'AR-1033', ownerPost: 'PA', due: at(1), state: 'in-progress', verificationRequired: false, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: 'PA', createdAt: at(-2), history: hist(['assigned', -2, 'PA'], ['in-progress', -1, 'PA']) },
    { id: 'T-105', title: 'Status update to visitor S. More (synthetic) on building application', source: 'Visit', sourceRef: 'AR-0988', ownerPost: 'AE Ward W3', ward: 'W3', due: at(-13), state: 'assigned', verificationRequired: false, evidence: 0, nudgesThisWeek: 3, nudgeCap: 3, priority: 'high', createdBy: 'PA', createdAt: at(-18), escalated: true, history: hist(['assigned', -18, 'PA']) },
    { id: 'T-106', title: 'Tree trimming list before monsoon', source: 'Meeting', sourceRef: 'MT-02', ownerPost: 'Garden JE', ward: 'W2', due: at(3), state: 'in-progress', verificationRequired: true, evidence: 1, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: 'DMC', createdAt: at(-7), history: hist(['assigned', -7, 'PA'], ['acknowledged', -7, 'Garden JE'], ['in-progress', -5, 'Garden JE']) },
    { id: 'T-107', title: 'Contractor bill query — road restoration package 3', source: 'Meeting', sourceRef: 'MT-03 prep', ownerPost: 'EE Roads', due: at(-4), state: 'assigned', verificationRequired: false, evidence: 0, nudgesThisWeek: 3, nudgeCap: 3, priority: 'high', createdBy: 'DMC', createdAt: at(-12), escalated: true, history: hist(['assigned', -12, 'PA']) },
    { id: 'T-108', title: 'Pothole repairs — 3 roads in Ward W2', source: 'Meeting', sourceRef: 'Ward W2 review', ownerPost: 'EE Roads', ward: 'W2', due: at(5), state: 'in-progress', verificationRequired: true, evidence: 2, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: 'DMC', createdAt: at(-14), history: hist(['assigned', -14, 'PA'], ['acknowledged', -13, 'EE Roads'], ['in-progress', -9, 'EE Roads']) },
    { id: 'T-109', title: 'Water pressure test — building cluster, Ward W2', source: 'Exception', sourceRef: 'Repeat complaints (8)', ownerPost: 'EE Water W2', ward: 'W2', due: at(2), state: 'acknowledged', verificationRequired: true, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3, priority: 'high', createdBy: 'DMC', createdAt: at(-3), history: hist(['assigned', -3, 'PA'], ['acknowledged', -2, 'EE Water W2']) },
    { id: 'T-110', title: 'Storm water drain cleaning schedule — W4', source: 'Inspection', sourceRef: 'IN-07', ownerPost: 'AE SWD Ward W4', ward: 'W4', due: at(6), state: 'assigned', verificationRequired: true, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: 'DMC', createdAt: at(-1), history: hist(['assigned', -1, 'PA']) },
    { id: 'T-111', title: 'Prepare festival crowd management runbook', source: 'Manual', ownerPost: 'Disaster management cell', due: at(9), state: 'draft', verificationRequired: false, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3, priority: 'low', createdBy: 'PA', createdAt: at(0), history: hist(['draft', 0, 'PA']) },
    { id: 'T-112', title: 'Mosquito breeding inspection — construction sites W4', source: 'Visit', ownerPost: 'Medical Officer Health W4', ward: 'W4', due: at(-2), state: 'verified', verificationRequired: true, evidence: 5, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: 'DMC', createdAt: at(-10), history: hist(['assigned', -10, 'PA'], ['submitted', -3, 'MOH W4'], ['verified', -2, 'DMC']) },
    { id: 'T-113', title: 'Garbage collection timing change notice', source: 'Document', ownerPost: 'SWM Officer W1', ward: 'W1', due: at(-6), state: 'closed', verificationRequired: false, evidence: 1, nudgesThisWeek: 0, nudgeCap: 3, priority: 'low', createdBy: 'PA', createdAt: at(-15), history: hist(['assigned', -15, 'PA'], ['closed', -6, 'PA']) },
  ];
  
  const decide: DecideItem[] = [
    { id: 'D-1', type: 'appointment', title: 'Appointment request', subtitle: 'Housing society delegation · Ward W1 · reserved category', createdAt: minutesAgo(2900), sources: ['AR-1040'], refId: 'AR-1040', status: 'pending' },
    { id: 'D-2', type: 'draft', title: 'Draft reply', subtitle: 'Letter to contractor on road restoration', createdAt: minutesAgo(400), sources: ['DOC-14', 'MT-03'], refId: 'DR-201', status: 'pending', aiDraft: true, body: 'Subject: Road restoration — package 3 (synthetic)\n\nYou are requested to complete restoration of the trenched stretches in Ward W3 within 10 working days and submit photographs with chainage. Non-compliance will be reviewed in the contractor performance meeting.\n\n— Office of the DMC Zone II (synthetic)' },
    { id: 'D-3', type: 'minutes', title: 'Minutes for approval', subtitle: 'Monsoon readiness meeting · 6 actions, 2 decisions', createdAt: minutesAgo(1300), sources: ['MT-04'], refId: 'MT-04', status: 'pending' },
    { id: 'D-4', type: 'verification', title: 'Task verification', subtitle: 'Footpath repair — evidence: 3 photos, captured 09:12', createdAt: minutesAgo(140), sources: ['T-102'], refId: 'T-102', status: 'pending' },
    { id: 'D-5', type: 'appointment', title: 'Appointment request', subtitle: 'Corporator office · Ward W3 · reserved category', createdAt: minutesAgo(4800), sources: ['AR-1037'], refId: 'AR-1037', status: 'pending' },
  ];
  
  const drafts: Draft[] = [
    { id: 'DR-201', title: 'Letter to contractor on road restoration', recipient: 'Contractor — package 3 (synthetic)', channel: 'letter', language: 'en', body: decide[1].body!, status: 'pending-approval', aiGenerated: true, updatedAt: minutesAgo(400), template: 'Contractor notice' },
    { id: 'DR-202', title: 'Appointment confirmation — M. Joshi', recipient: 'M. Joshi (synthetic)', channel: 'sms', language: 'mr', body: 'आपली भेट गुरुवार 12:00 वाजता निश्चित झाली आहे. संदर्भ AR-1042. — उपायुक्त कार्यालय (synthetic)', status: 'draft', aiGenerated: false, updatedAt: minutesAgo(60), template: 'Appointment confirmed' },
    { id: 'DR-203', title: 'Reply to resident association', recipient: 'Resident association (synthetic)', channel: 'email', language: 'en', body: 'Dear members,\n\nThank you for your letter dated 2 November. The matter has been referred to the Assistant Engineer, Ward W1, who will inspect the site this week.\n\nRegards,\nOffice of the DMC Zone II (synthetic)', status: 'approved', aiGenerated: true, updatedAt: minutesAgo(200), template: 'Acknowledgement' },
    { id: 'DR-204', title: 'Follow-up to EE Roads — bill query', recipient: 'EE Roads (synthetic)', channel: 'in-app', language: 'en', body: 'Reminder: please submit the clarification on package 3 bill query before the contractor review tomorrow.', status: 'sent', aiGenerated: false, updatedAt: minutesAgo(1500) },
  ];
  
  const meetings: Meeting[] = [
    {
      id: 'MT-01', title: 'Ward review — Ward W2', start: at(0, '10:30'), end: at(0, '11:30'), chair: 'DMC', location: 'DMC office',
      attendees: ['AC Ward W2', 'EE Roads', 'EE Water', 'PA'], purpose: 'Monthly review of Ward W2 open items',
      notes: '', actions: [], decisions: [], minutesStatus: 'none', version: 0,
      openItems: [{ text: 'Pothole repairs on 3 roads', status: '2 of 3 done' }, { text: 'Water pressure complaints cluster', status: 'open' }, { text: 'Monsoon checklist', status: 'done' }],
      documents: ['Last minutes (approved)', 'Ward W2 weekly form (P2)'],
    },
    {
      id: 'MT-02', title: 'Monsoon readiness review', start: at(0, '14:30'), end: at(0, '15:30'), chair: 'DMC', location: 'Conference room 2',
      attendees: ['AC W1', 'AC W3', 'EE SWD', 'Disaster cell'], purpose: 'Pre-monsoon preparedness status across wards',
      notes: '- Desilting of 14 of 18 nullahs complete\n- [ACTION] AE W3 to submit desilting report for N-4 by Friday\n- Pumps: 2 standby pumps to be positioned at low-lying junctions\n- [DECISION] Control room to operate 24x7 from 1 June',
      actions: [{ id: 'A-1', text: 'Submit desilting report for N-4', ownerPost: 'AE Ward W3', due: at(3) }], decisions: ['Control room to operate 24x7 from 1 June'], minutesStatus: 'draft', version: 2,
      openItems: [{ text: 'Desilting progress', status: '14/18' }], documents: ['Readiness checklist v3'],
    },
    {
      id: 'MT-04', title: 'Monsoon readiness meeting (last week)', start: at(-6, '15:00'), end: at(-6, '16:00'), chair: 'DMC', location: 'DMC office',
      attendees: ['AC W1', 'AC W2', 'AC W3', 'AC W4', 'EE SWD'], purpose: 'Readiness review',
      notes: 'Approved minutes pending.', actions: [
        { id: 'A-2', text: 'Position standby pumps', ownerPost: 'EE SWD', due: at(1) },
        { id: 'A-3', text: 'Tree trimming list', ownerPost: 'Garden JE', due: at(3), taskId: 'T-106' },
      ], decisions: ['Weekly readiness reporting every Monday', 'Use public IMD feed for alerts'], minutesStatus: 'pending-approval', version: 3,
      openItems: [], documents: [],
    },
  ];
  
  const notifications: AppNotification[] = [
    { id: 'N-1', tier: 'interrupt', title: 'PA whisper: urgent call waiting', at: minutesAgo(12), read: false, held: false, category: 'whisper', link: '/pa' },
    { id: 'N-2', tier: 'normal', title: 'Brief ready: Ward review W2', at: minutesAgo(60), read: false, held: false, category: 'brief', link: '/exec/brief/MT-01' },
    { id: 'N-3', tier: 'digest', title: '2 task updates', body: 'Held by Peace Mode', at: minutesAgo(80), read: false, held: true, category: 'task', link: '/exec/tasks' },
    { id: 'N-4', tier: 'normal', title: '1 item added to Decide', at: minutesAgo(140), read: true, held: false, category: 'decide', link: '/exec/decide' },
    { id: 'N-5', tier: 'normal', title: 'Morning briefing ready', at: at(0, '07:30'), read: true, held: false, category: 'briefing', link: '/exec/briefing' },
    { id: 'N-6', tier: 'digest', title: 'End-of-day summary (yesterday)', at: at(-1, '19:00'), read: true, held: false, category: 'digest' },
    { id: 'N-7', tier: 'normal', title: 'Task overdue: desilting report N-4', at: minutesAgo(300), read: false, held: false, category: 'task', link: '/pa/follow-ups' },
    { id: 'N-8', tier: 'digest', title: 'New appointment request AR-1042', at: minutesAgo(95), read: false, held: true, category: 'request', link: '/pa/inbox' },
  ];
  
  const peace: PeaceSettings = {
    enabled: true, from: '21:00', to: '07:00', duringFocus: true, digestTime: '19:00',
    categories: [
      { key: 'emergency', label: 'Emergency declared', tier: 'interrupt', fixed: true },
      { key: 'whisper', label: 'PA whisper — urgent call', tier: 'interrupt' },
      { key: 'reserved', label: 'Reserved appointment requests', tier: 'normal' },
      { key: 'decide', label: 'Items added to Decide', tier: 'normal' },
      { key: 'brief', label: 'Pre-meeting brief ready', tier: 'normal' },
      { key: 'task', label: 'Task updates', tier: 'digest' },
      { key: 'request', label: 'New non-reserved requests', tier: 'digest' },
    ],
  };
  
  const absence: AbsenceState = { active: false, heldItems: 0, visitorMessage: 'The Deputy Municipal Commissioner is away. Your request has been recorded and will be taken up on return. Urgent matters: Ward office helpline (synthetic).' };
  
  const decisions: DecisionEntry[] = [
    { id: 'DL-031', title: 'Control room to operate 24x7 from 1 June', basis: 'Monsoon readiness review; disaster cell recommendation', fileRef: 'eOffice/Z2/DM/2026/114 (synthetic)', date: at(-6), reviewDate: at(30), status: 'confirmed', recordedBy: 'PA', meetingRef: 'MT-04' },
    { id: 'DL-030', title: 'Weekly readiness reporting every Monday', basis: 'Ward heads consensus', fileRef: 'eOffice/Z2/DM/2026/113 (synthetic)', date: at(-6), status: 'confirmed', recordedBy: 'PA', meetingRef: 'MT-04' },
    { id: 'DL-029', title: 'Hawking survey to precede any enforcement drive in W1 market lane', basis: 'Traders association representation; ward officer input', fileRef: 'eOffice/Z2/ENC/2026/77 (synthetic)', date: at(-12), reviewDate: at(18), status: 'confirmed', recordedBy: 'DMC' },
    { id: 'DL-032', title: 'Pilot evening walk-in window twice a week', basis: 'Visitor queue observations', fileRef: '—', date: at(0), status: 'draft', recordedBy: 'PA' },
  ];
  
  const documents: OfficeDocument[] = [
    { id: 'DOC-11', title: 'Ward W2 review — minutes (approved)', dataClass: 'OFF', kind: 'PDF', updatedAt: at(-30), sizeKb: 420, tags: ['W2', 'minutes'], owner: 'PA' },
    { id: 'DOC-12', title: 'Monsoon readiness checklist v3', dataClass: 'INT', kind: 'XLSX', updatedAt: at(-2), sizeKb: 96, tags: ['monsoon', 'checklist'], owner: 'Disaster cell' },
    { id: 'DOC-13', title: 'Public IMD advisory — today', dataClass: 'PUB', kind: 'PDF', updatedAt: at(0, '06:58'), sizeKb: 210, tags: ['weather'], owner: 'System' },
    { id: 'DOC-14', title: 'Road restoration package 3 — contract summary', dataClass: 'OFF', kind: 'PDF', updatedAt: at(-9), sizeKb: 1240, tags: ['roads', 'contractor'], owner: 'EE Roads' },
    { id: 'DOC-15', title: 'Vigilance reference note', dataClass: 'RES', kind: 'DOCX', updatedAt: at(-40), sizeKb: 64, tags: ['restricted'], owner: 'DMC' },
    { id: 'DOC-16', title: 'Hawker survey format', dataClass: 'INT', kind: 'DOCX', updatedAt: at(-5), sizeKb: 48, tags: ['W1', 'encroachment'], owner: 'Ward W1' },
    { id: 'DOC-17', title: 'Site photos — footpath repair', dataClass: 'INT', kind: 'Image', updatedAt: at(0, '09:12'), sizeKb: 3200, tags: ['W1', 'evidence'], owner: 'JE Ward W1' },
    { id: 'DOC-18', title: 'Privacy notice for visitors v1.2', dataClass: 'PUB', kind: 'PDF', updatedAt: at(-60), sizeKb: 80, tags: ['privacy'], owner: 'Office admin' },
  ];
  
  const contacts: Contact[] = [
    { id: 'C-1', post: 'Assistant Commissioner, Ward W1', holder: 'D. Patkar (synthetic)', dept: 'Ward office', ward: 'W1', phone: '022-0000-1101', email: 'ac.w1@synthetic.example' },
    { id: 'C-2', post: 'Assistant Commissioner, Ward W2', holder: 'S. Merchant (synthetic)', dept: 'Ward office', ward: 'W2', phone: '022-0000-1102', email: 'ac.w2@synthetic.example' },
    { id: 'C-3', post: 'Assistant Commissioner, Ward W3', holder: 'Y. Chavan (synthetic)', dept: 'Ward office', ward: 'W3', phone: '022-0000-1103', email: 'ac.w3@synthetic.example' },
    { id: 'C-4', post: 'Assistant Commissioner, Ward W4', holder: 'I. Khan (synthetic)', dept: 'Ward office', ward: 'W4', phone: '022-0000-1104', email: 'ac.w4@synthetic.example' },
    { id: 'C-5', post: 'Executive Engineer, Roads', holder: 'M. Shaikh (synthetic)', dept: 'Roads', phone: '022-0000-2201', email: 'ee.roads@synthetic.example' },
    { id: 'C-6', post: 'Executive Engineer, Water (W2)', holder: 'A. Nair (synthetic)', dept: 'Hydraulic', ward: 'W2', phone: '022-0000-2202', email: 'ee.water@synthetic.example' },
    { id: 'C-7', post: 'Assistant Engineer, Ward W3', holder: 'S. Kulkarni (synthetic)', dept: 'Building', ward: 'W3', phone: '022-0000-3303', email: 'ae.w3@synthetic.example' },
    { id: 'C-8', post: 'Disaster Management Cell', holder: 'Control room (synthetic)', dept: 'Disaster', phone: '022-0000-1916', email: 'dm.cell@synthetic.example' },
    { id: 'C-9', post: 'Medical Officer Health, W4', holder: 'Dr. P. Desai (synthetic)', dept: 'Health', ward: 'W4', phone: '022-0000-4404', email: 'moh.w4@synthetic.example' },
    { id: 'C-10', post: 'Participate Mumbai Cell', holder: 'N. Rao (synthetic)', dept: 'PM cell', phone: '022-0000-5500', email: 'pm.cell@synthetic.example' },
  ];
  
  const wards: WardSummary[] = [
    { id: 'W1', name: 'Ward W1', grievancesOverdue: 12, repeatComplaints: 3, formStatus: 'submitted', statutoryDue7d: 2, courtDatesWeek: 0, readiness: [19, 20], openReviewItems: 4, trend: [18, 16, 15, 14, 13, 12] },
    { id: 'W2', name: 'Ward W2', grievancesOverdue: 31, repeatComplaints: 8, formStatus: 'submitted', statutoryDue7d: 4, courtDatesWeek: 1, readiness: [18, 20], openReviewItems: 6, trend: [22, 25, 27, 26, 29, 31] },
    { id: 'W3', name: 'Ward W3', grievancesOverdue: 9, repeatComplaints: 2, formStatus: 'late', statutoryDue7d: 1, courtDatesWeek: 2, readiness: [16, 20], openReviewItems: 3, trend: [14, 12, 11, 10, 9, 9] },
    { id: 'W4', name: 'Ward W4', grievancesOverdue: 14, repeatComplaints: 11, formStatus: 'submitted', statutoryDue7d: 3, courtDatesWeek: 0, readiness: [17, 20], openReviewItems: 5, trend: [10, 11, 12, 12, 13, 14] },
  ];
  
  const statutory: StatutoryItem[] = [
    { id: 'ST-01', title: 'RTI application — road works expenditure (synthetic)', type: 'RTI', received: at(-6), ruleStatus: 'unverified', due: at(24), manualDate: true, owner: 'PIO (post)', status: 'open' },
    { id: 'ST-02', title: 'Notice reply — building violation (synthetic)', type: 'Notice', received: at(-3), ruleStatus: 'validated', due: at(11), owner: 'AE W3', status: 'open' },
    { id: 'ST-03', title: 'Legislature question — monsoon preparedness (synthetic)', type: 'LAQ', received: at(-2), ruleStatus: 'unverified', owner: 'PA', status: 'open' },
    { id: 'ST-04', title: 'RTS application — trade licence (synthetic)', type: 'RTS', received: at(-10), ruleStatus: 'validated', due: at(2), owner: 'Licence Inspector W4', status: 'open' },
    { id: 'ST-05', title: 'First appeal — RTI (synthetic)', type: 'Appeal', received: at(-20), ruleStatus: 'unverified', due: at(5), manualDate: true, owner: 'First Appellate Authority', status: 'replied' },
  ];
  
  const legal: LegalCase[] = [
    { id: 'LC-01', title: 'Writ petition — hawking zone W1 (synthetic)', court: 'High Court', nextDate: at(3), counsel: 'Panel counsel A (synthetic)', stage: 'Reply filed', stayAlert: true },
    { id: 'LC-02', title: 'Civil suit — boundary wall W3 (synthetic)', court: 'City Civil Court', nextDate: at(2), counsel: 'Panel counsel B (synthetic)', stage: 'Evidence' },
    { id: 'LC-03', title: 'Consumer complaint — water billing (synthetic)', court: 'Consumer Forum', nextDate: at(16), counsel: 'Law officer (synthetic)', stage: 'Arguments' },
    { id: 'LC-04', title: 'Appeal — demolition notice W3 (synthetic)', court: 'Appellate authority', nextDate: at(5), counsel: 'Panel counsel C (synthetic)', stage: 'Hearing' },
  ];
  
  const auditParas: AuditPara[] = [
    { id: 'AP-2023-14', title: 'Excess payment on road resurfacing (synthetic)', year: '2023-24', ageDays: 410, dept: 'Roads', status: 'open' },
    { id: 'AP-2024-03', title: 'Idle pumps in storage (synthetic)', year: '2024-25', ageDays: 190, dept: 'SWD', status: 'replied' },
    { id: 'AP-2024-21', title: 'Licence fee short recovery (synthetic)', year: '2024-25', ageDays: 75, dept: 'Licence', status: 'open' },
    { id: 'AP-2025-02', title: 'Garden maintenance contract variance (synthetic)', year: '2025-26', ageDays: 40, dept: 'Gardens', status: 'open' },
  ];
  
  const csr: CsrProject[] = [
    { id: 'CSR-01', partner: 'Company A (synthetic)', title: 'School toilets — 6 municipal schools', stage: 'Interest', ward: 'W1', valueLakh: 45, flags: [], milestone: [0, 4], updatedAt: at(-2) },
    { id: 'CSR-02', partner: 'Foundation B (synthetic)', title: 'Public garden restoration', stage: 'Due diligence', ward: 'W2', valueLakh: 80, flags: ['Partner documents incomplete'], milestone: [0, 5], updatedAt: at(-5) },
    { id: 'CSR-03', partner: 'Trust C (synthetic)', title: 'Smart bus shelters (8)', stage: 'External approval', ward: 'W4', valueLakh: 60, flags: [], milestone: [0, 3], approvalRef: undefined, updatedAt: at(-8) },
    { id: 'CSR-04', partner: 'Company D (synthetic)', title: 'Lake beautification phase 1', stage: 'Execution', ward: 'W3', valueLakh: 150, flags: ['Milestone 2 slipping 12 d'], milestone: [2, 4], approvalRef: 'SC/2026/18 (synthetic)', updatedAt: at(-1) },
    { id: 'CSR-05', partner: 'NGO E (synthetic)', title: 'Community health camps', stage: 'Impact report', ward: 'W2', valueLakh: 12, flags: [], milestone: [4, 4], approvalRef: 'SC/2025/41 (synthetic)', updatedAt: at(-3) },
    { id: 'CSR-06', partner: 'Company F (synthetic)', title: 'Open gym equipment — 4 parks', stage: 'Execution', ward: 'W1', valueLakh: 25, flags: [], milestone: [3, 5], approvalRef: 'SC/2026/07 (synthetic)', updatedAt: at(-4) },
    { id: 'CSR-07', partner: 'Foundation G (synthetic)', title: 'Solar panels on ward office', stage: 'Interest', ward: 'W4', valueLakh: 35, flags: [], milestone: [0, 3], updatedAt: at(-1) },
  ];
  
  const emergency: Emergency = {
    active: false, callLog: [],
    contactTree: [
      { level: 1, post: 'DMC Zone II', name: 'A. Deshmukh (synthetic)', phone: '022-0000-0001', acknowledged: false },
      { level: 1, post: 'Disaster Management Cell', name: 'Control room (synthetic)', phone: '022-0000-1916', acknowledged: false },
      { level: 2, post: 'AC Ward W1', name: 'D. Patkar (synthetic)', phone: '022-0000-1101', acknowledged: false },
      { level: 2, post: 'AC Ward W2', name: 'S. Merchant (synthetic)', phone: '022-0000-1102', acknowledged: false },
      { level: 2, post: 'AC Ward W3', name: 'Y. Chavan (synthetic)', phone: '022-0000-1103', acknowledged: false },
      { level: 2, post: 'AC Ward W4', name: 'I. Khan (synthetic)', phone: '022-0000-1104', acknowledged: false },
      { level: 3, post: 'EE Storm Water Drains', name: 'R. Gupta (synthetic)', phone: '022-0000-2209', acknowledged: false },
    ],
  };
  
  const dak: DakItem[] = [
    { id: 'DK-501', receivedAt: at(0, '10:12'), from: 'Resident association (synthetic)', subject: 'Request for speed breakers near school', confidence: 0.91, status: 'review', suggestedRoute: 'EE Roads' },
    { id: 'DK-500', receivedAt: at(0, '09:40'), from: 'Collector office (synthetic)', subject: 'Circular: festival preparedness meeting', confidence: 0.74, status: 'review', suggestedRoute: 'Disaster cell' },
    { id: 'DK-499', receivedAt: at(-1, '16:05'), from: 'Citizen (synthetic)', subject: 'Complaint regarding illegal hoarding', confidence: 0.52, status: 'scanned', suggestedRoute: 'Licence Inspector W2' },
    { id: 'DK-498', receivedAt: at(-1, '11:20'), from: 'Ward W3 office', subject: 'Monthly progress report', confidence: 0.97, status: 'routed', suggestedRoute: 'PA' },
  ];
  
  const inspections: Inspection[] = [
    { id: 'IN-07', at: at(-1, '08:40'), location: 'Ward W4 — SWD outfall near market', notes: 'Silt accumulation at outfall; grating broken at junction.', photos: 4, draftTasks: ['Clean SWD outfall', 'Replace broken grating'], status: 'confirmed' },
    { id: 'IN-08', at: at(0, '08:15'), location: 'Ward W2 — Lane 4 garbage point', notes: 'Overflowing bins; collection missed twice this week per residents.', photos: 2, draftTasks: ['Increase collection frequency at lane 4'], status: 'captured' },
  ];
  
  const devices: Device[] = [
    { id: 'DV-1', name: 'Office desktop (synthetic)', kind: 'desktop', boundAt: at(-90), lastSeen: minutesAgo(1), current: true },
    { id: 'DV-2', name: 'Official phone (synthetic)', kind: 'mobile', boundAt: at(-90), lastSeen: minutesAgo(40) },
    { id: 'DV-3', name: 'Smartwatch (synthetic)', kind: 'watch', boundAt: at(-30), lastSeen: minutesAgo(200) },
  ];
  
  const accessRequests: AccessRequest[] = [
    { id: 'RQ-21', userName: 'User E (synthetic)', requestedRole: 'ROLE-06', scope: 'Department officer, Roads', requestedBy: 'Office administrator', reason: 'New posting to Roads department coordination', at: minutesAgo(800), status: 'pending' },
    { id: 'RQ-22', userName: 'User F (synthetic)', requestedRole: 'ROLE-05', scope: 'Ward W4 nodal', requestedBy: 'Office administrator', reason: 'Nodal officer nominated by AC W4', at: minutesAgo(300), status: 'pending' },
  ];
  
  function buildAudit(): AuditEvent[] {
    const rows: Omit<AuditEvent, 'hash' | 'prevHash'>[] = [
      { id: 'AE-0001', at: minutesAgo(400), actor: 'P. Sawant', role: 'ROLE-02', action: 'appointment.approve', object: 'AR-1031', result: 'ok' },
      { id: 'AE-0002', at: minutesAgo(380), actor: 'SYSTEM', role: 'SYSTEM', action: 'sms.send', object: 'AR-1031 confirmation', result: 'ok' },
      { id: 'AE-0003', at: minutesAgo(300), actor: 'A. Deshmukh', role: 'ROLE-01', action: 'task.verify', object: 'T-112', result: 'ok' },
      { id: 'AE-0004', at: minutesAgo(250), actor: 'User D', role: 'ROLE-05', action: 'read.denied', object: 'Ward W2 tasks', result: 'denied' },
      { id: 'AE-0005', at: minutesAgo(200), actor: 'P. Sawant', role: 'ROLE-02', action: 'draft.request_approval', object: 'DR-201', result: 'ok' },
      { id: 'AE-0006', at: minutesAgo(150), actor: 'K. Pillai', role: 'ROLE-08', action: 'config.update', object: 'categories', result: 'ok' },
      { id: 'AE-0007', at: minutesAgo(120), actor: 'SYSTEM', role: 'SYSTEM', action: 'ai.call', object: 'briefing.summary', result: 'ok' },
      { id: 'AE-0008', at: minutesAgo(60), actor: 'Reception', role: 'ROLE-04', action: 'visitor.register', object: 'W-13', result: 'ok' },
      { id: 'AE-0009', at: minutesAgo(30), actor: 'A. Deshmukh', role: 'ROLE-01', action: 'read.record', object: 'DOC-15 (RES)', result: 'ok' },
    ];
    // Hashes are filled in by the audit ledger (real SHA-256 chain) when the store is seeded.
    return rows.map((r) => ({ ...r, prevHash: '', hash: '' })).reverse();
  }
  
  const aiLog: AIInteraction[] = [
    { id: 'AI-0003', at: minutesAgo(120), actor: 'SYSTEM', feature: 'Briefing summary', provider: 'groq', model: 'llama-3.3-70b-versatile', promptChars: 2210, outcome: 'answered' },
    { id: 'AI-0002', at: minutesAgo(400), actor: 'P. Sawant', feature: 'Draft reply', provider: 'groq', model: 'llama-3.3-70b-versatile', promptChars: 980, outcome: 'answered', humanApproved: true },
    { id: 'AI-0001', at: minutesAgo(1600), actor: 'A. Deshmukh', feature: 'Ask', provider: 'gemini', model: 'gemini-flash-latest', promptChars: 140, outcome: 'refused' },
  ];
  
  const services: ServiceHealth[] = [
    { name: 'API gateway', status: 'healthy', latencyMs: 42, uptime: 99.98 },
    { name: 'Identity & MFA', status: 'healthy', latencyMs: 61, uptime: 99.99 },
    { name: 'Workflow engine', status: 'healthy', latencyMs: 35, uptime: 99.95 },
    { name: 'Notification service', status: 'degraded', latencyMs: 820, uptime: 99.41 },
    { name: 'Audit ledger', status: 'healthy', latencyMs: 18, uptime: 100 },
    { name: 'AI gateway', status: 'healthy', latencyMs: 640, uptime: 99.7 },
    { name: 'Document store', status: 'healthy', latencyMs: 55, uptime: 99.97 },
    { name: 'SMS adapter (INT)', status: 'healthy', latencyMs: 300, uptime: 99.5 },
  ];
  
  const jobs: JobRun[] = [
    { name: 'Morning briefing compile', lastRun: at(0, '07:25'), status: 'ok', next: at(1, '07:25') },
    { name: 'Reminder ladder', lastRun: minutesAgo(15), status: 'ok', next: at(0, '23:59') },
    { name: 'End-of-day digest', lastRun: at(-1, '19:00'), status: 'ok', next: at(0, '19:00') },
    { name: 'Audit chain verification', lastRun: at(0, '03:00'), status: 'ok', next: at(1, '03:00') },
    { name: 'Nightly backup', lastRun: at(0, '02:00'), status: 'ok', next: at(1, '02:00') },
    { name: 'IMD weather fetch', lastRun: at(0, '06:58'), status: 'missed', next: minutesAgo(-30) },
  ];
  
  const securityAlerts: SecurityAlert[] = [
    { id: 'SA-11', sev: 3, title: 'Repeated failed sign-in for User D (3 attempts)', at: minutesAgo(260), acknowledged: false },
    { id: 'SA-10', sev: 4, title: 'New device bound for PA account', at: minutesAgo(1500), acknowledged: true },
  ];
  
  const config: ConfigState = {
    aiEnabled: true,
    showFutureReleases: true,
    smsSenderApproved: false,
    whatsappEnabled: false,
    governanceAuthorized: false,
    retentionDays: { 'Visitor records': 365, 'Queue tokens': 30, 'Audit ledger': 2555, 'AI interaction logs': 365, 'Drafts': 180 },
    categories: CATEGORIES.map((c) => ({
      name: c,
      reserved: ['Encroachment', 'Roads', 'Redevelopment'].includes(c),
      rightDesk: c === 'Building permission' ? 'Ward AE (Building)' : c === 'Water supply' ? 'Ward EE (Water)' : c === 'Solid waste' ? 'Ward SWM Officer' : 'PA triage',
    })),
    officeHours: { from: '09:30', to: '18:30', walkIn: '17:30–18:30' },
    featureFlags: { voiceCapture: false, kiosk: true, aiDrafting: true, briefingAudio: true, offlineReception: true, governanceViews: true },
  };
  
  // ───────────────────────────── Private (separate store, separate keys — ARC-04) ─────────────────────────────
  const privateDues: PrivateDue[] = [
    { id: 'PD-1', title: 'Car insurance renewal (synthetic)', kind: 'Insurance', due: at(10), amount: 18400 },
    { id: 'PD-2', title: 'Home loan EMI (synthetic)', kind: 'EMI', due: at(27), amount: 42500 },
    { id: 'PD-3', title: 'Annual property return — prepare', kind: 'Declaration', due: at(45), verifyRule: true },
    { id: 'PD-4', title: 'Advance tax — Q3 instalment (synthetic)', kind: 'Tax', due: at(37), amount: 35000 },
    { id: 'PD-5', title: 'Annual health check-up', kind: 'Health', due: at(20) },
    { id: 'PD-6', title: 'Society maintenance — flat (synthetic)', kind: 'Property', due: at(5), amount: 6200 },
  ];
  const holdings: Holding[] = [
    { id: 'H-1', name: 'Index fund (synthetic)', kind: 'Mutual fund', owner: 'Self', value: 1240000, asOf: at(-8) },
    { id: 'H-2', name: 'Fixed deposit — Bank A (synthetic)', kind: 'Deposit', owner: 'Self', value: 800000, asOf: at(-30) },
    { id: 'H-3', name: 'Provident fund (synthetic)', kind: 'PF', owner: 'Self', value: 2150000, asOf: at(-60) },
    { id: 'H-4', name: 'Sovereign gold bond (synthetic)', kind: 'Gold', owner: 'Spouse', value: 310000, asOf: at(-15) },
    { id: 'H-5', name: 'Savings account (synthetic)', kind: 'Bank', owner: 'Joint', value: 265000, asOf: at(-2) },
    { id: 'H-6', name: 'Government bond (synthetic)', kind: 'Bond', owner: 'Self', value: 500000, asOf: at(-45) },
  ];
  const liabilities: Liability[] = [
    { id: 'L-1', name: 'Home loan (synthetic)', lender: 'Bank A', outstanding: 3850000, emi: 42500, rate: 8.4, nextDue: at(27), resetDate: at(70) },
    { id: 'L-2', name: 'Car loan (synthetic)', lender: 'Bank B', outstanding: 280000, emi: 12800, rate: 9.1, nextDue: at(14) },
  ];
  const policies: Policy[] = [
    { id: 'P-1', name: 'Family floater (synthetic)', insurer: 'Insurer A', kind: 'Health', cover: 1000000, premium: 28000, renewal: at(120) },
    { id: 'P-2', name: 'Term plan (synthetic)', insurer: 'Insurer B', kind: 'Life', cover: 10000000, premium: 16500, renewal: at(200) },
    { id: 'P-3', name: 'Car insurance (synthetic)', insurer: 'Insurer C', kind: 'Motor', cover: 650000, premium: 18400, renewal: at(10) },
    { id: 'P-4', name: 'Home contents (synthetic)', insurer: 'Insurer A', kind: 'Home', cover: 1500000, premium: 4200, renewal: at(160) },
  ];
  const vault: VaultFolder[] = [
    { id: 'VF-1', name: 'Property papers (synthetic)', tags: ['property'], files: [{ name: 'Sale deed.pdf', sizeKb: 2400, addedAt: at(-300) }, { name: 'Society share certificate.pdf', sizeKb: 800, addedAt: at(-300) }, { name: 'Tax receipt 2025.pdf', sizeKb: 120, addedAt: at(-90) }] },
    { id: 'VF-2', name: 'Insurance policies', tags: ['insurance'], files: [{ name: 'Family floater.pdf', sizeKb: 640, addedAt: at(-200) }, { name: 'Term plan.pdf', sizeKb: 900, addedAt: at(-500) }, { name: 'Car policy.pdf', sizeKb: 300, addedAt: at(-355) }, { name: 'Home contents.pdf', sizeKb: 410, addedAt: at(-150) }] },
    { id: 'VF-3', name: 'Tax year 2025–26', tags: ['tax'], files: Array.from({ length: 6 }, (_, i) => ({ name: `Form ${i + 1} (synthetic).pdf`, sizeKb: 150 + i * 40, addedAt: at(-20 - i) })) },
    { id: 'VF-4', name: 'Identity documents', tags: ['id'], files: [{ name: 'Passport (synthetic).pdf', sizeKb: 500, addedAt: at(-700) }] },
  ];
  const familyEvents: FamilyEvent[] = [
    { id: 'FE-1', title: 'Parent–teacher meeting', start: at(0, '13:00'), end: at(0, '14:00'), blockWork: true, who: 'Child' },
    { id: 'FE-2', title: 'Family dinner', start: at(2, '18:00'), end: at(2, '20:00'), blockWork: true, who: 'Family' },
    { id: 'FE-3', title: 'Dentist', start: at(6, '09:00'), end: at(6, '09:45'), blockWork: false, who: 'Self' },
    { id: 'FE-4', title: 'Anniversary', start: at(12, '19:00'), end: at(12, '22:00'), blockWork: true, who: 'Family' },
  ];
  const expenses: Expense[] = [
    ...['Groceries', 'Utilities', 'Fuel', 'Education', 'Medical', 'Household help', 'Dining'].flatMap((c, i) =>
      [0, 1, 2, 3, 4, 5].map((m) => ({ id: `EX-${i}-${m}`, date: at(-30 * m - i), category: c, amount: Math.round((4000 + i * 2100) * (0.85 + ((m * 7 + i) % 5) * 0.08)), note: '' })),
    ),
  ];
  const compliance: ComplianceReminder[] = [
    { id: 'CR-1', title: 'Annual immovable property return', due: at(45), status: 'pending' },
    { id: 'CR-2', title: 'Intimation for movable property transaction above threshold', threshold: 100000, due: at(12), status: 'prepared' },
    { id: 'CR-3', title: 'Income tax return filing', due: at(240), status: 'pending' },
    { id: 'CR-4', title: 'Previous year property return', due: at(-120), status: 'filed' },
  ];
  
  return {
    users, calendar, requests, queue, visitors, tasks, decide, drafts, meetings, notifications, peace, absence,
    decisions, documents, contacts, wards, statutory, legal, auditParas, csr, emergency, dak, inspections, devices,
    accessRequests, audit: buildAudit(), aiLog, services, jobs, securityAlerts, config,
    privateDues, holdings, liabilities, policies, vault, familyEvents, expenses, compliance,
    whisperLast: { text: '5 minutes', at: minutesAgo(18) } as { text: string; at: string } | null,
    execStatus: { text: 'In meeting until 11:30', tone: 'busy' as 'busy' | 'available' | 'away' | 'travel' },
    briefingRatings: [] as number[],
  };
}

export type Seed = ReturnType<typeof createSeed>;
