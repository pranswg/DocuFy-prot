// Centralized printing-pricing store.
// Single source of truth for all page prices, paper-size surcharges,
// double-sided savings, and the down-payment threshold. Previously these
// values were hardcoded in new-print-request, walk-in, invoice, and landing
// pages. Admin edits them on /admin/pricing; every consumer subscribes so
// changes propagate live. Persisted to localStorage.

// ============================================================
// LEGACY FLAT MODEL (kept for backward compatibility)
// The original consumers (NewPrintRequest, WalkIn, OrderTracking,
// LandingPage, ContentManagement, UnifiedOrders) still read these fields and
// the default document standard-paper flow. They are preserved untouched so
// nothing breaks while the new multi-dimensional pricing matrix (below) is
// being adopted by the order flows. These rows are still user-editable on the
// admin page under "Legacy Per-Page Rates".
// ============================================================

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

// ============================================================
// NEW MULTI-DIMENSIONAL PRICING MATRIX
// Docufy prices by service type, content type, color option, and paper
// size/material. These nested tables are the new source of truth. The order
// flows pick a service type + content type + color tier and material, then
// index straight into the matrix. Admin edits them on /admin/pricing.
// ============================================================

export type ColorTier = "bw" | "partial" | "full";
export type ContentType = "text" | "textWithImage" | "imageOnly";
export type PaperSizeKey = "short" | "a4" | "long";

export type ServiceType = "document" | "vellum" | "sticker" | "photo";

// Per page: [content][color][size], e.g. document.textWithImage.full.a4 = 6.
export type ContentColorSize = Record<ColorTier, Record<PaperSizeKey, number>>;
export type DocumentMatrix = Record<ContentType, ContentColorSize>;

// Image-only, per page: [color][size].
export type ColorSize = Record<ColorTier, Record<PaperSizeKey, number>>;

// A4 only, per sheet, by color tier.
export type StickerMatrix = Record<ColorTier, number>;

export type PhotoSizeKey = "2R" | "3R" | "4R" | "5R" | "6R" | "A4photo";
export type PhotoSize = { price: number; minQty: number };
export type PhotoMatrix = Record<PhotoSizeKey, PhotoSize>;

export type PricingMatrix = {
  document: DocumentMatrix;
  vellum: ColorSize; // image only
  sticker: StickerMatrix;
  photo: PhotoMatrix;
};

const DEFAULT_MATRIX: PricingMatrix = {
  document: {
    text: {
      bw: { short: 2, a4: 2, long: 2 },
      partial: { short: 3, a4: 3, long: 3 },
      full: { short: 4, a4: 5, long: 6 },
    },
    textWithImage: {
      bw: { short: 3, a4: 3, long: 4 },
      partial: { short: 4, a4: 4, long: 5 },
      full: { short: 5, a4: 6, long: 7 },
    },
    imageOnly: {
      bw: { short: 3, a4: 3, long: 4 },
      partial: { short: 4, a4: 5, long: 6 },
      full: { short: 7, a4: 7, long: 8 },
    },
  },
  vellum: {
    bw: { short: 7, a4: 8, long: 9 },
    partial: { short: 8, a4: 9, long: 10 },
    full: { short: 12, a4: 13, long: 15 },
  },
  sticker: {
    bw: 20,
    partial: 30,
    full: 50,
  },
  photo: {
    "2R": { price: 10, minQty: 6 },
    "3R": { price: 15, minQty: 4 },
    "4R": { price: 20, minQty: 4 },
    "5R": { price: 30, minQty: 2 },
    "6R": { price: 40, minQty: 0 },
    A4photo: { price: 60, minQty: 0 },
  },
};

// Human labels used by the admin page.
export const COLOR_TIER_LABELS: Record<ColorTier, string> = {
  bw: "Black & White",
  partial: "Partially Colored",
  full: "Fully Colored",
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: "Text Only",
  textWithImage: "Text with Image",
  imageOnly: "Image Only",
};

export const PAPER_SIZE_LABELS: Record<PaperSizeKey, string> = {
  short: "Short",
  a4: "A4",
  long: "Long",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  document: "Document Printing (Standard Paper)",
  vellum: "Vellum Paper (Image Only)",
  sticker: "Sticker Paper (A4)",
  photo: "Photo Printing",
};

