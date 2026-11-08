# AASIOM Command OS — Backend API contract

This is the contract between the frontend in this folder and the backend you will build. The frontend already works end-to-end against a **mock API on synthetic data**. Your job is to implement these endpoints. When you're ready, set `VITE_API_BASE_URL` in `.env.local` and the same UI talks to your server. No UI changes needed.

**Source of truth:** `src/services/api.ts`. Every method there declares its endpoint (`method`, `path`, `body`) next to a mock implementation. The mock code shows the exact business behaviour, validations and audit events expected. Read it alongside this document.
**Data shapes:** `src/types/index.ts`. Request/response JSON uses these TypeScript types exactly (camelCase, ISO-8601 timestamps).
**Requirements:** IDs like `EXEC-FR-037`, `BR-011` and `SCR-22` refer to the SRS v1.1 and the Requirements Register in the parent folder.

---

## 1. Conventions

| Item | Rule |
|---|---|
| Base URL | `VITE_API_BASE_URL`, e.g. `http://localhost:8000/api`. All paths below are relative to it. |
| Auth | `Authorization: Bearer <token>` from `POST /auth/sign-in`. Cookies are also sent (`credentials: 'include'`), so either works. |
| Format | JSON in, JSON out. `204 No Content` is fine for actions with no result. |
| Timestamps | ISO-8601 UTC strings (`2026-11-08T10:30:00.000Z`). |
| Errors | Body `{ "message": string, "details"?: object, "referenceId"?: string }`. The UI shows `message` to the user. |
| `401` | Session expired, so the UI returns to sign-in. |
| `403` | Not permitted. The UI shows the Access denied screen (SCR-61) with `referenceId`. Never leak what exists. |
| `409` | Conflict or invalid state transition (e.g. calendar clash, BR-011 transition, nudge cap). |
| `422` | Validation error. `details` may be `{ field: message }`. |
| CORS | Allow the Vite dev origin `http://localhost:5173`, or use the proxy in `vite.config.ts`. |

## 2. Rules the server MUST enforce (never trust the client)

The frontend hides buttons by role, but that is UX only. Enforce all of these server-side (SEC-FR-003, NFR-029):

1. **RBAC on every endpoint.** See the role table in `src/config/navigation.ts` (`NAV`, `canAccess`) and the Permission Matrix sheet of the register.
2. **Task state machine (BR-011 / EXEC-FR-037):** `draft → assigned → acknowledged → in-progress → submitted → verified|closed`; `submitted → reopened`; `reopened → in-progress`; any open state → `cancelled` *with reason*. A task cannot leave draft without `ownerPost` and `due`. If `verificationRequired`, it can only be closed after `verified`, and only by the assigner or delegate (ROLE-01/02). The table is in `TASK_TRANSITIONS` in `api.ts`.
3. **Weekly nudge cap (BR-013).** Default 3 per task per week. Return `409` when exceeded.
4. **Reserved appointment categories** can be approved only by ROLE-01. The PA escalates them to Decide.
5. **Absence mode without a written delegation record (BR-049):** approvals are *held*, never routed. Return `409`.
6. **Every approval writes an ApprovalRecord (ENT-37)** and an audit event. **No AI or system account can approve anything.**
7. **Sends** only for drafts in status `approved` (AI-FR-004). SMS is blocked unless `config.smsSenderApproved` (DEC-010).
8. **Audit ledger:** append-only and hash-chained. Write an event for every write, approval, send, AI call and every read of OFF/RES data. Include denials.
9. **Restricted documents (`RES`)**: only ROLE-01 can read. Log denied reads.
10. **CSR stage → Execution** requires an approval reference.
11. **Private environment** (`/private/*`) is a *separate service with separate identity and keys*. It never reads official stores. The only outbound data is an opaque `Busy` calendar block.
12. **Synthetic data only** until Gate 0 (written institutional authorization).

## 3. Endpoints

