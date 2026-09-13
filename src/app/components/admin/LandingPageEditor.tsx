import React, { useRef, useState } from "react";
import {
  MonitorPlay,
  Save,
  RotateCcw,
  ExternalLink,
  X,
  Plus,
  Trash2,
  Eye,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import LandingPage from "../LandingPage";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  landingContentStore,
  type LandingPageContent,
  type ServiceCardContent,
} from "../../utils/landingContentStore";
import { useLogo } from "../../hooks/useLogo";
import { logoStore } from "../../utils/logoStore";
import { ConfirmationDialog } from "../ui/confirmation-dialog";

const sectionCards = [
  { id: "logo", label: "Brand Logo", icon: <Eye className="w-4 h-4" /> },
  { id: "hero", label: "Hero Section", icon: <Eye className="w-4 h-4" /> },
  { id: "features", label: "Feature Highlights", icon: <Eye className="w-4 h-4" /> },
  { id: "services", label: "Services & Pricing Cards", icon: <Eye className="w-4 h-4" /> },
  { id: "shop-info", label: "Shop Info", icon: <Eye className="w-4 h-4" /> },
  { id: "about", label: "About Docufy", icon: <Eye className="w-4 h-4" /> },
];

function EditorCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1.5"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5"
        />
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function LandingPageEditor() {
  const [content, setContent] = useState<LandingPageContent>(() =>
    landingContentStore.getContent(),
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const logo = useLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showLogoResetConfirm, setShowLogoResetConfirm] = useState(false);

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP, SVG, or GIF).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo image is too large. Please use an image under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      logoStore.setLogo(reader.result as string);
      toast.success("Logo updated. It now appears across the whole system.");
    };
    reader.onerror = () => toast.error("Could not read the logo file.");
    reader.readAsDataURL(file);
  };

  const handleLogoReset = () => {
    logoStore.resetLogo();
    setShowLogoResetConfirm(false);
    toast.success("Logo reset to the default Docufy logo.");
  };

  const patch = (partial: Partial<LandingPageContent>) => {
    setContent((prev) => ({ ...prev, ...partial }));
  };

  const patchServiceCard = (index: number, partial: Partial<ServiceCardContent>) => {
    setContent((prev) => {
      const serviceCards = prev.serviceCards.map((card, i) =>
        i === index ? { ...card, ...partial } : card,
      );
      return { ...prev, serviceCards };
    });
  };

  const patchServiceDetail = (
    index: number,
    detailIndex: number,
    field: "label" | "value",
    value: string,
  ) => {
    setContent((prev) => {
      const serviceCards = prev.serviceCards.map((card, i) => {
        if (i !== index) return card;
        const details = card.details.map((d, j) =>
          j === detailIndex ? { ...d, [field]: value } : d,
        );
        return { ...card, details };
      });
      return { ...prev, serviceCards };
    });
  };

  const patchShopHours = (index: number, field: "label" | "hours", value: string) => {
    setContent((prev) => {
      const shopHours = prev.shopHours.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      );
      return { ...prev, shopHours };
    });
  };

  const addShopHour = () => {
    setContent((prev) => ({
      ...prev,
      shopHours: [...prev.shopHours, { label: "", hours: "" }],
    }));
  };

  const removeShopHour = (index: number) => {
    setContent((prev) => ({
      ...prev,
      shopHours: prev.shopHours.filter((_, i) => i !== index),
    }));
  };

  const patchLocationLine = (index: number, value: string) => {
    setContent((prev) => ({
      ...prev,
      locationLines: prev.locationLines.map((line, i) => (i === index ? value : line)),
    }));
  };

  const addLocationLine = () => {
    setContent((prev) => ({
      ...prev,
      locationLines: [...prev.locationLines, ""],
    }));
  };

  const removeLocationLine = (index: number) => {
    setContent((prev) => ({
      ...prev,
      locationLines: prev.locationLines.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    setShowSaveConfirm(false);
    try {
      landingContentStore.saveContent(content);
      toast.success("Changes saved successfully. The landing page is now updated.");
    } catch {
      toast.error("Could not save your changes to browser storage. Please try again.");
    }
  };

  const handleReset = () => {
    try {
      landingContentStore.resetContent();
      setContent(landingContentStore.getContent());
      setShowResetConfirm(false);
      toast.success("Landing page content reset to defaults.");
    } catch {
      setShowResetConfirm(false);
      toast.error("Could not reset landing page content. Please try again.");
    }
  };

  return (
    <Layout menuItems={adminMenuItems} title="Landing Page" showBackButton>
      <div className="space-y-5">
        {/* Actions header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between py-2 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F2F7FF] text-[#1D73EC] flex items-center justify-center shrink-0">
              <MonitorPlay className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#10316B]">Landing Page</h2>
              <p className="text-gray-600 mt-1">
                Edit the text visitors see on the public landing page. Changes
                apply as soon as you save.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 sm:h-10 w-full sm:w-auto border-[#2F6FD6]/40 text-[#2F6FD6] hover:bg-[#F2F7FF] hover:text-[#2F6FD6]"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button
              variant="outline"
              className="h-11 sm:h-10 w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowResetConfirm(true)}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button
              onClick={() => setShowSaveConfirm(true)}
              className="h-11 sm:h-10 w-full sm:w-auto bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
            >
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Section nav (desktop) */}
          <Card className="hidden lg:flex flex-col gap-1 p-3 bg-white self-start sticky top-6">
            <p className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              On this page
            </p>
            {sectionCards.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#F2F7FF] hover:text-[#2F6FD6] transition-colors"
              >
                <span className="text-[#2F6FD6]/70">{sec.icon}</span>
                {sec.label}
              </a>
            ))}
          </Card>

          {/* Editor body */}
          <div className="lg:col-span-3 space-y-5">
            {/* Logo */}
            <div id="logo" className="scroll-mt-28">
              <EditorCard
                title="Brand Logo"
                subtitle="The Docufy logo shown across the whole system — sidebar, headers, landing page, login, and footer."
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-lg border border-slate-100 p-4">
                  <div className="w-16 h-16 shrink-0 rounded-full border border-slate-200 bg-white p-1 shadow-sm flex items-center justify-center">
                    <img
                      src={logo}
                      alt="Docufy Logo"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {logoStore.hasCustomLogo() ? "Custom logo in use" : "Default logo in use"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload a new logo to apply it everywhere instantly. The default logo is always kept and can be restored anytime.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 sm:h-10 w-full sm:w-auto border-[#2F6FD6]/40 text-[#2F6FD6] hover:bg-[#F2F7FF] hover:text-[#2F6FD6]"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload Logo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 sm:h-10 w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowLogoResetConfirm(true)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset Logo
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      handleLogoUpload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </EditorCard>
            </div>

            {/* Hero */}
            <div id="hero" className="scroll-mt-28">
              <EditorCard
                title="Hero Section"
                subtitle="The headline, badge, and intro visitors see first."
              >
                <Field
                  label="Hero Title"
                  value={content.heroTitle}
                  onChange={(v) => patch({ heroTitle: v })}
                  hint="Use a comma to split into two lines — the part after the comma is highlighted blue."
                />
                <Field
                  label="Hero Subtitle (badge)"
                  value={content.heroSubtitle}
                  onChange={(v) => patch({ heroSubtitle: v })}
                />
                <Field
                  label="Hero Description"
                  value={content.heroDescription}
                  onChange={(v) => patch({ heroDescription: v })}
                  multiline
                />
              </EditorCard>
            </div>

            {/* Features */}
            <div id="features" className="scroll-mt-28">
              <EditorCard
                title="Feature Highlights"
                subtitle="The three benefits shown under the Get Started button."
              >
                {(
                  [
                    [1, "feature1", "feature1Sub"],
                    [2, "feature2", "feature2Sub"],
                    [3, "feature3", "feature3Sub"],
                  ] as Array<[number, "feature1" | "feature2" | "feature3", "feature1Sub" | "feature2Sub" | "feature3Sub"]>
                ).map(([num, titleKey, subKey]) => (
                  <div
                    key={num}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F7FF] text-xs font-semibold text-[#2F6FD6]">
                        {num}
                      </span>
                      <Input
                        value={content[titleKey]}
                        onChange={(e) => patch({ [titleKey]: e.target.value } as Partial<LandingPageContent>)}
                        placeholder={`Feature ${num} title`}
                        className="h-9"
                      />
                    </div>
                    <Input
                      value={content[subKey]}
                      onChange={(e) => patch({ [subKey]: e.target.value } as Partial<LandingPageContent>)}
                      placeholder="Subtitle"
                      className="h-9"
                    />
                  </div>
                ))}
              </EditorCard>
            </div>

            {/* Services cards */}
            <div id="services" className="scroll-mt-28">
              <EditorCard
                title="Services & Pricing Cards"
                subtitle="The three service cards below the hero. Prices come from Pricing Management; edit the labels and descriptions here."
              >
                {content.serviceCards.map((card, index) => (
                  <div key={index} className="rounded-lg border border-slate-100 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F7FF] text-xs font-semibold text-[#2F6FD6]">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800">
                        {card.title || `Service Card ${index + 1}`}
                      </h4>
                      {card.badge && (
                        <span className="rounded-full bg-[#F2F7FF] px-2 py-0.5 text-[11px] font-semibold text-[#2F6FD6]">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field
                        label="Card title"
                        value={card.title}
                        onChange={(v) => patchServiceCard(index, { title: v })}
                      />
                      <Field
                        label="Badge (optional)"
                        value={card.badge ?? ""}
                        onChange={(v) => patchServiceCard(index, { badge: v })}
                      />
                    </div>
                    <Field
                      label="Description"
                      value={card.description}
                      onChange={(v) => patchServiceCard(index, { description: v })}
                    />
                    {card.details.map((detail, di) => (
                      <div key={di} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field
                          label={`Detail label ${di + 1}`}
                          value={detail.label}
                          onChange={(v) => patchServiceDetail(index, di, "label", v)}
                        />
                        <Field
                          label={`Detail value ${di + 1}`}
                          value={detail.value}
                          onChange={(v) => patchServiceDetail(index, di, "value", v)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </EditorCard>
            </div>

            {/* Shop info */}
            <div id="shop-info" className="scroll-mt-28">
              <EditorCard
                title="Shop Info"
                subtitle="Opening hours and the shop's address shown in the Shop Info section and footer."
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-slate-700">Shop Hours</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-[#2F6FD6]/40 text-[#2F6FD6] hover:bg-[#F2F7FF]"
                      onClick={addShopHour}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add row
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {content.shopHours.map((row, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={row.label}
                          onChange={(e) => patchShopHours(i, "label", e.target.value)}
                          placeholder="Label (e.g. Monday - Friday)"
                          className="flex-1 h-9"
                        />
                        <Input
                          value={row.hours}
                          onChange={(e) => patchShopHours(i, "hours", e.target.value)}
                          placeholder="Hours"
                          className="flex-1 h-9"
                        />
                        <button
                          type="button"
                          onClick={() => removeShopHour(i)}
                          className="shrink-0 p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <Field
                  label="Hours note (shown below the schedule)"
                  value={content.hoursNote}
                  onChange={(v) => patch({ hoursNote: v })}
                />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-slate-700">Location lines</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-[#2F6FD6]/40 text-[#2F6FD6] hover:bg-[#F2F7FF]"
                      onClick={addLocationLine}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add line
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {content.locationLines.map((line, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={line}
                          onChange={(e) => patchLocationLine(i, e.target.value)}
                          placeholder="Address line"
                          className="flex-1 h-9"
                        />
                        <button
                          type="button"
                          onClick={() => removeLocationLine(i)}
                          className="shrink-0 p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </EditorCard>
            </div>

            {/* About */}
            <div id="about" className="scroll-mt-28">
              <EditorCard
                title="About Docufy"
                subtitle="The about text used in the landing page footer."
              >
                <Field
                  label="About title"
                  value={content.aboutTitle}
                  onChange={(v) => patch({ aboutTitle: v })}
                />
                <Field
                  label="About subtitle"
                  value={content.aboutSubtitle}
                  onChange={(v) => patch({ aboutSubtitle: v })}
                />
                <Field
                  label="About body"
                  value={content.aboutBody}
                  onChange={(v) => patch({ aboutBody: v })}
                  multiline
                />
              </EditorCard>
            </div>

            {/* Footer save */}
            <div className="flex justify-end rounded-xl border border-slate-200 bg-white p-3 shadow-sm mt-6 mb-2">
              <Button
                onClick={() => setShowSaveConfirm(true)}
                className="h-10 bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
              >
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset landing page content?"
        description="This restores the default text on the public landing page. This action cannot be undone."
        confirmLabel="Reset Content"
        onConfirm={handleReset}
        requirePhrase
        destructive
      />

      <ConfirmationDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        title="Save changes?"
        description="This applies your current edits to the public landing page."
        confirmLabel="Save Changes"
        onConfirm={handleSave}
      />

      <ConfirmationDialog
        open={showLogoResetConfirm}
        onOpenChange={setShowLogoResetConfirm}
        title="Reset logo?"
        description="This restores the default Docufy logo across the whole system. This cannot be undone."
        confirmLabel="Reset Logo"
        onConfirm={handleLogoReset}
        destructive
      />

      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-[#F2F7FF]">
          <div className="h-full overflow-y-auto overscroll-contain">
            <LandingPage contentOverride={content} />
          </div>
          <div className="fixed bottom-4 right-4 z-10 flex gap-2">
            <Button
              variant="outline"
              className="h-11 border-[#2F6FD6]/40 bg-white text-[#2F6FD6] shadow-md hover:bg-[#F2F7FF] hover:text-[#2F6FD6]"
              onClick={() => setShowPreview(false)}
            >
              <X className="w-4 h-4 mr-2" /> Close Preview
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}