export const PHOTO_SIZE_LABELS: Record<PhotoSizeKey, string> = {
  "2R": "2R (Wallet Size)",
  "3R": "3R",
  "4R": "4R",
  "5R": "5R",
  "6R": "6R",
  A4photo: "A4",
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
const STORAGE_VERSION = '2.0';

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

const COLOR_TIERS: ColorTier[] = ['bw', 'partial', 'full'];
const PAPER_SIZES: PaperSizeKey[] = ['short', 'a4', 'long'];
const CONTENT_TYPES: ContentType[] = ['text', 'textWithImage', 'imageOnly'];
const PHOTO_SIZE_KEYS: PhotoSizeKey[] = ['2R', '3R', '4R', '5R', '6R', 'A4photo'];

function normalizeColorSize(raw: unknown, fallback: ColorSize): ColorSize {
  if (!raw || typeof raw !== 'object') {
    const out = {} as ColorSize;
    COLOR_TIERS.forEach((t) => {
      out[t] = { ...fallback[t] };
    });
    return out;
  }
  const source = raw as Record<string, unknown>;
  const out = {} as ColorSize;
  COLOR_TIERS.forEach((t) => {
    out[t] = { ...fallback[t] };
    const tier = source[t] as Record<string, unknown> | undefined;
    if (tier && typeof tier === 'object') {
      PAPER_SIZES.forEach((s) => {
        const n = convertToNumber(tier[s]);
        if (!Number.isNaN(n)) out[t][s] = n;
      });
    }
  });
  return out;
}

function normalizeMatrix(raw: unknown): PricingMatrix {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const document = {} as DocumentMatrix;
  CONTENT_TYPES.forEach((ct) => {
    document[ct] = normalizeColorSize(src.document as unknown, DEFAULT_MATRIX.document[ct]);
  });

  const vellum = normalizeColorSize(src.vellum as unknown, DEFAULT_MATRIX.vellum);

  const sticker: StickerMatrix = { ...DEFAULT_MATRIX.sticker };
  const stickerRaw = src.sticker as Record<string, unknown> | undefined;
  if (stickerRaw && typeof stickerRaw === 'object') {
    COLOR_TIERS.forEach((t) => {
      const n = convertToNumber(stickerRaw[t]);
      if (!Number.isNaN(n)) sticker[t] = n;
    });
  }

  const photo: PhotoMatrix = { ...DEFAULT_MATRIX.photo };
  const photoRaw = src.photo as Record<string, unknown> | undefined;
  if (photoRaw && typeof photoRaw === 'object') {
    PHOTO_SIZE_KEYS.forEach((k) => {
      const item = photoRaw[k] as Record<string, unknown> | undefined;
      if (item && typeof item === 'object') {
        const price = convertToNumber(item.price);
        const minQty = convertToNumber(item.minQty);
        photo[k] = {
          price: Number.isNaN(price) ? DEFAULT_MATRIX.photo[k].price : price,
          minQty: Number.isNaN(minQty) ? DEFAULT_MATRIX.photo[k].minQty : Math.max(0, minQty),
        };
      }
    });
  }

  return { document, vellum, sticker, photo };
}

class PricingStore {
  private pricing: PricingValues = { ...DEFAULT_PRICING };
  private matrix: PricingMatrix = normalizeMatrix(undefined);
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
      let parsed: Record<string, unknown> = {};
      if (stored) {
        try {
          parsed = JSON.parse(stored);
        } catch {
          parsed = {};
        }
      }
      if (!stored || storedVersion !== STORAGE_VERSION) {
        this.pricing = { ...DEFAULT_PRICING };
        this.matrix = normalizeMatrix(undefined);
        localStorage.setItem(`${STORAGE_KEY}_version`, STORAGE_VERSION);
        this.save();
      } else {
        this.pricing = mergeStorage(parsed);
        this.matrix = normalizeMatrix(parsed.matrix);
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
      this.pricing = { ...DEFAULT_PRICING };
      this.matrix = normalizeMatrix(undefined);
    }
    this.initialized = true;
  }

  private save(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...this.pricing,
          matrix: this.matrix,
        }),
      );
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

  // Get a deep copy of the full pricing matrix.
  getMatrix(): PricingMatrix {
    this.load();
    return JSON.parse(JSON.stringify(this.matrix)) as PricingMatrix;
  }

  // Admin editing of the matrix. The path selects the exact cell:
  //   document:  [content, tier, size]
  //   vellum:    [tier, size]
  //   sticker:   [tier]
  //   photo:     [size, 'price' | 'minQty']
  updateMatrixCell(
    service: ServiceType,
    path: string[],
    value: number,
  ): boolean {
    if (!Number.isFinite(value) || value < 0) return false;
    const m = JSON.parse(JSON.stringify(this.matrix)) as PricingMatrix;

    try {
      if (service === 'document') {
        if (path.length !== 3) return false;
        const [content, tier, size] = path as [ContentType, ColorTier, PaperSizeKey];
        if (!m.document[content]?.[tier]?.[size]) return false;
        m.document[content][tier][size] = value;
      } else if (service === 'vellum') {
        if (path.length !== 2) return false;
        const [tier, size] = path as [ColorTier, PaperSizeKey];
        if (!m.vellum[tier]?.[size]) return false;
        m.vellum[tier][size] = value;
      } else if (service === 'sticker') {
        if (path.length !== 1) return false;
        const [tier] = path as [ColorTier];
        if (!(tier in m.sticker)) return false;
        m.sticker[tier] = value;
      } else if (service === 'photo') {
        if (path.length !== 2) return false;
        const [size, field] = path as [PhotoSizeKey, 'price' | 'minQty'];
        if (!m.photo[size]) return false;
        if (field === 'price') m.photo[size].price = value;
        else m.photo[size].minQty = Math.max(0, Math.floor(value));
      }
    } catch {
      return false;
    }

    this.matrix = m;
    this.save();
    this.notify();
    return true;
  }

  // Matrix editing by service type with the full table replaced.
  setMatrix(matrix: PricingMatrix): void {
    this.matrix = normalizeMatrix(matrix);
    this.save();
    this.notify();
  }

  // Reset all values (legacy + matrix) back to the system defaults.
  resetPricing(): void {
    this.pricing = { ...DEFAULT_PRICING };
    this.matrix = normalizeMatrix(undefined);
    this.save();
    this.notify();
  }
}