`:id` = path parameter. "Body" lists JSON fields; types are in `src/types/index.ts`.

### Auth & account (SCR-01, SCR-59)
| Method | Path | Body → Response |
|---|---|---|
| POST | `/auth/sign-in` | `{ role, deviceName }` → `Session`. *(The demo picks a role. The real flow is credential → MFA/passkey → device binding.)* |
| POST | `/auth/sign-out` | → 204 |
| GET | `/me/devices` | → `Device[]` |
| DELETE | `/me/devices/:id` | → 204 |

### Dashboards (SCR-02, SCR-20)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/exec/today` | → `{ commitments: CalendarEvent[], dueToday: Task[], decideCount, alert:{title,source,sourceTime}, queueWaiting, execStatus }` |
| GET | `/pa/console` | → `{ queue: QueueEntry[], inboxCount, decideCount, followUpsDue: Task[], execStatus, whisperLast }` |
| PUT | `/exec/status` | `{ text, tone: 'busy'\|'available'\|'away'\|'travel' }` |
| POST | `/pa/whisper` | `{ type, note }`. Pushes an Interrupt notification with generic lock-screen text. |
| POST | `/exec/whisper-reply` | `{ text }` (one of the preset replies) |

### Calendar (SCR-06, SCR-21)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/calendar` | → `CalendarEvent[]` (private items appear only as `type:'busy'`, title `Busy`) |
| POST | `/calendar` | `CalendarEvent` minus id, plus optional `overrideReason` → `CalendarEvent`. **409** on clash unless `overrideReason`. |
| PATCH | `/calendar/:id` | `{ start, end }` |
| POST | `/calendar/:id/accept` | Accept a PA proposal |
| POST | `/calendar/:id/cancel` | `{ reason }` |

### Appointment requests (SCR-07, SCR-22, SCR-29, SCR-30)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/appointment-requests` | → `AppointmentRequest[]` |
| GET | `/appointment-requests/:id` | → `AppointmentRequest` |
| POST | `/appointment-requests/:id/approve` | `{ slot }`. Creates the calendar event and queues the confirmation SMS. |
| POST | `/appointment-requests/:id/decline` | `{ reason }` |
| POST | `/appointment-requests/:id/redirect` | `{ target, reason }` |
| POST | `/appointment-requests/:id/escalate` | Adds to Decide |
| POST | `/public/appointment-requests` | **Public, OTP-verified.** `{ name, mobile, category, ward, purpose, lang }` → `{ ref }` |
| GET | `/public/status/:ref` | **Public, own record only.** → `{kind:'token', ref, status, position, wait}` or `{kind:'request', ref, status, slot?, redirectTarget?}` or `null` |

### Queue & visitors (SCR-09, SCR-23, SCR-27, SCR-28, SCR-58)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/queue/today` | → `QueueEntry[]` (reception: today only, no history) |
| POST | `/queue` | `{ name, mobile?, category, ward, purpose, noticeRead, offline?, kiosk? }` → `QueueEntry`. **422** if `!noticeRead`. Offline tokens use the `L-nn` prefix. |
| POST | `/queue/call-next` | → `QueueEntry \| null` |
| PATCH | `/queue/:id` | `{ status }` |
| POST | `/queue/:id/route` | `{ target }` |
| POST | `/queue/:id/reorder` | `{ dir: -1\|1, reason }` (reason required) |
| POST | `/queue/pause` | `{ paused }` |
| GET | `/visitors` · `/visitors/:id` | → `Visitor[]` / `Visitor` (history is *context only*) |
| POST | `/visitors/:id/data-requests` | `{ kind }` (data-protection request) |

