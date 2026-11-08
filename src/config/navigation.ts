import type { LucideIcon } from 'lucide-react';
import {
  Sun, Gavel, Sparkles, LayoutGrid, CalendarDays, ClipboardList, Users, Inbox, ListOrdered, ListChecks, MailCheck,
  NotebookPen, FileText, BookOpenCheck, BellRing, Moon, Plane, LayoutDashboard, Building2, Network, HandHeart,
  Map, FileBarChart, Scale, Landmark, Siren, ScrollText, Search, Camera, ArrowRightLeft, ShieldCheck, Settings2,
  FileSearch, DatabaseBackup, Activity, UserCircle, MonitorSmartphone, Wallet, Shield, Vault, CalendarHeart,
  Receipt, FileCheck2, Mail, ClipboardCheck, HeartHandshake, LineChart, ConciergeBell, Contact,
} from 'lucide-react';
import type { Environment, Release, RoleId } from '@/types';
import type { StringKey } from '@/i18n/strings';

export interface NavItem {
  key: string;
  path: string;
  label: string;
  i18n?: StringKey;
  icon: LucideIcon;
  roles: RoleId[];
  release: Release;
  screen: string; // SCR-nn
  env: Environment;
  badge?: 'decide' | 'inbox' | 'queue' | 'notifications';
  keywords?: string;
}

export interface NavSection { title: string; env: Environment; items: NavItem[] }

const EXEC: RoleId[] = ['ROLE-01'];
const PA: RoleId[] = ['ROLE-02'];
const EXEC_PA: RoleId[] = ['ROLE-01', 'ROLE-02'];
const OFFICIAL: RoleId[] = ['ROLE-01', 'ROLE-02', 'ROLE-03', 'ROLE-04', 'ROLE-05', 'ROLE-06', 'ROLE-07', 'ROLE-08', 'ROLE-09', 'ROLE-10'];

