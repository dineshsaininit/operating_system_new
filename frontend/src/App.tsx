import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { ROLE_META, canAccess } from '@/config/navigation';
import AppShell from '@/components/layout/AppShell';
import SignIn from '@/pages/auth/SignIn';

// Code-split by area so each role downloads only what it uses.
const named = <M extends Record<string, unknown>>(loader: () => Promise<M>, key: keyof M) =>
  lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));

const exOffice = () => import('@/pages/executive/Office');
const exBriefs = () => import('@/pages/executive/Briefs');
const exSettings = () => import('@/pages/executive/Settings');
const exRecords = () => import('@/pages/executive/Records');
const pa1 = () => import('@/pages/pa/PAConsole');
const pa2 = () => import('@/pages/pa/PAWork');
const rec = () => import('@/pages/reception/Reception');
const pub = () => import('@/pages/public/Public');
const gov1 = () => import('@/pages/governance/Governance');
const gov2 = () => import('@/pages/governance/Operations');
const gov3 = () => import('@/pages/governance/Officers');
const plat = () => import('@/pages/platform/Platform');
const priv = () => import('@/pages/private/Private');

const Today = lazy(() => import('@/pages/executive/Today'));
const Decide = lazy(() => import('@/pages/executive/Decide'));
const Ask = lazy(() => import('@/pages/executive/Ask'));
const CalendarPage = lazy(() => import('@/pages/executive/Calendar'));
const Tasks = lazy(() => import('@/pages/executive/Tasks'));
const Insights = lazy(() => import('@/pages/executive/Insights'));
const OfficeHub = named(exOffice, 'OfficeHub');
const ExecQueue = named(exOffice, 'ExecQueue');
const AppointmentDetail = named(exOffice, 'AppointmentDetail');
const PreMeetingBrief = named(exBriefs, 'PreMeetingBrief');
const Briefing = named(exBriefs, 'Briefing');
const PeaceModeSettings = named(exSettings, 'PeaceModeSettings');
const AbsenceDelegation = named(exSettings, 'AbsenceDelegation');
const Meetings = named(exRecords, 'Meetings');
const Documents = named(exRecords, 'Documents');
const PAConsole = named(pa1, 'PAConsole');
const RequestInbox = named(pa1, 'RequestInbox');
const QueueManagement = named(pa1, 'QueueManagement');
const VisitorsList = named(pa2, 'VisitorsList');
const VisitorRecord = named(pa2, 'VisitorRecord');
const FollowUpBoard = named(pa2, 'FollowUpBoard');
const DraftsOutbox = named(pa2, 'DraftsOutbox');
const ReceptionCheckIn = named(rec, 'ReceptionCheckIn');
const Kiosk = named(rec, 'Kiosk');
const PublicRequest = named(pub, 'PublicRequest');
const PublicStatus = named(pub, 'PublicStatus');
const ZoneDashboard = named(gov1, 'ZoneDashboard');
const WardOperations = named(gov1, 'WardOperations');
const DepartmentCoordination = named(gov1, 'DepartmentCoordination');
const StatutoryItems = named(gov1, 'StatutoryItems');
const LegalAudit = named(gov1, 'LegalAudit');
const MapView = named(gov1, 'MapView');
const ReportsRunbooks = named(gov1, 'ReportsRunbooks');
const EmergencyMode = named(gov2, 'EmergencyMode');
const DakIntake = named(gov2, 'DakIntake');
const InspectionCapture = named(gov2, 'InspectionCapture');
const RulebookSearch = named(gov2, 'RulebookSearch');
const DecisionLog = named(gov2, 'DecisionLog');
const HandoverDossier = named(gov2, 'HandoverDossier');
const OfficerInbox = named(gov3, 'OfficerInbox');
const WeeklyWardForm = named(gov3, 'WeeklyWardForm');
const PMOverview = named(gov3, 'PMOverview');
const CsrPipeline = named(gov3, 'CsrPipeline');
const CsrProjectDetail = named(gov3, 'CsrProjectDetail');
const VolunteerDrives = named(gov3, 'VolunteerDrives');
const UsersRoles = named(plat, 'UsersRoles');
const Configuration = named(plat, 'Configuration');
const AuditLogs = named(plat, 'AuditLogs');
const ExportDecommission = named(plat, 'ExportDecommission');
const NotificationCentre = named(plat, 'NotificationCentre');
const AccountDevices = named(plat, 'AccountDevices');
const OperationsHealth = named(plat, 'OperationsHealth');
const AccessDenied = named(plat, 'AccessDenied');
const PrivateShell = named(priv, 'PrivateShell');
const PrivateDashboard = named(priv, 'PrivateDashboard');
const Holdings = named(priv, 'Holdings');
const Liabilities = named(priv, 'Liabilities');
const Vault = named(priv, 'Vault');
const FamilyCalendar = named(priv, 'FamilyCalendar');
const ComplianceReminders = named(priv, 'ComplianceReminders');
const ExpensesTax = named(priv, 'ExpensesTax');

