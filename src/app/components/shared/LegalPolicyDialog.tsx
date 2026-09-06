// Shared Terms & Conditions / Privacy Policy dialog.
// Used at checkout so users can read the policies before agreeing.
// IMPORTANT: the text is the EXISTING draft content (same as the Landing Page /
// Sign Up modals); it is NOT legal-finished copy — the banner marks it as a
// draft pending review and approval.
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { FileText, ShieldCheck } from "lucide-react";

type PolicyTab = "terms" | "privacy";

const TERMS_SECTIONS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. Acceptance of Terms",
    body: (
      <p>
        By accessing and using Docufy PSMS (Print Shop Management System), you
        accept and agree to be bound by the terms and provision of this
        agreement. If you do not agree to abide by the above, please do not use
        this service.
      </p>
    ),
  },
  {
    title: "2. Use License",
    body: (
      <p>
        Permission is granted to use Docufy PSMS for personal and academic
        purposes within Palawan State University. This license shall
        automatically terminate if you violate any of these restrictions and
        may be terminated by Docufy at any time.
      </p>
    ),
  },
  {
    title: "3. Service Description",
    body: (
      <p>
        Docufy PSMS provides printing services for students and faculty of
        Palawan State University. Services include document printing, color
        printing, binding, and related print shop services. We reserve the
        right to modify, suspend, or discontinue any aspect of the service at
        any time.
      </p>
    ),
  },
  {
    title: "4. User Accounts",
    body: (
      <p>
        You are responsible for maintaining the confidentiality of your account
        credentials. You agree to accept responsibility for all activities that
        occur under your account. You must notify us immediately of any
        unauthorized use of your account.
      </p>
    ),
  },
  {
    title: "5. Payment Terms",
    body: (
      <p>
        All payments must be made through the approved payment methods (online
        payment methods or Cash on Pickup). Prices are subject to change
        without notice.
      </p>
    ),
  },
  {
    title: "6. Content Restrictions",
    body: (
      <p>
        Users may not upload, print, or distribute content that is illegal,
        offensive, defamatory, or infringes on intellectual property rights.
        Docufy reserves the right to refuse service for any content deemed
        inappropriate.
      </p>
    ),
  },
  {
    title: "7. Limitation of Liability",
    body: (
      <p>
        Docufy PSMS shall not be liable for any damages arising from the use or
        inability to use the service, including but not limited to printing
        errors, delays, or data loss.
      </p>
    ),
  },
  {
    title: "8. Modifications to Terms",
    body: (
      <p>
        Docufy reserves the right to revise these terms at any time. Continued
        use of the service following any changes constitutes acceptance of
        those changes.
      </p>
    ),
  },
  {
    title: "9. Contact Information",
    body: (
      <p>
        For questions about these Terms and Conditions, please contact us at
        support@docufy.com or visit our office at Room 4, Palawan State
        University - Main Campus, TBI Building, Puerto Princesa City, 5300
        Palawan.
      </p>
    ),
  },
];

const PRIVACY_SECTIONS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. Information We Collect",
    body: (
      <>
        <p>We collect information that you provide directly to us, including:</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Name, email address, and contact information</li>
          <li>University identification details</li>
          <li>Payment information and transaction history</li>
          <li>Documents uploaded for printing</li>
          <li>Order history and preferences</li>
        </ul>
      </>
    ),
  },
  {
    title: "2. How We Use Your Information",
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Process and fulfill your print orders</li>
          <li>Send order confirmations and updates</li>
          <li>Process payments and prevent fraud</li>
          <li>Improve our services and user experience</li>
          <li>Comply with legal obligations</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Data Security",
    body: (
      <p>
        We implement appropriate technical and organizational measures to
        protect your personal information against unauthorized access,
        alteration, disclosure, or destruction. However, no method of
        transmission over the internet is 100% secure.
      </p>
    ),
  },
  {
    title: "4. Document Handling",
    body: (
      <>
        <p>Documents uploaded to our system are:</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>
            Stored securely and accessed only by authorized staff
          </li>
          <li>
            Automatically deleted 30 days after order completion
          </li>
          <li>
            Never shared with third parties without your consent
          </li>
          <li>
            Processed only for the purpose of fulfilling your order
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Cookies and Tracking",
    body: (
      <p>
        We use cookies and similar tracking technologies to track activity on
        our service and hold certain information. You can instruct your browser
        to refuse all cookies or to indicate when a cookie is being sent.
      </p>
    ),
  },
  {
    title: "6. Information Sharing",
    body: (
      <>
        <p>
          We do not sell, trade, or rent your personal information to third
          parties. We may share your information only in the following
          circumstances:
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>With your explicit consent</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights and prevent fraud</li>
          <li>With service providers who assist in our operations</li>
        </ul>
      </>
    ),
  },
  {
    title: "7. Your Rights",
    body: (
      <>
        <p>You have the right to:</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your information</li>
          <li>Export your data in a portable format</li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Data Retention",
    body: (
      <p>
        We retain your personal information only for as long as necessary to
        fulfill the purposes outlined in this privacy policy, unless a longer
        retention period is required by law.
      </p>
    ),
  },
  {
    title: "9. Children's Privacy",
    body: (
      <p>
        Our service is intended for university students and faculty. We do not
        knowingly collect personal information from individuals under 18 years
        of age without parental consent.
      </p>
    ),
  },
  {
    title: "10. Changes to This Policy",
    body: (
      <p>
        We may update our Privacy Policy from time to time. We will notify you
        of any changes by posting the new Privacy Policy on this page and
        updating the "Last updated" date.
      </p>
    ),
  },
  {
    title: "11. Contact Us",
    body: (
      <p>
        If you have any questions about this Privacy Policy, please contact us
        at support@docufy.com.
      </p>
    ),
  },
];

function PolicyBody({ tab }: { tab: PolicyTab }) {
  const sections = tab === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  return (
    <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="font-semibold text-[#10316B] mb-2">{section.title}</h3>
          {section.body}
        </section>
      ))}
    </div>
  );
}

export default function LegalPolicyDialog({
  open,
  onOpenChange,
  initialTab = "terms",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: PolicyTab;
}) {
  const [tab, setTab] = useState<PolicyTab>(initialTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#10316B]">
            {tab === "terms" ? "Terms and Conditions" : "Privacy Policy"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Last updated: April 27, 2026
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800">
          <strong>Draft — for review only.</strong> These policies are a
          placeholder pending client approval and are not yet finalized legal
          text.
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "terms" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("terms")}
            className={
              tab === "terms"
                ? "bg-[#1D73EC] text-white"
                : "border-blue-200 text-[#1D73EC] hover:bg-[#F2F7FF]"
            }
          >
            <FileText className="w-4 h-4 mr-1" /> Terms & Conditions
          </Button>
          <Button
            variant={tab === "privacy" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("privacy")}
            className={
              tab === "privacy"
                ? "bg-[#1D73EC] text-white"
                : "border-blue-200 text-[#1D73EC] hover:bg-[#F2F7FF]"
            }
          >
            <ShieldCheck className="w-4 h-4 mr-1" /> Privacy Policy
          </Button>
        </div>

        <PolicyBody tab={tab} />

        <DialogFooter>
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}