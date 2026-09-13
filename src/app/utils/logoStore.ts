// Centralized brand-logo store.
// The logo shown across the whole system (sidebar, headers, landing page,
// auth screens) is read from / written to this store (backed by localStorage
// "docufy_logo_v1"). The upload is an optional data URL override; when none is
// set, the bundled default Docufy logo is used. Reset simply clears the
// override, so the default is always available again.

import defaultLogo from "../../assets/32cd46dac3d06839e0db69b6c6ad22c9a8ac17a6.png";

const STORAGE_KEY = "docufy_logo_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

function read(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // fall through
  }
  return defaultLogo;
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // Cross-tab sync via storage event
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export const logoStore = {
  getLogo: read,
  hasCustomLogo: () => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  },
  setLogo: (dataUrl: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, dataUrl);
    } catch {
      // Quota exceeded etc. — keep default
    }
    notify();
  },
  resetLogo: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    notify();
  },
  subscribe,
};