function PageLoader() {
  return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

/** Client-side guard (UX only). The backend MUST enforce the same rules server-side (SEC-FR-003). */
function Guard({ children }: { children: ReactNode }) {
  const { session } = useApp();
  const loc = useLocation();
  if (!session) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  if (session.user.role === 'ROLE-11') return <Navigate to="/private" replace />;
  if (!canAccess(session.user.role, loc.pathname)) return <AccessDenied />;
  return <>{children}</>;
}

function PrivateGuard({ children }: { children: ReactNode }) {
  const { session } = useApp();
  if (!session) return <Navigate to="/" replace />;
  if (session.user.role !== 'ROLE-11') return <Navigate to="/denied" replace />; // official accounts can never open the Private app
  return <>{children}</>;
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

export default function App() {
  const { session } = useApp();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={session ? <Navigate to={ROLE_META[session.user.role].home} replace /> : <SignIn />} />

        {/* Public (ROLE-12) — no sign-in */}
        <Route path="/public/request" element={<PublicRequest />} />
        <Route path="/public/status" element={<PublicStatus />} />
        <Route path="/kiosk" element={<Guard><Kiosk /></Guard>} />

        {/* Separate Private app */}
        <Route path="/private" element={<PrivateGuard><PrivateShell /></PrivateGuard>}>
          <Route index element={<S><PrivateDashboard /></S>} />
          <Route path="holdings" element={<S><Holdings /></S>} />
          <Route path="liabilities" element={<S><Liabilities /></S>} />
          <Route path="vault" element={<S><Vault /></S>} />
          <Route path="family" element={<S><FamilyCalendar /></S>} />
          <Route path="compliance" element={<S><ComplianceReminders /></S>} />
          <Route path="expenses" element={<S><ExpensesTax /></S>} />
        </Route>

        {/* Official app */}
        <Route element={session ? <AppShell /> : <Navigate to="/" replace />}>
          <Route path="/exec/today" element={<Guard><S><Today /></S></Guard>} />
          <Route path="/exec/decide" element={<Guard><S><Decide /></S></Guard>} />
          <Route path="/exec/ask" element={<Guard><S><Ask /></S></Guard>} />
          <Route path="/exec/office" element={<Guard><S><OfficeHub /></S></Guard>} />
          <Route path="/exec/calendar" element={<Guard><S><CalendarPage mode="exec" /></S></Guard>} />
          <Route path="/exec/appointment/:id" element={<Guard><S><AppointmentDetail /></S></Guard>} />
          <Route path="/exec/brief/:id" element={<Guard><S><PreMeetingBrief /></S></Guard>} />
          <Route path="/exec/queue" element={<Guard><S><ExecQueue /></S></Guard>} />
          <Route path="/exec/briefing" element={<Guard><S><Briefing /></S></Guard>} />
          <Route path="/exec/tasks" element={<Guard><S><Tasks /></S></Guard>} />
          <Route path="/exec/meetings" element={<Guard><S><Meetings /></S></Guard>} />
          <Route path="/exec/documents" element={<Guard><S><Documents /></S></Guard>} />
          <Route path="/exec/peace" element={<Guard><S><PeaceModeSettings /></S></Guard>} />
          <Route path="/exec/absence" element={<Guard><S><AbsenceDelegation /></S></Guard>} />
          <Route path="/exec/insights" element={<Guard><S><Insights /></S></Guard>} />

          <Route path="/pa" element={<Guard><S><PAConsole /></S></Guard>} />
          <Route path="/pa/calendar" element={<Guard><S><CalendarPage mode="pa" /></S></Guard>} />
          <Route path="/pa/inbox" element={<Guard><S><RequestInbox /></S></Guard>} />
          <Route path="/pa/queue" element={<Guard><S><QueueManagement /></S></Guard>} />
          <Route path="/pa/visitors" element={<Guard><S><VisitorsList /></S></Guard>} />
          <Route path="/pa/visitors/:id" element={<Guard><S><VisitorRecord /></S></Guard>} />
          <Route path="/pa/follow-ups" element={<Guard><S><FollowUpBoard /></S></Guard>} />
          <Route path="/pa/drafts" element={<Guard><S><DraftsOutbox /></S></Guard>} />

          <Route path="/reception" element={<Guard><S><ReceptionCheckIn /></S></Guard>} />

          <Route path="/gov/zone" element={<Guard><S><ZoneDashboard /></S></Guard>} />
          <Route path="/gov/ward" element={<Guard><S><WardOperations /></S></Guard>} />
          <Route path="/gov/departments" element={<Guard><S><DepartmentCoordination /></S></Guard>} />
          <Route path="/gov/my-tasks" element={<Guard><S><OfficerInbox /></S></Guard>} />
          <Route path="/gov/ward-form" element={<Guard><S><WeeklyWardForm /></S></Guard>} />
          <Route path="/gov/statutory" element={<Guard><S><StatutoryItems /></S></Guard>} />
          <Route path="/gov/legal" element={<Guard><S><LegalAudit /></S></Guard>} />
          <Route path="/gov/emergency" element={<Guard><S><EmergencyMode /></S></Guard>} />
          <Route path="/gov/dak" element={<Guard><S><DakIntake /></S></Guard>} />
          <Route path="/gov/inspection" element={<Guard><S><InspectionCapture /></S></Guard>} />
          <Route path="/gov/rulebook" element={<Guard><S><RulebookSearch /></S></Guard>} />
          <Route path="/gov/map" element={<Guard><S><MapView /></S></Guard>} />
          <Route path="/gov/reports" element={<Guard><S><ReportsRunbooks /></S></Guard>} />
          <Route path="/gov/decisions" element={<Guard><S><DecisionLog /></S></Guard>} />
          <Route path="/gov/handover" element={<Guard><S><HandoverDossier /></S></Guard>} />
          <Route path="/gov/pm" element={<Guard><S><PMOverview /></S></Guard>} />
          <Route path="/gov/csr" element={<Guard><S><CsrPipeline /></S></Guard>} />
          <Route path="/gov/csr/:id" element={<Guard><S><CsrProjectDetail /></S></Guard>} />
          <Route path="/gov/volunteers" element={<Guard><S><VolunteerDrives /></S></Guard>} />

          <Route path="/admin/users" element={<Guard><S><UsersRoles /></S></Guard>} />
          <Route path="/admin/config" element={<Guard><S><Configuration /></S></Guard>} />
          <Route path="/admin/audit" element={<Guard><S><AuditLogs /></S></Guard>} />
          <Route path="/admin/ops" element={<Guard><S><OperationsHealth /></S></Guard>} />
          <Route path="/admin/export" element={<Guard><S><ExportDecommission /></S></Guard>} />

          <Route path="/notifications" element={<Guard><S><NotificationCentre /></S></Guard>} />
          <Route path="/account" element={<Guard><S><AccountDevices /></S></Guard>} />
          <Route path="/denied" element={<S><AccessDenied /></S>} />
          <Route path="*" element={<S><AccessDenied /></S>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
