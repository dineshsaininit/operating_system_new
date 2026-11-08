/**
 * AASIOM COMMAND OS — shared domain types.
 * These types are the data contract between frontend and backend.
 * IDs in comments (ENT-nn, ROLE-nn, BR-nnn) refer to the SRS v1.1 / Requirements Register.
 */

// ───────────────────────────── Identity & access (ARC-07A) ─────────────────────────────
export type RoleId =
  | 'ROLE-01' // Principal Executive
  | 'ROLE-02' // Personal Assistant
  | 'ROLE-03' // Executive Office Administrator
  | 'ROLE-04' // Reception / Visitor Desk Operator
  | 'ROLE-05' // Authorized Ward Officer
  | 'ROLE-06' // Authorized Department Officer
  | 'ROLE-07' // Participate Mumbai Coordinator
  | 'ROLE-08' // System Administrator (BMC-side)
  | 'ROLE-09' // AASIOM Support Engineer
  | 'ROLE-10' // Security Auditor
  | 'ROLE-11' // Personal Environment Owner (Private app)
  | 'ROLE-12' // Visitor (external)
  | 'ROLE-13'; // Designated Family Member (deferred)

export type Release = 'P0' | 'P1' | 'P2' | 'P3' | 'PT';
export type Environment = 'executive' | 'governance' | 'private' | 'platform' | 'public';
export type DataClass = 'PUB' | 'INT' | 'OFF' | 'RES';
export type Lang = 'en' | 'mr' | 'hi';

export interface User {
  id: string;
  name: string;
  post: string;
  role: RoleId;
  scope: string;
  mfa: 'passkey' | 'otp-app' | 'sms-otp' | 'pin';
  devices: number;
  lastSignIn: string; // ISO
  status: 'active' | 'deactivated' | 'pending';
  email?: string;
}

export interface Session {
  user: User;
  token: string;
  deviceName: string;
  signedInAt: string;
}

export interface Device {
  id: string;
  name: string;
  kind: 'mobile' | 'tablet' | 'desktop' | 'watch';
  boundAt: string;
  lastSeen: string;
  current?: boolean;
}

export interface AccessRequest {
  id: string;
  userName: string;
  requestedRole: RoleId;
  scope: string;
  requestedBy: string;
  reason: string;
  at: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ───────────────────────────── Calendar & appointments (ARC-07B) ─────────────────────────────
export type CalendarEventType =
  | 'meeting'
  | 'appointment'
  | 'focus'
  | 'busy'
  | 'buffer'
  | 'internal'
  | 'walkin-window'
  | 'site-visit';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  start: string; // ISO
  end: string; // ISO
  location?: string;
  ward?: string;
  attendees?: string[];
  meetingId?: string;
  briefReady?: boolean;
  proposedBy?: 'PA';
  status?: 'confirmed' | 'proposed' | 'cancelled';
}

export type RequestChannel = 'web' | 'phone' | 'letter' | 'walk-in' | 'email';
export type RequestStatus = 'requested' | 'approved' | 'declined' | 'redirected' | 'escalated' | 'held';

/** ENT-11 AppointmentRequest */
export interface AppointmentRequest {
  id: string; // AR-nnnn
  receivedAt: string;
  channel: RequestChannel;
  visitorName: string;
  mobile: string; // masked
  category: string;
  ward: string;
  purpose: string;
  reserved: boolean; // reserved categories go to executive Decide (BR)
  priorVisits: number;
  status: RequestStatus;
  slot?: string;
  redirectTarget?: string;
  reason?: string;
  visitorId?: string;
}

// ───────────────────────────── Visitors & queue ─────────────────────────────
export type QueueStatus = 'waiting' | 'called' | 'in-meeting' | 'done' | 'redirected' | 'left';

export interface QueueEntry {
  id: string;
  token: string; // A-07 appointment, W-12 walk-in, L-nn offline
  visitorName: string;
  type: 'appointment' | 'walk-in';
  category: string;
  ward: string;
  arrivedAt: string;
  appointmentTime?: string;
  status: QueueStatus;
  waitMin: [number, number];
  repeatMatch?: boolean;
  routeSuggestion?: string;
  visitorId?: string;
  purpose?: string;
}

export interface VisitRecord {
  date: string;
  type: 'Walk-in' | 'Appointment';
  ref: string;
  purpose: string;
  outcome: string;
}

