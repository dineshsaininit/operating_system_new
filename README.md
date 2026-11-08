# AASIOM Command OS — Frontend

The frontend for **AASIOM Command OS**, the office operating system for the Office of the Deputy Municipal Commissioner, Zone II (BMC), as specified in the SRS v1.1 and the companion documents in the parent folder.

It covers **all 62 screens** in the screen map across the four environments. **Every role** (ROLE-01 to ROLE-12) gets its own navigation and permissions.

| Environment | What's in it |
|---|---|
| **Executive OS** (blue) | Today, Decide, Ask (AI), Calendar, Briefing, Tasks, Meetings & minutes, Documents, Peace Mode, Absence & delegation, PA console, Request inbox, Queue, Visitors, Follow-ups, Drafts, Reception check-in, Kiosk |
| **Governance OS** (green) | Zone dashboard, Ward operations, Officer task inbox, Weekly ward form, Department coordination, Statutory items, Legal & audit, Emergency mode, Dak intake, Inspection capture, Rulebook search, Map, Reports & runbooks, Decision log, Handover dossier, Participate Mumbai (overview, CSR pipeline, project detail, volunteers) |
| **Platform** (grey) | Sign-in + MFA + device binding, Users & roles, Configuration, Audit & AI logs (hash chain), Operations health, Export & decommissioning, Notification centre, Account & devices, Access denied |
| **Private Wealth & Life** (purple) | A *separate* app: unlock, Due soon, Holdings, Loans & insurance, Encrypted vault, Family calendar (busy-block projection), Compliance reminders, Expenses & tax pack |
| **Public** | Request a meeting (with OTP), Visitor status |

> **Synthetic data only.** Every name, ward and number is fictional (BR-048, Gate 0). Don't put real BMC, visitor or officer data in here.

---

## Run it

Requires **Node.js 18+**.

```bash
cd main_code_folder
npm install
npm run dev          # opens http://localhost:5173
```

Other scripts: `npm run build` (type-check + production build into `dist/`), `npm run preview`, `npm run typecheck`.

### Signing in (demo)
On the sign-in screen, pick any role, continue, and confirm. The passkey step is simulated; for code-based roles, any digits work. Then bind the device. Each role lands on its own home screen and sees only what it is allowed to. Use **user menu → Switch demo role** to jump between roles, and **Reset demo data** to start fresh. Demo changes are saved in your browser.

Public pages need no sign-in: `/public/request` and `/public/status`.

## Features added beyond the documents
- **Command palette** (`Ctrl/⌘ + K`): jump to any permitted screen, search tasks, requests and visitors, run actions
- **Keyboard shortcuts** (`?` for help, `G` then `T/D/K/Q/C/N/A` to navigate)
- **Live AI assistant** with provider fallback (Groq → Gemini → Mistral), cited answers as clickable record chips, policy refusals for sanction/sign/enforcement requests, and every call logged for the auditor. AI is also used in the briefing summary, voice-to-task, minutes action extraction, communication drafting and rulebook search. Everything AI writes is labelled **AI DRAFT** and needs human approval.
- **Voice**: push-to-talk dictation (Marathi / Hindi / English) and read-aloud for Today, Briefing and answers
- **Insights**: baseline metrics with charts (accessible chart/table toggle)
- **Dark mode**, **text size up to 200%**, **English / मराठी / हिन्दी**, **offline banner**, **reduced-motion support**
- **Motion design**: page transitions, staggered entrances, animated counters, hover lift, route progress bar, toasts with timers
- **CSV export** on tasks, decision log, audit log, handover dossier and tax pack
- **Demo persistence** in the browser, with one-click reset

## For the backend developer
Read **[BACKEND_API_CONTRACT.md](BACKEND_API_CONTRACT.md)**. In short:

- The UI talks to data **only** through `src/services/api.ts`. Each method declares its REST endpoint next to a mock implementation that shows the exact business rules.
- Set `VITE_API_BASE_URL=http://localhost:8000/api` in `.env.local` and every call goes to your server instead of the mock.
- Types for every request and response are in `src/types/index.ts`.
- Move the AI calls behind a backend `/ai/chat` endpoint before any real use. Only `aiChat()` in `src/services/ai.ts` needs to change.

## Project structure

```
main_code_folder/
├─ BACKEND_API_CONTRACT.md      ← endpoint contract for the backend
├─ .env.local                   ← your API keys (gitignored — never commit)
├─ .env.example                 ← template without secrets
└─ src/
   ├─ App.tsx                   ← routes + role guards (lazy-loaded per area)
   ├─ types/index.ts            ← domain types = data contract
   ├─ services/
   │  ├─ api.ts                 ← THE data layer (endpoints + mock)
   │  ├─ http.ts                ← fetch wrapper for the real backend
   │  ├─ ai.ts                  ← AI gateway client + guardrails
   │  └─ useApi.ts, bus.ts      ← data hook with auto-refresh after mutations
   ├─ data/mockDb.ts            ← synthetic dataset
   ├─ config/navigation.ts      ← menu, roles, permissions (RBAC)
   ├─ store/                    ← session/theme/language + toasts
   ├─ i18n/strings.ts           ← English / Marathi / Hindi
   ├─ components/               ← UI kit, charts, layout shell, palette
   └─ pages/
      ├─ auth/  executive/  pa/  reception/  public/
      ├─ governance/  platform/  private/
```

Each page header shows its **screen ID** (e.g. `SCR-22`) and **planned release** (P0/P1/P2/P3/PT), so you can trace it back to the SRS.

## Security notes
- **API keys:** `VITE_*` variables are compiled into the browser bundle. That's fine for this local synthetic demo, but **never deploy this build with real keys**. Put them behind the backend. Also consider rotating the keys you shared, since they've been pasted in chat.
- Role checks in the UI are for UX only. The **server must enforce all permissions** (see the contract, section 2).
- The Private app is a separate environment. In production it needs its own service, identity and keys.

## Tech stack
React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router 6 · Recharts · lucide-react icons · tailwind-merge.
