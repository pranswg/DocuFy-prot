// Centralized Terms & Conditions / Privacy Policy content store.
// The admin edits these from Management -> Terms & Privacy, and every place
// that shows the policies (landing footer, sign up, checkout) reads from here.
//
// Supabase-backed facade: the localStorage mirror stays as the offline /
// anonymous fallback, but the DB `legal_policies` rows (one per policy type)
// now drive real cross-device edits — an admin saving on any device updates
// every page that renders the policies via realtime. Reads are open to
// everyone (the public landing + auth screens render these anonymously);
// writes are staff/admin only.

import { subscribeTableChanges } from '../../lib/db/hooks';
import { isRlsDenied, showDbError } from '../../lib/db/errors';
import { authReady, supabase } from '../../lib/supabaseClient';
import { fetchLegalPolicies, saveLegalPolicy } from '../../lib/db/siteContentRepo';
import type { LegalPolicyInsert, LegalPolicyRow } from '../../lib/db/types';

export interface LegalSection {
  title: string;
  body: string;
}

export interface LegalContent {
  termsTitle: string;
  termsLastUpdated: string;
  termsSections: LegalSection[];
  privacyTitle: string;
  privacyLastUpdated: string;
  privacySections: LegalSection[];
}

const STORAGE_KEY = "docufy_legal_content_v1";

type PolicyType = 'terms' | 'privacy';

// Sections are numbered automatically by their position (1, 2, 3…), so the
// stored title never needs a "N. " prefix typed into it. If a value sneaks a
// leading number in (legacy data, manual edit), strip it so it does not
// double up with the auto number when rendered.
export function stripSectionNumber(title: string): string {
  return title.replace(/^\s*\d+\s*[.)-]?\s+/, "").trim();
}

function sanitizeSections(
  sections: { title: string; body: string }[],
): LegalSection[] {
  return sections.map((s) => ({ ...s, title: stripSectionNumber(s.title) }));
}

// Body text uses a small plain-text format:
//   * paragraphs separated by a blank line
//   * a line starting with "- " becomes a bullet list item
// This is what the admin editor presents and what the readers render.
const defaults: LegalContent = {
  termsTitle: "Terms and Conditions",
  termsLastUpdated: "April 27, 2026",
  termsSections: [
    {
      title: "1. Acceptance of Terms",
      body: "By accessing and using Docufy PSMS (Print Shop Management System), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.",
    },
    {
      title: "2. Use License",
      body: "Permission is granted to use Docufy PSMS for personal and academic purposes within Palawan State University. This license shall automatically terminate if you violate any of these restrictions and may be terminated by Docufy at any time.",
    },
    {
      title: "3. Service Description",
      body: "Docufy PSMS provides printing services for students and faculty of Palawan State University. Services include document printing, color printing, binding, and related print shop services. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.",
    },
    {
      title: "4. User Accounts",
      body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.",
    },
    {
      title: "5. Payment Terms",
      body: "All payments must be made through the approved payment methods (online payment methods or Cash on Pickup). Prices are subject to change without notice.",
    },
    {
      title: "6. Content Restrictions",
      body: "Users may not upload, print, or distribute content that is illegal, offensive, defamatory, or infringes on intellectual property rights. Docufy reserves the right to refuse service for any content deemed inappropriate.",
    },
    {
      title: "7. Limitation of Liability",
      body: "Docufy PSMS shall not be liable for any damages arising from the use or inability to use the service, including but not limited to printing errors, delays, or data loss.",
    },
    {
      title: "8. Modifications to Terms",
      body: "Docufy reserves the right to revise these terms at any time. Continued use of the service following any changes constitutes acceptance of those changes.",
    },
    {
      title: "9. Contact Information",
      body: "For questions about these Terms and Conditions, please contact us at printwithdocufy@gmail.com or visit our office at Room 4, Palawan State University - Main Campus, TBI Building, Puerto Princesa City, 5300 Palawan.",
    },
  ],
  privacyTitle: "Privacy Policy",
  privacyLastUpdated: "April 27, 2026",
  privacySections: [
    {
      title: "1. Information We Collect",
      body: "We collect information that you provide directly to us, including:\n\n- Name, email address, and contact information\n- University identification details\n- Payment information and transaction history\n- Documents uploaded for printing\n- Order history and preferences",
    },
    {
      title: "2. How We Use Your Information",
      body: "We use the information we collect to:\n\n- Process and fulfill your print orders\n- Send order confirmations and updates\n- Process payments and prevent fraud\n- Improve our services and user experience\n- Comply with legal obligations",
    },
    {
      title: "3. Data Security",
      body: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.",
    },
    {
      title: "4. Document Handling",
      body: "Documents uploaded to our system are:\n\n- Stored securely and accessed only by authorized staff\n- Automatically deleted 30 days after order completion\n- Never shared with third parties without your consent\n- Processed only for the purpose of fulfilling your order",
    },
    {
      title: "5. Cookies and Tracking",
      body: "We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.",
    },
    {
      title: "6. Information Sharing",
      body: "We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:\n\n- With your explicit consent\n- To comply with legal obligations\n- To protect our rights and prevent fraud\n- With service providers who assist in our operations",
    },
    {
      title: "7. Your Rights",
      body: "You have the right to:\n\n- Access your personal information\n- Correct inaccurate data\n- Request deletion of your data\n- Object to processing of your information\n- Export your data in a portable format",
    },
    {
      title: "8. Data Retention",
      body: "We retain your personal information only for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law.",
    },
    {
      title: "9. Children's Privacy",
      body: "Our service is intended for university students and faculty. We do not knowingly collect personal information from individuals under 18 years of age without parental consent.",
    },
    {
      title: "10. Changes to This Policy",
      body: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.',
    },
    {
      title: "11. Contact Us",
      body: "If you have any questions about this Privacy Policy, please contact us at printwithdocufy@gmail.com.",
    },
  ],
};