export const NAV: NavSection[] = [
  {
    title: 'Executive desk', env: 'executive', items: [
      { key: 'today', path: '/exec/today', label: 'Today', i18n: 'today', icon: Sun, roles: EXEC, release: 'P0', screen: 'SCR-02', env: 'executive' },
      { key: 'decide', path: '/exec/decide', label: 'Decide', i18n: 'decide', icon: Gavel, roles: EXEC, release: 'P0', screen: 'SCR-03', env: 'executive', badge: 'decide' },
      { key: 'ask', path: '/exec/ask', label: 'Ask assistant', i18n: 'ask', icon: Sparkles, roles: EXEC_PA, release: 'P1', screen: 'SCR-04', env: 'executive', keywords: 'ai chat voice' },
      { key: 'office', path: '/exec/office', label: 'Office hub', i18n: 'office', icon: LayoutGrid, roles: EXEC_PA, release: 'P0', screen: 'SCR-05', env: 'executive', keywords: 'directory contacts' },
      { key: 'calendar', path: '/exec/calendar', label: 'Calendar', i18n: 'calendar', icon: CalendarDays, roles: EXEC, release: 'P0', screen: 'SCR-06', env: 'executive' },
      { key: 'briefing', path: '/exec/briefing', label: 'Daily briefing', i18n: 'briefing', icon: BookOpenCheck, roles: EXEC, release: 'P0', screen: 'SCR-10', env: 'executive' },
      { key: 'exec-queue', path: '/exec/queue', label: 'Visitor queue', i18n: 'queue', icon: ListOrdered, roles: EXEC, release: 'P0', screen: 'SCR-09', env: 'executive', badge: 'queue' },
      { key: 'insights', path: '/exec/insights', label: 'Insights', icon: LineChart, roles: EXEC_PA, release: 'P0', screen: 'NEW', env: 'executive', keywords: 'analytics metrics baseline charts' },
    ],
  },
  {
    title: 'PA command centre', env: 'executive', items: [
      { key: 'pa-home', path: '/pa', label: 'Console home', icon: LayoutDashboard, roles: PA, release: 'P0', screen: 'SCR-20', env: 'executive' },
      { key: 'pa-calendar', path: '/pa/calendar', label: 'Calendar & booking', icon: CalendarDays, roles: PA, release: 'P0', screen: 'SCR-21', env: 'executive' },
      { key: 'pa-inbox', path: '/pa/inbox', label: 'Request inbox', icon: Inbox, roles: PA, release: 'P0', screen: 'SCR-22', env: 'executive', badge: 'inbox' },
      { key: 'pa-queue', path: '/pa/queue', label: 'Queue management', i18n: 'queue', icon: ListOrdered, roles: PA, release: 'P0', screen: 'SCR-23', env: 'executive', badge: 'queue' },
      { key: 'pa-visitors', path: '/pa/visitors', label: 'Visitors', i18n: 'visitors', icon: Users, roles: PA, release: 'P0', screen: 'SCR-58', env: 'executive' },
      { key: 'pa-followups', path: '/pa/follow-ups', label: 'Follow-ups', icon: ListChecks, roles: PA, release: 'P0', screen: 'SCR-24', env: 'executive', keywords: 'commitment ledger nudge' },
      { key: 'pa-drafts', path: '/pa/drafts', label: 'Drafts & outbox', icon: MailCheck, roles: PA, release: 'P0', screen: 'SCR-25', env: 'executive' },
    ],
  },
  {
    title: 'Work', env: 'executive', items: [
      { key: 'tasks', path: '/exec/tasks', label: 'Tasks', i18n: 'tasks', icon: ClipboardList, roles: EXEC_PA, release: 'P0', screen: 'SCR-11', env: 'executive' },
      { key: 'meetings', path: '/exec/meetings', label: 'Meetings & minutes', i18n: 'meetings', icon: NotebookPen, roles: EXEC_PA, release: 'P0', screen: 'SCR-12', env: 'executive' },
      { key: 'documents', path: '/exec/documents', label: 'Documents', i18n: 'documents', icon: FileText, roles: EXEC_PA, release: 'P0', screen: 'SCR-13', env: 'executive' },
      { key: 'decision-log', path: '/gov/decisions', label: 'Decision log', icon: ScrollText, roles: EXEC_PA, release: 'P0', screen: 'SCR-56', env: 'governance' },
      { key: 'absence', path: '/exec/absence', label: 'Absence & delegation', icon: Plane, roles: EXEC_PA, release: 'P0', screen: 'SCR-62', env: 'executive' },
      { key: 'handover', path: '/gov/handover', label: 'Handover dossier', icon: ArrowRightLeft, roles: ['ROLE-01', 'ROLE-08'], release: 'P0', screen: 'SCR-41', env: 'governance' },
    ],
  },
  {
    title: 'Reception', env: 'executive', items: [
      { key: 'reception', path: '/reception', label: 'Check-in desk', icon: ConciergeBell, roles: ['ROLE-04', 'ROLE-02'], release: 'P0', screen: 'SCR-27', env: 'executive' },
      { key: 'kiosk', path: '/kiosk', label: 'Kiosk mode', icon: MonitorSmartphone, roles: ['ROLE-04', 'ROLE-02'], release: 'P1', screen: 'SCR-28', env: 'executive' },
    ],
  },
  {
    title: 'Governance', env: 'governance', items: [
      { key: 'zone', path: '/gov/zone', label: 'Zone dashboard', icon: Building2, roles: EXEC, release: 'P2', screen: 'SCR-33', env: 'governance' },
      { key: 'ward', path: '/gov/ward', label: 'Ward operations', icon: Landmark, roles: ['ROLE-01', 'ROLE-05'], release: 'P2', screen: 'SCR-17', env: 'governance' },
      { key: 'officer-inbox', path: '/gov/my-tasks', label: 'My assigned tasks', icon: ClipboardCheck, roles: ['ROLE-05', 'ROLE-06'], release: 'P1', screen: 'SCR-31', env: 'governance' },
      { key: 'ward-form', path: '/gov/ward-form', label: 'Weekly ward form', icon: FileCheck2, roles: ['ROLE-05'], release: 'P2', screen: 'SCR-32', env: 'governance' },
      { key: 'dept', path: '/gov/departments', label: 'Department coordination', icon: Network, roles: ['ROLE-01', 'ROLE-06'], release: 'P2', screen: 'SCR-18', env: 'governance' },
      { key: 'statutory', path: '/gov/statutory', label: 'Statutory items', icon: Scale, roles: EXEC_PA, release: 'P2', screen: 'SCR-39', env: 'governance', keywords: 'rti deadlines' },
      { key: 'legal', path: '/gov/legal', label: 'Legal & audit', icon: Gavel, roles: EXEC_PA, release: 'P2', screen: 'SCR-40', env: 'governance', keywords: 'court audit paras' },
      { key: 'emergency', path: '/gov/emergency', label: 'Emergency mode', icon: Siren, roles: EXEC_PA, release: 'P1', screen: 'SCR-14', env: 'governance' },
      { key: 'dak', path: '/gov/dak', label: 'Dak intake', icon: Mail, roles: PA, release: 'P2', screen: 'SCR-26', env: 'governance', keywords: 'letters inward ocr' },
      { key: 'inspection', path: '/gov/inspection', label: 'Inspection capture', icon: Camera, roles: EXEC, release: 'P1', screen: 'SCR-55', env: 'governance', keywords: 'site visit field notes' },
      { key: 'rulebook', path: '/gov/rulebook', label: 'Rulebook search', icon: Search, roles: EXEC_PA, release: 'P1', screen: 'SCR-54', env: 'governance', keywords: 'circulars gr statutes' },
      { key: 'map', path: '/gov/map', label: 'Map', icon: Map, roles: EXEC, release: 'P2', screen: 'SCR-37', env: 'governance', keywords: 'gis' },
      { key: 'reports', path: '/gov/reports', label: 'Reports & runbooks', icon: FileBarChart, roles: ['ROLE-02', 'ROLE-07', 'ROLE-01'], release: 'P2', screen: 'SCR-38', env: 'governance' },
    ],
  },
  {
    title: 'Participate Mumbai', env: 'governance', items: [
      { key: 'pm-overview', path: '/gov/pm', label: 'Overview', icon: HandHeart, roles: EXEC, release: 'P2', screen: 'SCR-19', env: 'governance' },
      { key: 'csr', path: '/gov/csr', label: 'CSR pipeline', icon: HeartHandshake, roles: ['ROLE-07', 'ROLE-01'], release: 'P2', screen: 'SCR-34', env: 'governance' },
      { key: 'volunteer', path: '/gov/volunteers', label: 'Volunteer drives', icon: Users, roles: ['ROLE-07'], release: 'P3', screen: 'SCR-36', env: 'governance' },
    ],
  },
  {
    title: 'Administration', env: 'platform', items: [
      { key: 'users', path: '/admin/users', label: 'Users & roles', icon: ShieldCheck, roles: ['ROLE-08'], release: 'P0', screen: 'SCR-42', env: 'platform' },
      { key: 'config', path: '/admin/config', label: 'Configuration', icon: Settings2, roles: ['ROLE-08', 'ROLE-03'], release: 'P0', screen: 'SCR-43', env: 'platform', keywords: 'feature flags categories retention' },
      { key: 'audit', path: '/admin/audit', label: 'Audit & AI logs', icon: FileSearch, roles: ['ROLE-10', 'ROLE-08'], release: 'P0', screen: 'SCR-44', env: 'platform', keywords: 'hash chain' },
      { key: 'ops', path: '/admin/ops', label: 'Operations health', icon: Activity, roles: ['ROLE-08', 'ROLE-09'], release: 'P0', screen: 'SCR-60', env: 'platform' },
      { key: 'export', path: '/admin/export', label: 'Export & decommission', icon: DatabaseBackup, roles: ['ROLE-08'], release: 'P0', screen: 'SCR-45', env: 'platform' },
    ],
  },
  {
    title: 'Me', env: 'platform', items: [
      { key: 'notifications', path: '/notifications', label: 'Notification centre', i18n: 'notifications', icon: BellRing, roles: OFFICIAL, release: 'P0', screen: 'SCR-57', env: 'platform', badge: 'notifications' },
      { key: 'peace', path: '/exec/peace', label: 'Peace Mode', i18n: 'peaceMode', icon: Moon, roles: EXEC, release: 'P0', screen: 'SCR-15', env: 'executive' },
      { key: 'account', path: '/account', label: 'Account & devices', icon: UserCircle, roles: OFFICIAL, release: 'P0', screen: 'SCR-59', env: 'platform' },
      { key: 'directory', path: '/exec/office#directory', label: 'Directory', icon: Contact, roles: EXEC_PA, release: 'P0', screen: 'SCR-05', env: 'executive' },
    ],
  },
];

