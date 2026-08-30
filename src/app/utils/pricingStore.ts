// Centralized printing-pricing store.
// Single source of truth for all page prices, paper-size surcharges,
// double-sided savings, and the down-payment threshold. Previously these
// values were hardcoded in new-print-request, walk-in, invoice, and landing
// pages. Admin edits them on /admin/pricing; every consumer subscribes so
// changes propagate live. Persisted to localStorage.

export type PricingValues = {
  bw: number; // Black & White — per page
  colorLow: number; // Colored, ≤50% of the page colored — per page
  colorHigh: number; // Colored, >50% of the page colored (or flat colored) — per page
  sizeLongLegalFolio: number; // per-page surcharge for Long / Folio / Legal
  sizeA3: number; // per-page surcharge for A3
  duplexSavings: number; // per-page savings for double-sided printing
  downPaymentThreshold: number; // order total at/above which a down payment is required
};

// Current system behavior (formerly hardcoded) is the default.
const DEFAULT_PRICING: PricingValues = {
  bw: 1,
  colorLow: 3,
  colorHigh: 5,
  sizeLongLegalFolio: 11,
  sizeA3: 1.5,
  duplexSavings: 0.5,
  downPaymentThreshold: 50,
};

export type PricingCategory =
  | 'Color & Black and White'
  | 'Paper Size'
  | 'Printing Options'
  | 'Order Rules';

export type PricingItemSpec = {
  id: keyof PricingValues;
  label: string;
  description: string;
  category: PricingCategory;
  prefix?: string; // display prefix, e.g. "+" or "–" (savings)
  unit: string; // display unit, e.g. "/ page" or "₱"
  editable: boolean;
};

// Metadata for the admin UI. Ordering here = ordering on the page.
export const PRICING_ITEMS: PricingItemSpec[] = [
  {
    id: 'bw',
    label: 'Black & White',
    description: 'Per-page price for black and white printing.',
    category: 'Color & Black and White',
    unit: '/ page',
    editable: true,
  },
  {
    id: 'colorLow',
    label: 'Colored (up to 50% color)',
    description: 'Per-page price when a page is at most 50% colored (color analysis).',
    category: 'Color & Black and White',
    unit: '/ page',
    editable: true,
  },
  {
    id: 'colorHigh',
    label: 'Colored (over 50% color)',
    description: 'Per-page price when a page is more than 50% colored, or when colored printing is chosen without color analysis.',
    category: 'Color & Black and White',
    unit: '/ page',
    editable: true,
  },
  {
    id: 'sizeLongLegalFolio',
    label: 'Long / Folio / Legal',
    description: 'Per-page surcharge for larger paper sizes.',
    category: 'Paper Size',
    prefix: '+',
    unit: '/ page',
    editable: true,
  },
  {
    id: 'sizeA3',
    label: 'A3',
    description: 'Per-page surcharge for A3 paper size.',
    category: 'Paper Size',
    prefix: '+',
    unit: '/ page',
    editable: true,
  },
  {
    id: 'duplexSavings',
    label: 'Double-Sided',
    description: 'Per-page savings applied when double-sided printing is selected.',
    category: 'Printing Options',
    prefix: '–',
    unit: '/ page',
    editable: true,
  },
  {
    id: 'downPaymentThreshold',
    label: 'Down Payment Threshold',
    description: 'Order totals at or above this amount require a down payment.',
    category: 'Order Rules',
    unit: '₱',
    editable: true,
  },
];

type Subscriber = () => void;

const STORAGE_KEY = 'docufy_pricing_v1';
const STORAGE_VERSION = '1.0';

function convertToNumber(value: unknown): number {
  return typeof value === 'number' && isFinite(value) ? value : NaN;
}

function normalize(raw: unknown): PricingValues {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PRICING };
  const source = raw as Record<string, unknown>;
  const values: Partial<PricingValues> = {};
  (Object.keys(DEFAULT_PRICING) as Array<keyof PricingValues>).forEach((key) => {
    const n = convertToNumber(source[key]);
    values[key] = Number.isNaN(n) ? DEFAULT_PRICING[key] : n;
  });
  return values as PricingValues;
}

function mergeStorage(stored: unknown): PricingValues {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_PRICING };
  const source = stored as Record<string, unknown>;
  const values: Partial<PricingValues> = {};
  (Object.keys(DEFAULT_PRICING) as Array<keyof PricingValues>).forEach((key) => {
    const n = convertToNumber(source[key]);
    values[key] = Number.isNaN(n) ? DEFAULT_PRICING[key] : n;
  });
  return values as PricingValues;
}

class PricingStore {
  private pricing: PricingValues = { ...DEFAULT_PRICING };
  private subscribers: Set<Subscriber> = new Set();
  private initialized = false;

  constructor() {
    this.load();
  }

  private load(): void {
    if (this.initialized) return;
    try {
      const storedVersion = localStorage.getItem(`${STORAGE_KEY}_version`);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || storedVersion !== STORAGE_VERSION) {
        this.pricing = { ...DEFAULT_PRICING };
        localStorage.setItem(`${STORAGE_KEY}_version`, STORAGE_VERSION);
        this.save();
      } else {
        this.pricing = mergeStorage(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
      this.pricing = { ...DEFAULT_PRICING };
    }
    this.initialized = true;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pricing));
    } catch (error) {
      console.error('Failed to save pricing:', error);
    }
  }

  private notify(): void {
    this.subscribers.forEach((listener) => listener());
  }

  subscribe(listener: Subscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  getPricing(): PricingValues {
    this.load();
    return { ...this.pricing };
  }

  // Admin editing: a single value at a time (from the pricing page dialog).
  updatePricing(key: keyof PricingValues, value: number): boolean {
    if (!(key in DEFAULT_PRICING) || !Number.isFinite(value) || value < 0) {
      return false;
    }
    this.pricing = { ...this.pricing, [key]: value };
    this.save();
    this.notify();
    return true;
  }

  // Reset all values back to the system defaults.
  resetPricing(): void {
    this.pricing = { ...DEFAULT_PRICING };
    this.save();
    this.notify();
  }
}

export const pricingStore = new PricingStore();

/**
 * Compute the per-page price for a sheet based on the shared pricing model.
 * Replicates the former hardcoded formula used by both new-print-request and
 * walk-in flows so they stay in lockstep.
 */
export function calcPagePrice(
  pricing: PricingValues,
  input: {
    colorMode: 'bw' | 'colored';
    colorPct?: number; // per-page color percentage; >50 → colorHigh, 1..50 → colorLow, 0/undefined+BW → bw
    paperSize?: string;
    twoSided?: string;
  },
): number {
  let price: number;
  if (input.colorMode === 'colored') {
    const pct = typeof input.colorPct === 'number' ? input.colorPct : 100;
    price = pct > 50 ? pricing.colorHigh : pct > 0 ? pricing.colorLow : pricing.bw;
  } else {
    price = pricing.bw;
  }

  const size = (input.paperSize || 'a4').toLowerCase();
  if (size === 'long' || size === 'folio' || size === 'legal') {
    price += pricing.sizeLongLegalFolio;
  } else if (size === 'a3') {
    price += pricing.sizeA3;
  }

  if (input.twoSided === 'yes') {
    price -= pricing.duplexSavings;
  }

  return Math.max(price, 0);
}

// Shared formatting helper so every consumer labels prices identically.
export function formatPrice(value: number): string {
  return `₱${value.toFixed(2)}`;
}