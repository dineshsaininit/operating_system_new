/**
 * Thin HTTP client for the real backend. Used only when VITE_API_BASE_URL is set.
 * The backend is expected to return JSON and use standard status codes:
 *   401 → session expired (frontend returns to sign-in), 403 → access denied (SCR-61),
 *   409 → conflict / invalid state transition, 422 → validation error { field: message }.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';
export const USE_MOCK = !API_BASE;

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => { authToken = t; };

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown, public referenceId?: string) {
    super(message);
  }
}

export async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    let payload: any = null;
    try { payload = await res.json(); } catch { /* no body */ }
    throw new ApiError(res.status, payload?.message || res.statusText, payload?.details, payload?.referenceId);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
