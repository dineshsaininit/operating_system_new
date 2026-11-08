import type { ErrorRequestHandler } from 'express';
import { uid } from './util.js';

/** Error with an HTTP status. The body follows the contract: { message, details?, referenceId? }. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

export function fail(status: number, message: string, details?: Record<string, string>): never {
  throw new HttpError(status, message, details);
}

/** 422 helper: require non-empty string fields in a body. */
export function requireFields(body: Record<string, unknown> | undefined, ...fields: string[]) {
  const missing: Record<string, string> = {};
  for (const f of fields) {
    const v = body?.[f];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) missing[f] = 'Required';
  }
  if (Object.keys(missing).length) fail(422, `Missing required field(s): ${Object.keys(missing).join(', ')}`, missing);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const referenceId = uid('REF');
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, details: err.details, referenceId });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Malformed JSON body', referenceId });
    return;
  }
  console.error(`[${referenceId}]`, err);
  res.status(500).json({ message: 'Internal server error', referenceId });
};