/** ENT Visitor — context only (BR: history must not decide outcomes) */
export interface Visitor {
  id: string;
  name: string;
  mobile: string;
  language: Lang;
  noticeVersion: string;
  noticeDate: string;
  visits: VisitRecord[];
  commitments: { text: string; owner: string; due: string; overdue: boolean }[];
}

// ───────────────────────────── Tasks & commitment ledger (ARC-16, BR-011) ─────────────────────────────
export type TaskState =
  | 'draft'
  | 'assigned'
  | 'acknowledged'
  | 'in-progress'
  | 'submitted'
  | 'verified'
  | 'closed'
  | 'reopened'
  | 'cancelled';

export interface TaskHistory {
  state: TaskState;
  at: string;
  by: string;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  source: 'Meeting' | 'Visit' | 'Voice' | 'Document' | 'Inspection' | 'Manual' | 'Exception';
  sourceRef?: string;
  ownerPost: string;
  ward?: string;
  due: string; // ISO date
  state: TaskState;
  verificationRequired: boolean;
  evidence: number;
  nudgesThisWeek: number;
  nudgeCap: number; // BR-013 weekly cap
  priority: 'high' | 'normal' | 'low';
  createdBy: string;
  createdAt: string;
  history: TaskHistory[];
  escalated?: boolean;
  notes?: string;
}

// ───────────────────────────── Decide queue ─────────────────────────────
export type DecideType = 'appointment' | 'draft' | 'minutes' | 'verification' | 'extension' | 'emergency-message';

export interface DecideItem {
  id: string;
  type: DecideType;
  title: string;
  subtitle: string;
  createdAt: string;
  sources: string[];
  refId: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  aiDraft?: boolean;
  body?: string;
}

// ───────────────────────────── Drafts & outbox ─────────────────────────────
export interface Draft {
  id: string;
  title: string;
  recipient: string;
  channel: 'email' | 'sms' | 'letter' | 'in-app';
  language: Lang;
  body: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'sent' | 'rejected' | 'failed';
  aiGenerated: boolean;
  updatedAt: string;
  template?: string;
}

// ───────────────────────────── Meetings ─────────────────────────────
export interface MeetingAction {
  id: string;
  text: string;
  ownerPost: string;
  due: string;
  taskId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  start: string;
  end: string;
  chair: string;
  location: string;
  attendees: string[];
  purpose: string;
  notes: string;
  actions: MeetingAction[];
  decisions: string[];
  minutesStatus: 'none' | 'draft' | 'pending-approval' | 'approved';
  version: number;
  openItems: { text: string; status: string }[];
  documents: string[];
}

// ───────────────────────────── Notifications (NOT-01..NOT-24) ─────────────────────────────
export type Tier = 'interrupt' | 'normal' | 'digest';

export interface AppNotification {
  id: string;
  tier: Tier;
  title: string;
  body?: string;
  at: string;
  read: boolean;
  held: boolean; // held by Peace Mode
  link?: string;
  category: string;
}

export interface PeaceSettings {
  enabled: boolean;
  from: string; // HH:MM
  to: string;
  duringFocus: boolean;
  digestTime: string;
  categories: { key: string; label: string; tier: Tier; fixed?: boolean }[];
}

export interface AbsenceState {
  active: boolean;
  from?: string;
  to?: string;
  delegationRecord?: string; // reference to written delegation record (BR-049)
  heldItems: number;
  visitorMessage: string;
}

// ───────────────────────────── Records ─────────────────────────────
export interface DecisionEntry {
  id: string;
  title: string;
  basis: string;
  fileRef: string; // e-Office file reference
  date: string;
  reviewDate?: string;
  status: 'draft' | 'confirmed';
  recordedBy: string;
  meetingRef?: string;
}

export interface OfficeDocument {
  id: string;
  title: string;
  dataClass: DataClass;
  kind: 'PDF' | 'DOCX' | 'XLSX' | 'Image' | 'Note';
  updatedAt: string;
  sizeKb: number;
  tags: string[];
  owner: string;
}

export interface Contact {
  id: string;
  post: string;
  holder: string;
  dept: string;
  ward?: string;
  phone: string;
  email: string;
}

// ───────────────────────────── Governance (ARC-07D) ─────────────────────────────
export interface WardSummary {
  id: string;
  name: string;
  grievancesOverdue: number;
  repeatComplaints: number;
  formStatus: 'submitted' | 'late' | 'pending';
  statutoryDue7d: number;
  courtDatesWeek: number;
  readiness: [number, number];
  openReviewItems: number;
  trend: number[];
}