function defaultClone(): LegalContent {
  return {
    ...structuredClone(defaults),
    termsSections: sanitizeSections(structuredClone(defaults.termsSections)),
    privacySections: sanitizeSections(structuredClone(defaults.privacySections)),
  } as LegalContent;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: LegalContent | null = null;
let hydrating = false;
// Row ids learned at hydrate so an admin edit targets the existing DB row.
const remotePolicyIds: Partial<Record<PolicyType, string>> = {};

function notify() {
  listeners.forEach((fn) => fn());
}

function read(): LegalContent {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LegalContent>;
      cached = mergeInto(defaultClone(), parsed);
      return cached;
    }
  } catch {
    // fall through
  }
  return defaultClone();
}

// Spread a partial onto the defaults, guarding the sections arrays so a
// missing/empty side falls back to the defaults.
function mergeInto(base: LegalContent, part: Partial<LegalContent>): LegalContent {
  return {
    ...base,
    ...part,
    termsSections:
      Array.isArray(part.termsSections) && part.termsSections.length > 0
        ? sanitizeSections(part.termsSections)
        : base.termsSections,
    privacySections:
      Array.isArray(part.privacySections) && part.privacySections.length > 0
        ? sanitizeSections(part.privacySections)
        : base.privacySections,
  } as LegalContent;
}

// ── legal_policies row ↔ store mapping ───────────────────────────────────────
// The `content` column holds a JSON string of `{ sections, lastUpdated }`
// (kept as a string per the schema). Legacy plain-text content (older seed,
// hand-edited) falls back to a single section with the policy title.

function encodePolicyContent(sections: LegalSection[], lastUpdated: string): string {
  return JSON.stringify({ sections, lastUpdated });
}

function decodePolicyContent(json: string | null, fallbackTitle: string): {
  sections: LegalSection[];
  lastUpdated: string;
} {
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        sections?: { title: string; body: string }[];
        lastUpdated?: string;
      } | null;
      if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        return {
          sections: sanitizeSections(parsed.sections),
          lastUpdated: typeof parsed.lastUpdated === 'string' ? parsed.lastUpdated : '',
        };
      }
    } catch {
      // not JSON — legacy plain text below
    }
  }
  return {
    sections: [{ title: fallbackTitle, body: json ?? '' }],
    lastUpdated: '',
  };
}

