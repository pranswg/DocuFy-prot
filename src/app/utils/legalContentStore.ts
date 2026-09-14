// Centralized Terms & Conditions / Privacy Policy content store.
// The admin edits these from Management -> Terms & Privacy, and every place
// that shows the policies (landing footer, sign up, checkout) reads from here.

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

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: LegalContent | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function read(): LegalContent {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LegalContent>;
      cached = {
        ...structuredClone(defaults),
        ...parsed,
        termsSections:
          Array.isArray(parsed.termsSections) && parsed.termsSections.length > 0
            ? sanitizeSections(parsed.termsSections)
            : sanitizeSections(structuredClone(defaults.termsSections)),
        privacySections:
          Array.isArray(parsed.privacySections) && parsed.privacySections.length > 0
            ? sanitizeSections(parsed.privacySections)
            : sanitizeSections(structuredClone(defaults.privacySections)),
      } as LegalContent;
      return cached;
    }
  } catch {
    // fall through
  }
  return {
    ...structuredClone(defaults),
    termsSections: sanitizeSections(structuredClone(defaults.termsSections)),
    privacySections: sanitizeSections(structuredClone(defaults.privacySections)),
  };
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

export const legalContentStore = {
  getDefaults: () =>
    ({
      ...structuredClone(defaults),
      termsSections: sanitizeSections(structuredClone(defaults.termsSections)),
      privacySections: sanitizeSections(structuredClone(defaults.privacySections)),
    } as LegalContent),
  getContent: read,
  saveContent: save,
  resetContent: () =>
    save(
      {
        ...structuredClone(defaults),
        termsSections: sanitizeSections(structuredClone(defaults.termsSections)),
        privacySections: sanitizeSections(structuredClone(defaults.privacySections)),
      } as LegalContent,
    ),
  subscribe,
};