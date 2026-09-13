// Centralized landing-page content store.
// All editable text on the landing page is read from / written to this store
// (backed by localStorage "landing_content"). The LandingPage and the admin
// LandingPageEditor both import from here so they stay in sync.

export interface ServiceCardContent {
  title: string;
  description: string;
  details: Array<{ label: string; value: string }>;
  badge?: string;
}

export interface LandingPageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  feature1: string;
  feature1Sub: string;
  feature2: string;
  feature2Sub: string;
  feature3: string;
  feature3Sub: string;
  shopHours: Array<{ label: string; hours: string }>;
  hoursNote: string;
  locationLines: string[];
  aboutTitle: string;
  aboutSubtitle: string;
  aboutBody: string;
  serviceCards: ServiceCardContent[];
}

const STORAGE_KEY = "landing_content";

const defaults: LandingPageContent = {
  heroTitle: "Print, Track, Succeed",
  heroSubtitle: "Your Printing Companion",
  heroDescription:
    "Upload, print, and track your documents with ease. Professional printing services designed for students and faculty.",
  feature1: "Upload documents",
  feature1Sub: "instantly",
  feature2: "Real-time",
  feature2Sub: "order tracking",
  feature3: "Secure payment",
  feature3Sub: "verification.",
  shopHours: [
    { label: "Monday - Friday", hours: "9:00 AM - 5:00 PM" },
    { label: "Saturday - Sunday", hours: "Closed" },
  ],
  hoursNote: "No noon break",
  locationLines: [
    "Palawan State University - Main Campus",
    "Room 4, TBI Building",
    "Puerto Princesa City, 5300 Palawan",
  ],
  aboutTitle: "About Docufy",
  aboutSubtitle: "Your printing companion",
  aboutBody:
    "Docufy is a modern printing management system designed to make document printing and tracking easier for students, faculty, and staff. With our user-friendly platform, you can upload documents, place print orders, track your requests in real-time, and manage everything from a single dashboard. We're committed to providing fast, reliable, and affordable printing services to the academic community.",
  serviceCards: [
    {
      title: "Black & White Printing",
      description: "Standard plain-paper printing for everyday text documents.",
      details: [
        { label: "Paper sizes", value: "Short \u00b7 A4 \u00b7 Long" },
        { label: "Content", value: "Text \u00b7 Text + Image \u00b7 Image" },
      ],
    },
    {
      title: "Color Printing",
      description: "Full-color plain-paper printing for documents and presentations.",
      details: [
        { label: "Paper sizes", value: "Short \u00b7 A4 \u00b7 Long" },
        { label: "Color modes", value: "Partial \u00b7 Full" },
      ],
      badge: "POPULAR",
    },
    {
      title: "Photo, Vellum & Sticker",
      description: "Photo prints, vellum paper, and A4 sticker sheets.",
      details: [
        { label: "Photo sizes", value: "2R \u00b7 3R \u00b7 4R \u00b7 5R \u00b7 6R \u00b7 A4" },
        { label: "Materials", value: "Vellum \u00b7 Sticker (A4)" },
      ],
    },
  ],
};

// ─── Migration helpers ────────────────────────────────────────────────────────
// Migrate legacy flat hours / location fields that older saved blobs carry.

const LEGACY_HOURS_MIGRATION: Record<string, [string, string]> = {
  hoursMonFri: ["8:00 AM - 6:00 PM", "9:00 AM - 5:00 PM"],
  hoursMonFri6: ["9:00 AM - 6:00 PM", "9:00 AM - 5:00 PM"],
  hoursSat: ["9:00 AM - 4:00 PM", "Closed"],
  hoursSat6: ["9:00 AM - 6:00 PM", "Closed"],
};

function migrateLegacy(parsed: Record<string, any>): Partial<LandingPageContent> {
  const result: Record<string, any> = { ...parsed };

  // Legacy feature title migration (full phrase → title + subtitle split)
  if (typeof result.feature1Sub !== "string") {
    for (const n of [1, 2, 3] as const) {
      const sub = defaults[`feature${n}Sub` as keyof LandingPageContent] as string;
      const match = sub.replace(/\.$/, "");
      const title = String(result[`feature${n}`] || "");
      result[`feature${n}`] = title.includes(match)
        ? title.replace(match, "").trim()
        : title;
      result[`feature${n}Sub`] = sub;
    }
  }

  // Legacy hours values → current schedule
  for (const [key, [oldVal, newVal]] of Object.entries(LEGACY_HOURS_MIGRATION)) {
    const realKey = key.replace(/6$/, "");
    if (String(result[realKey]) === oldVal) result[realKey] = newVal;
  }

  // Legacy flat hours → structured shopHours
  if (!Array.isArray(result.shopHours)) {
    const satSun =
      String(result.hoursSat).toLowerCase() === String(result.hoursSun || "").toLowerCase()
        ? [{ label: "Saturday - Sunday", hours: String(result.hoursSat || "Closed") }]
        : [
            { label: "Saturday", hours: String(result.hoursSat || "Closed") },
            { label: "Sunday", hours: String(result.hoursSun || "Closed") },
          ];
    result.shopHours = [
      { label: "Monday - Friday", hours: String(result.hoursMonFri || "") },
      ...satSun,
    ].filter((row: any) => row.hours !== "");
    result.hoursNote = "No noon break";
  }

  // Legacy flat location → structured locationLines
  if (!Array.isArray(result.locationLines)) {
    result.locationLines = [
      result.locationCampus,
      result.locationRoom,
      result.locationBuilding,
    ].filter(Boolean);
  }

  return result;
}

// ─── Store ────────────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
let cached: LandingPageContent | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function read(): LandingPageContent {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateLegacy(parsed);
      cached = { ...defaults, ...migrated } as LandingPageContent;
      // Ensure serviceCards has all 3 cards
      while (cached!.serviceCards.length < defaults.serviceCards.length) {
        const idx = cached!.serviceCards.length;
        cached!.serviceCards.push(defaults.serviceCards[idx]);
      }
      return cached!;
    }
  } catch {
    // fall through
  }
  return { ...defaults };
}

function save(content: LandingPageContent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch {
    // Persisting to localStorage can fail (quota exceeded, private mode,
    // storage disabled). On failure the in-memory cache is intentionally left
    // untouched so every reader stays consistent with what is actually stored,
    // and the error is re-thrown so the caller can surface a real message
    // instead of the change silently appearing to not apply.
    throw new Error("Could not persist landing page content to browser storage.");
  }
  cached = content;
  notify();
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // Cross-tab sync via storage event
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null; // invalidate so read() re-parses
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export const landingContentStore = {
  getDefaults: () => structuredClone(defaults),
  getContent: read,
  saveContent: save,
  resetContent: () => save({ ...defaults }),
  subscribe,
};