### Tasks / commitment ledger (SCR-11, SCR-24, SCR-31)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/tasks` | → `Task[]` (officers: own ward/post only) |
| POST | `/tasks` | `{ title, ownerPost, due, verificationRequired, priority, ward?, source?, sourceRef? }` → `Task` (state `assigned` if owner+due, else `draft`) |
| POST | `/tasks/:id/transition` | `{ to: TaskState, note? }` → `Task`. **409** on invalid transition. |
| POST | `/tasks/:id/nudge` | **409** at weekly cap |
| POST | `/tasks/:id/escalate` | |
| POST | `/tasks/:id/evidence` | `{ count }`. *(Real implementation: multipart upload with malware scan.)* |
| POST | `/tasks/:id/extension` | `{ days, reason }`. Adds to the assigner's Decide queue. |

### Decide queue (SCR-03)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/decide` | → pending `DecideItem[]` |
| POST | `/decide/:id/approve` | For `draft`, `minutes`, `extension`. *(Appointments and verifications go through their own endpoints.)* |
| POST | `/decide/:id/reject` | `{ reason }` |
| PATCH | `/decide/:id` | `{ body }` (human edit; clears the AI-draft flag) |

### Drafts & outbox (SCR-25)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/drafts` | → `Draft[]` |
| POST / PUT | `/drafts` · `/drafts/:id` | `Draft` fields → `Draft` (editing an approved draft returns it to `draft`) |
| POST | `/drafts/:id/request-approval` | Adds to Decide |
| POST | `/drafts/:id/send` | **409** unless `approved`; **409** for SMS without approved sender ID |
| DELETE | `/drafts/:id` | |

### Meetings (SCR-08, SCR-12)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/meetings` · `/meetings/:id` | → `Meeting[]` / `Meeting` |
| PUT | `/meetings/:id/notes` | `{ notes }` (autosaved; bump `version`) |
| PUT | `/meetings/:id/actions` | `{ actions: MeetingAction[], decisions: string[] }` |
| POST | `/meetings/:id/submit-minutes` | Adds to Decide |
| POST | `/meetings/:id/approve-minutes` | Chair only. **Creates a task per action item.** |

### Notifications, Peace Mode, absence (SCR-15, SCR-57, SCR-62)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/notifications` | → `AppNotification[]` |
| POST | `/notifications/:id/read` · `/notifications/read-all` · `/notifications/release-held` | |
| GET / PUT | `/me/peace-mode` | `PeaceSettings` (ROLE-01 only; the `emergency` category is always `interrupt`) |
| GET / PUT | `/absence` | `AbsenceState` |

### Records (SCR-05, SCR-13, SCR-56)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/decisions` | → `DecisionEntry[]` |
| POST | `/decisions` | `{ title, basis, fileRef, date, reviewDate? }` (ROLE-01 → confirmed, others → draft) |
| POST | `/decisions/:id/confirm` | ROLE-01 only |
| GET | `/documents` · `/documents/:id` | → `OfficeDocument[]` / `OfficeDocument` (**403** for RES unless ROLE-01; audit every OFF/RES read) |
| POST | `/documents` | `{ title, dataClass, tags }` *(real: multipart + scan + class gate)* |
| GET | `/directory` | → `Contact[]` |

### Governance (SCR-14, 17–19, 26, 31–40, 54–55) — *needs written authorization per data source (DEC-006) before live data*
| Method | Path | Body → Response |
|---|---|---|
| GET | `/gov/wards` | → `WardSummary[]` |
| POST | `/gov/wards/:id/weekly-form` | `Record<string, number>` |
| GET / POST | `/gov/statutory` | `StatutoryItem[]` / new item (rule status starts `unverified`; never compute deadlines from unverified rules, DEC-038) |
| GET | `/gov/legal` | → `{ cases: LegalCase[], paras: AuditPara[] }` |
| GET | `/gov/csr` | → `CsrProject[]` |
| POST | `/gov/csr/:id/stage` | `{ stage, approvalRef? }` (**422** to Execution without a ref) |
| GET / POST | `/gov/emergency` | `Emergency` / declare `{ title, kind, summary }` (Interrupt to the contact tree; overrides Peace Mode; pauses the queue) |
| POST | `/gov/emergency/calls` | `{ who, outcome }` |
| POST | `/gov/emergency/close` | `{ closingNote }` |
| GET | `/gov/dak` | → `DakItem[]` |
| POST | `/gov/dak/:id/route` | `{ route, createTask }` |
| GET / POST | `/gov/inspections` | `Inspection[]` / capture `{ location, notes, photos, draftTasks }` |
| POST | `/gov/inspections/:id/confirm` | Creates draft tasks |

