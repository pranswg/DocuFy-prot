import { toast } from 'sonner';

// Normalize any thrown value into a readable human message. Supabase library
// errors surface as Error instances whose message embeds the PostgREST text;
// auth errors are plain strings/maps. Never throw on inspection.
export function getErrorMessage(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.';
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error_description === 'string' && obj.error_description) return obj.error_description;
    if (typeof obj.error === 'string' && obj.error) return obj.error;
    if (typeof obj.details === 'string' && obj.details) return obj.details;
    if (typeof obj.hint === 'string' && obj.hint) return obj.hint;
  }
  return 'Something went wrong. Please try again.';
}

// Log a DB failure and surface it as a toast. `action` names the operation so
// the console trail is greppable.
export function showDbError(action: string, err: unknown): void {
  const message = getErrorMessage(err);
  console.error(`[db:${action}]`, err);
  toast.error(message);
}

// Heuristic for "the request was rejected by Row Level Security" — used to
// decide whether a best-effort background operation should degrade quietly.
export function isRlsDenied(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('violates row-level security') ||
    msg.includes('new row violates') ||
    msg.includes('security barrier') ||
    msg.includes('is not allowed')
  );
}