// Matrix price lookup helpers used by the order flows.

// Map a gallery of raw color-mode values onto the matrix color tier.
export function resolveColorTier(colorMode: 'bw' | 'colored', colorPct?: number): ColorTier {
  if (colorMode === 'bw') return 'bw';
  const pct = typeof colorPct === 'number' ? colorPct : 100;
  return pct > 50 ? 'full' : 'partial';
}

export function getPriceFromMatrix(
  matrix: PricingMatrix,
  service: ServiceType,
  input: {
    contentType?: ContentType; // used by document
    colorTier: ColorTier;
    sizeKey?: PaperSizeKey; // unused for sticker
    photoSize?: PhotoSizeKey; // photo only
    field?: 'price' | 'minQty'; // photo only
  },
): number {
  if (service === 'document') {
    const ct = input.contentType || 'text';
    const size = input.sizeKey || 'a4';
    return matrix.document[ct]?.[input.colorTier]?.[size] ?? 0;
  }
  if (service === 'vellum') {
    const size = input.sizeKey || 'a4';
    return matrix.vellum[input.colorTier]?.[size] ?? 0;
  }
  if (service === 'sticker') {
    return matrix.sticker[input.colorTier] ?? 0;
  }
  if (service === 'photo') {
    const size = input.photoSize || 'A4photo';
    const item = matrix.photo[size];
    if (!item) return 0;
    return input.field === 'minQty' ? item.minQty : item.price;
  }
  return 0;
}

// Map a raw paper-size string (as stored on a file) onto a matrix paper-size key.
// Fallback: sizes without a dedicated column (letter/legal/folio/a3) map to the
// nearest standard column.
export function mapPaperSizeKey(paperSize?: string): PaperSizeKey {
  const size = (paperSize || 'a4').toLowerCase();
  if (size === 'short') return 'short';
  if (size === 'long' || size === 'legal' || size === 'folio') return 'long';
  return 'a4'; // a4, letter, a3 and unknown sizes default to the a4 column
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