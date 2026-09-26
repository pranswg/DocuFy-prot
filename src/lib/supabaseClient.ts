import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Resolves once the auth client has finished restoring any persisted session
// (or confirmed there is none). Data stores `await` this before their first DB
// fetch so that fetch never races the session restore and goes out anonymous —
// the root cause of Supabase data intermittently appearing/disappearing on
// reload (notably in fresh/incognito browser contexts with empty storage).
export const authReady: Promise<void> = (async () => {
  try {
    await supabase.auth.getSession();
  } catch (err) {
    console.warn('[authReady] session restore failed — proceeding anonymous:', err);
  }
})();