function applyPolicyRow(base: LegalContent, row: LegalPolicyRow): LegalContent {
  const type = row.policy_type as PolicyType;
  if (type !== 'terms' && type !== 'privacy') return base;
  const { sections, lastUpdated } = decodePolicyContent(row.content, row.title);
  const next: LegalContent = { ...base };
  if (type === 'terms') {
    next.termsTitle = row.title;
    next.termsLastUpdated = lastUpdated || row.updated_at;
    next.termsSections = sections;
  } else {
    next.privacyTitle = row.title;
    next.privacyLastUpdated = lastUpdated || row.updated_at;
    next.privacySections = sections;
  }
  return next;
}

// Best-effort mirror write that never throws (used by hydration); the public
// `save` below keeps its throw-on-failure contract for the editor.
function writeMirror(content: LegalContent): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch {
    return false;
  }
  cached = content;
  return true;
}

function save(content: LegalContent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch {
    throw new Error("Could not persist legal content to browser storage.");
  }
  cached = content;
  notify();
}

// Pull the latest snapshot from Supabase. Each policy type wins when its row
// exists (a partially-seeded table overlays only what exists); an
// empty/unreachable backend keeps the local mirror.
async function hydrate(): Promise<void> {
  if (hydrating) return;
  hydrating = true;
  await authReady;
  try {
    const rows = await fetchLegalPolicies();
    if (rows.length === 0) return; // not seeded yet — keep the local mirror
    let next = defaultClone();
    const ids: Partial<Record<PolicyType, string>> = {};
    let changed = false;
    for (const row of rows) {
      const type = row.policy_type as PolicyType;
      if (type !== 'terms' && type !== 'privacy') continue;
      ids[type] = row.id;
      next = applyPolicyRow(next, row);
      changed = true;
    }
    if (!changed) return;
    Object.assign(remotePolicyIds, ids);
    writeMirror(next);
    notify();
  } catch (err) {
    console.warn('[legal-content] hydration kept local data:', err);
  } finally {
    hydrating = false;
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// Best-effort push of both policy rows. RLS-denied writes degrade quietly;
// every other failure is surfaced. Row ids learned at hydrate (or adopted from
// a fresh insert) let each subsequent save update in place.
async function syncRemote(content: LegalContent): Promise<void> {
  const userId = await currentUserId();
  const pushes: Array<{ type: PolicyType; id?: string; row: LegalPolicyInsert }> = [
    {
      type: 'terms',
      id: remotePolicyIds.terms,
      row: {
        policy_type: 'terms',
        title: content.termsTitle,
        content: encodePolicyContent(content.termsSections, content.termsLastUpdated),
        version: 'v1',
        published: true,
        updated_by: userId,
      },
    },
    {
      type: 'privacy',
      id: remotePolicyIds.privacy,
      row: {
        policy_type: 'privacy',
        title: content.privacyTitle,
        content: encodePolicyContent(content.privacySections, content.privacyLastUpdated),
        version: 'v1',
        published: true,
        updated_by: userId,
      },
    },
  ];
  for (const push of pushes) {
    try {
      if (!push.id) {
        const newId = await saveLegalPolicy({ row: push.row });
        if (newId) remotePolicyIds[push.type] = newId;
      } else {
        await saveLegalPolicy({ id: push.id, row: push.row });
      }
    } catch (err) {
      if (!isRlsDenied(err)) showDbError('legal-content.update', err);
      else console.warn('[legal-content] not synced (RLS):', err);
    }
  }
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null;
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

// Backend realtime: an admin editing the policies from any device refreshes
// every page that renders them.
subscribeTableChanges('legal_policies', () => {
  void hydrate();
});

void hydrate();

export const legalContentStore = {
  getDefaults: defaultClone,
  getContent: read,
  saveContent: (content: LegalContent) => {
    save(content);
    void syncRemote(content);
  },
  resetContent: () => {
    const reset = defaultClone();
    save(reset);
    void syncRemote(reset);
  },
  refreshFromBackend: () => hydrate(),
  subscribe,
};