export const PRIVATE_NAV: NavItem[] = [
  { key: 'p-dash', path: '/private', label: 'Due soon', icon: LayoutDashboard, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-47', env: 'private' },
  { key: 'p-holdings', path: '/private/holdings', label: 'Holdings & assets', icon: Wallet, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-48', env: 'private' },
  { key: 'p-liab', path: '/private/liabilities', label: 'Loans & insurance', icon: Shield, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-49', env: 'private' },
  { key: 'p-vault', path: '/private/vault', label: 'Document vault', icon: Vault, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-50', env: 'private' },
  { key: 'p-family', path: '/private/family', label: 'Family calendar', icon: CalendarHeart, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-51', env: 'private' },
  { key: 'p-compliance', path: '/private/compliance', label: 'Compliance reminders', icon: FileCheck2, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-52', env: 'private' },
  { key: 'p-expenses', path: '/private/expenses', label: 'Expenses & tax pack', icon: Receipt, roles: ['ROLE-11'], release: 'PT', screen: 'SCR-53', env: 'private' },
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV.flatMap((s) => s.items), ...PRIVATE_NAV];

export const ROLE_META: Record<RoleId, { name: string; short: string; home: string; color: string; description: string }> = {
  'ROLE-01': { name: 'Principal Executive', short: 'Executive', home: '/exec/today', color: 'from-blue-500 to-indigo-600', description: 'Today, Decide, calendar, briefings, governance views' },
  'ROLE-02': { name: 'Personal Assistant', short: 'PA', home: '/pa', color: 'from-sky-500 to-blue-600', description: 'Bookings, queue, follow-ups, drafts, whisper' },
  'ROLE-03': { name: 'Office Administrator', short: 'Office admin', home: '/admin/config', color: 'from-slate-500 to-slate-700', description: 'Office categories, templates, office hours' },
  'ROLE-04': { name: 'Reception Operator', short: 'Reception', home: '/reception', color: 'from-teal-500 to-emerald-600', description: 'Walk-in registration, tokens, call next' },
  'ROLE-05': { name: 'Ward Officer', short: 'Ward officer', home: '/gov/my-tasks', color: 'from-green-500 to-emerald-700', description: 'Assigned tasks, evidence, weekly ward form' },
  'ROLE-06': { name: 'Department Officer', short: 'Dept officer', home: '/gov/my-tasks', color: 'from-lime-600 to-green-700', description: 'Coordination tasks assigned to you' },
  'ROLE-07': { name: 'Participate Mumbai Coordinator', short: 'PM coordinator', home: '/gov/csr', color: 'from-emerald-500 to-teal-700', description: 'Partners, CSR pipeline, milestones' },
  'ROLE-08': { name: 'System Administrator', short: 'Sys admin', home: '/admin/users', color: 'from-zinc-600 to-zinc-800', description: 'Users, roles, configuration, health, export' },
  'ROLE-09': { name: 'AASIOM Support Engineer', short: 'Support', home: '/admin/ops', color: 'from-orange-500 to-amber-600', description: 'No standing access — break-glass only' },
  'ROLE-10': { name: 'Security Auditor', short: 'Auditor', home: '/admin/audit', color: 'from-rose-500 to-red-700', description: 'Read-only audit ledger and AI logs' },
  'ROLE-11': { name: 'Personal Environment Owner', short: 'Private', home: '/private', color: 'from-purple-500 to-fuchsia-700', description: 'Separate private app — own keys and store' },
  'ROLE-12': { name: 'Visitor (public)', short: 'Visitor', home: '/public/request', color: 'from-cyan-500 to-sky-600', description: 'Request a meeting, check token status' },
  'ROLE-13': { name: 'Designated Family Member', short: 'Family', home: '/', color: 'from-gray-400 to-gray-500', description: 'Deferred feature — no access in any release' },
};

export function canAccess(role: RoleId, path: string): boolean {
  const clean = path.split('#')[0];
  const always = ['/notifications', '/account', '/denied'];
  if (always.some((p) => clean.startsWith(p))) return role !== 'ROLE-11' && role !== 'ROLE-12';
  const match = ALL_NAV_ITEMS
    .filter((i) => clean === i.path.split('#')[0] || clean.startsWith(i.path.split('#')[0] + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (!match) {
    // detail routes not in nav
    if (clean.startsWith('/exec/brief') || clean.startsWith('/exec/appointment')) return ['ROLE-01', 'ROLE-02'].includes(role);
    if (clean.startsWith('/gov/csr/')) return ['ROLE-07', 'ROLE-01'].includes(role);
    if (clean.startsWith('/pa/visitors/')) return ['ROLE-02', 'ROLE-04'].includes(role);
    return false;
  }
  return match.roles.includes(role);
}
