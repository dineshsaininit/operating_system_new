# AASIOM Command OS — Backend

Implements every endpoint in [`../BACKEND_API_CONTRACT.md`](../BACKEND_API_CONTRACT.md) so the existing frontend runs against a real server instead of the in-browser mock. **Synthetic data only** (Gate 0).

Node 20+ · Express 5 · TypeScript (run with `tsx`, no build step) · JSON-file persistence · no native dependencies.

## Run it

```bash
# terminal 1 — backend on http://localhost:8000/api
cd server
npm install
npm run dev

# terminal 2 — frontend on http://localhost:5173, talking to the backend
cd ..
echo VITE_API_BASE_URL=/api > .env.local     # Vite proxies /api → localhost:8000
npm install
npm run dev
```

Or from the repo root: `npm run server:install`, then `npm run server` + `npm run dev`.

Remove `VITE_API_BASE_URL` from `.env.local` to go back to the browser mock.

**Single-port option:** run `npm run build` at the root with `VITE_API_BASE_URL=/api`, then `npm start` in `server/`. The backend also serves `dist/` at http://localhost:8000.

| Script | What it does |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm start` | Start without watching |
| `npm test` | 27 integration tests over HTTP covering every rule in contract §2 |
| `npm run typecheck` | `tsc --noEmit` (shares `../src/types` with the frontend) |
| `npm run seed` | Wipe and reload the synthetic dataset (dates are relative to "now") |

## Configuration (`server/.env`, all optional)

| Variable | Default | |
|---|---|---|
| `PORT` | `8000` | |
| `DATA_DIR` | `server/data` | Where `official.json` and `private.json` live (gitignored) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origins allowed to call with credentials |
| `DEMO_MODE` | `true` | Enables `POST /api/demo/reset` (the UI's *Reset demo data*). **Set `false` outside a local demo.** |
| `SESSION_TTL_HOURS` | `12` | |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `GROQ_API_KEY`, `GOOGLE_API_KEY`, `MISTRAL_API_KEY` | — | AI gateway keys: **server-side only** |
| `GROQ_MODEL`, `GEMINI_MODEL`, `MISTRAL_MODEL` | as in the frontend | |

## Layout

```
server/src/
  index.ts        entry point            app.ts     middleware, routers, optional static dist/
  config.ts       env                    errors.ts  { message, details, referenceId } errors
  store.ts        two separate JSON stores (official / private), atomic writes
  seed.ts         synthetic dataset, generated from src/data/mockDb.ts
  audit.ts        SHA-256 hash-chained, append-only ledger + verification
  auth.ts         sessions (Bearer or HttpOnly cookie), RBAC guard `allow(...roles)`
  domain.ts       task state machine, approvals (ENT-37), notifications, Decide helpers
  routes/front.ts   auth, dashboards, calendar, appointment requests, public, queue, visitors
  routes/work.ts    tasks, Decide, drafts, meetings, notifications, Peace Mode, absence
  routes/office.ts  records, documents, governance, admin, audit, ops, export
  routes/ai.ts      AI gateway POST /ai/chat, GET /ai/status
  routes/private.ts Private Wealth & Life service (separate store + sessions)
```

To move to a real database, replace `store.ts`. Routes only call `db()` / `save()`.

## How the contract's server-side rules are enforced

1. **RBAC on every route** via `allow(...)`, mirroring `src/config/navigation.ts`. Denials return `403` with a `referenceId` and are audited. Officers (ROLE-05/06) only see tasks in their ward or department; anything outside their scope returns `404`, so nothing leaks.
2. **Task state machine** BR-011: `TASK_TRANSITIONS` (`409` on invalid moves, which are also audited). A task can't leave draft without an owner and due date. Officers may only acknowledge, start and submit. Verification-required tasks close only after `verified`.
3. **Nudge cap** BR-013: `409` at the cap. Counters reset each ISO week.
4. **Reserved categories:** only ROLE-01 can approve or decline (`403` for the PA, who escalates instead).
5. **Absence without delegation** BR-049: PA approvals are held (`409`). Only ROLE-01 can start or end absence or record a delegation, so the PA can't authorise themselves.
6. **Every approval and rejection** writes an `ApprovalRecord` (`approvals` in the store) plus an audit event. Session-less, SYSTEM or AI actors are refused.
7. **Sends:** only `approved` drafts can be sent. SMS is blocked unless `config.smsSenderApproved` (the draft is marked `failed`).
8. **Audit ledger:** every write, approval, send, AI call, OFF/RES read and denial is recorded. `POST /audit/verify` recomputes every hash, so editing an old event is detected.
9. **RES documents:** readable only by ROLE-01. Other roles see a masked list entry and get `403`, and the denial is audited.
10. **CSR → Execution:** returns `422` without an approval reference.
11. **Private environment:** `private.json` holds its own data and its own session table. Official tokens get `401` on `/private/*`, and private tokens get `401` on official routes. The only data crossing over is an opaque `{id, title:'Busy', type:'busy', start, end}` calendar block.
12. **Synthetic data only.**

Additional behaviour:
- Declaring an emergency pauses the queue and sends an Interrupt to all official roles.
- Notifications carry a server-side audience, so reception never sees the executive's whispers.
- Public endpoints are rate-limited.
- Deactivating a user ends their sessions.

## Frontend changes (small, all in the data layer)

- `src/services/api.ts`
  - Stores the token after sign-in. Before this, only page reloads set it.
  - On `401`, returns to sign-in.
  - In real-backend mode, mirrors GET results into the local `db` object, so the command palette, Ask, briefing and config flags show server data.
  - Queue pause state follows the server.
- `src/services/ai.ts`: in real-backend mode, `aiChat()` calls `POST /ai/chat`, and keys stay on the server (contract §4).
- `src/data/mockDb.ts`: in real-backend mode, *Reset demo data* calls `POST /demo/reset`.
- `vite.config.ts`: `/api` proxy enabled. `.env.example` is documented.

With `VITE_API_BASE_URL` empty, the frontend behaves exactly as before.

## Known limits / next steps

- Sign-in is the demo role picker. Real credential → MFA/passkey → device binding is still to do.
- Public OTP isn't verified server-side, because the UI doesn't send an OTP yet.
- Uploads (documents, evidence, vault) store metadata only. No multipart, malware scan or ciphertext blobs yet.
- Break-glass requests are recorded and notified, but there is no approve endpoint in the contract yet.
- The private service runs in the same process for the demo. In production, deploy `routes/private.ts` separately with its own identity provider and keys.