### Platform administration (SCR-42–45, SCR-60)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/admin/users` | → `User[]` |
| PATCH | `/admin/users/:id` | `{ status }` |
| GET | `/admin/access-requests` | → `AccessRequest[]` |
| POST | `/admin/access-requests/:id/approve` · `/reject` | ROLE-08 only; writes an approval record |
| POST | `/admin/break-glass` | `{ reason, minutes }` (time-boxed; needs ROLE-08 approval) |
| GET / PUT | `/admin/config` | `ConfigState` (ROLE-03 may change office items only) |
| GET | `/audit/events` | → `AuditEvent[]` (ROLE-10, ROLE-08) |
| POST | `/audit/verify` | → `{ ok, checked }` (hash-chain verification) |
| GET | `/audit/ai-interactions` | → `AIInteraction[]` |
| GET | `/ops/health` | → `{ services, jobs, alerts, lastBackup, lastRestoreTest }` |
| POST | `/ops/alerts/:id/ack` | |
| POST | `/admin/exports` | `{ scope, format }` → `{ jobId, checksum, files }` |

### Private Wealth & Life OS — separate service (SCR-46–53)
| Method | Path | Body → Response |
|---|---|---|
| GET | `/private/dashboard` | → `{ dues: PrivateDue[], holdings: Holding[], liabilities: Liability[] }` |
| GET / POST | `/private/holdings` | `Holding[]` / new holding |
| GET | `/private/liabilities` | → `{ loans: Liability[], policies: Policy[] }` |
| GET | `/private/vault` | → `VaultFolder[]` (**server stores ciphertext only**; client-side encryption) |
| POST | `/private/vault/:id/files` | `{ name, sizeKb }` *(real: encrypted blob upload)* |
| GET / POST | `/private/family-events` | `FamilyEvent[]` / new event. If `blockWork`, project an opaque `Busy` block into the official calendar. |
| POST | `/private/family-events/:id/toggle-block` | |
| GET / POST | `/private/expenses` | `Expense[]` / new expense |
| GET | `/private/compliance` | → `ComplianceReminder[]` |

## 4. AI gateway (move it to the backend)

Right now `src/services/ai.ts` calls Groq → Google Gemini → Mistral **directly from the browser** using keys in `.env.local`. That is acceptable **only for a local demo on synthetic data**: any `VITE_*` value ships inside the JS bundle. For anything real:

1. Add `POST /ai/chat` `{ feature, messages }` → `{ text, provider, model }` on the backend (the PLT-M03 AI gateway). Do the provider calls, redaction, policy checks and logging there.
2. Keep the API keys **only on the server**.
3. Change `aiChat()` in `src/services/ai.ts` to call `/ai/chat` instead of the providers. It is the only function to touch.
4. Log every call to the AI interaction log (`/audit/ai-interactions`).

AI stays off for official data until DEC-008 is approved.

## 5. Suggested build order (matches the SRS stages)

1. **Auth, roles, audit ledger**: sign-in, RBAC middleware, hash-chained audit.
2. **Calendar + appointment requests + public form**
3. **Queue + visitors + reception**
4. **Tasks, Decide, drafts, meetings**
5. **Notifications, Peace Mode, absence, briefing aggregates**
6. **Admin, config, ops, export**
7. Governance and Private: only after the respective authorizations and decisions.

To switch one area at a time, you can also edit individual methods in `api.ts`. Each `call()` falls back to its mock while `VITE_API_BASE_URL` is empty.