export interface StatutoryItem {
  id: string;
  title: string;
  type: 'RTI' | 'Notice' | 'LAQ' | 'RTS' | 'Appeal';
  received: string;
  ruleStatus: 'validated' | 'unverified';
  due?: string;
  manualDate?: boolean;
  owner: string;
  status: 'open' | 'replied' | 'closed';
}

export interface LegalCase {
  id: string;
  title: string;
  court: string;
  nextDate: string;
  counsel: string;
  stage: string;
  stayAlert?: boolean;
}

export interface AuditPara {
  id: string;
  title: string;
  year: string;
  ageDays: number;
  dept: string;
  status: 'open' | 'replied' | 'settled';
}

export type CsrStage = 'Interest' | 'Due diligence' | 'External approval' | 'Execution' | 'Impact report' | 'Closed';

export interface CsrProject {
  id: string;
  partner: string;
  title: string;
  stage: CsrStage;
  ward: string;
  valueLakh: number;
  flags: string[];
  milestone: [number, number];
  approvalRef?: string;
  updatedAt: string;
}

export interface Emergency {
  active: boolean;
  id?: string;
  title?: string;
  kind?: string;
  declaredAt?: string;
  declaredBy?: string;
  summary?: string;
  callLog: { at: string; who: string; outcome: string }[];
  contactTree: { level: number; post: string; name: string; phone: string; acknowledged: boolean }[];
}

export interface DakItem {
  id: string;
  receivedAt: string;
  from: string;
  subject: string;
  confidence: number;
  status: 'scanned' | 'review' | 'routed';
  suggestedRoute: string;
}

export interface Inspection {
  id: string;
  at: string;
  location: string;
  notes: string;
  photos: number;
  draftTasks: string[];
  status: 'captured' | 'confirmed';
}

// ───────────────────────────── Platform control (ARC-07E) ─────────────────────────────
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  role: RoleId | 'SYSTEM';
  action: string;
  object: string;
  result: 'ok' | 'denied' | 'error';
  hash: string;
  prevHash: string;
}

export interface AIInteraction {
  id: string;
  at: string;
  actor: string;
  feature: string;
  provider: string;
  model: string;
  promptChars: number;
  outcome: 'answered' | 'refused' | 'failed' | 'fallback';
  humanApproved?: boolean;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  uptime: number;
}

export interface JobRun {
  name: string;
  lastRun: string;
  status: 'ok' | 'missed' | 'failed' | 'running';
  next: string;
}

export interface SecurityAlert {
  id: string;
  sev: 1 | 2 | 3 | 4;
  title: string;
  at: string;
  acknowledged: boolean;
}

export interface ConfigState {
  aiEnabled: boolean;
  showFutureReleases: boolean;
  smsSenderApproved: boolean; // DEC-010
  whatsappEnabled: boolean; // DEC-013
  governanceAuthorized: boolean; // DEC-006
  retentionDays: Record<string, number>;
  categories: { name: string; reserved: boolean; rightDesk: string }[];
  officeHours: { from: string; to: string; walkIn: string };
  featureFlags: Record<string, boolean>;
}

// ───────────────────────────── Private Wealth & Life OS (ARC-07F) ─────────────────────────────
export interface PrivateDue {
  id: string;
  title: string;
  kind: 'Insurance' | 'EMI' | 'Declaration' | 'Tax' | 'Health' | 'Property';
  due: string;
  amount?: number;
  verifyRule?: boolean;
}

export interface Holding {
  id: string;
  name: string;
  kind: 'Equity' | 'Mutual fund' | 'Deposit' | 'PF' | 'Bond' | 'Gold' | 'Bank';
  owner: string;
  value: number;
  asOf: string;
}

export interface Liability {
  id: string;
  name: string;
  lender: string;
  outstanding: number;
  emi: number;
  rate: number;
  nextDue: string;
  resetDate?: string;
}

export interface Policy {
  id: string;
  name: string;
  insurer: string;
  kind: 'Health' | 'Life' | 'Motor' | 'Home';
  cover: number;
  premium: number;
  renewal: string;
}

export interface VaultFolder {
  id: string;
  name: string;
  files: { name: string; sizeKb: number; addedAt: string }[];
  tags: string[];
}

export interface FamilyEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  blockWork: boolean; // projects an opaque "busy" block into the official calendar only
  who: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
}

export interface ComplianceReminder {
  id: string;
  title: string;
  threshold?: number;
  due: string;
  status: 'pending' | 'prepared' | 'filed';
}
