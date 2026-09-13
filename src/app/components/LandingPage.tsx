import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  MapPin,
  Printer,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Palette,
  Package,
  CloudUpload,
  ShieldCheck,
  LayoutDashboard,
  User,
  LogOut,
  Mail,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { jobsStore } from "../utils/jobsStore";
import { pricingStore, type PricingMatrix } from "../utils/pricingStore";
import { shopPhotosStore, type ShopPhoto } from "../utils/shopPhotosStore";
import { useAuth } from "../contexts/AuthContext";
import { usePresence } from "./ui/use-presence";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
import ShopStatusBanner from "./shared/ShopStatusBanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import logoImage from "../../assets/32cd46dac3d06839e0db69b6c6ad22c9a8ac17a6.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profilePresence = usePresence(isProfileOpen, 200);
  const userInitials = user
    ? (user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U")
    : "U";
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [matrix, setMatrix] = useState<PricingMatrix>(pricingStore.getMatrix());
  const [activeSection, setActiveSection] = useState("home");
  const servicesScrollerRef = useRef<HTMLDivElement>(null);
  const [activeServiceCard, setActiveServiceCard] = useState(0);
  const [shopLocationOpen, setShopLocationOpen] = useState(false);
  const [showShopPhotos, setShowShopPhotos] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [shopPhotos, setShopPhotos] = useState<ShopPhoto[]>(shopPhotosStore.getPhotos());

  useEffect(() => {
    const load = () => setShopPhotos(shopPhotosStore.getPhotos());
    return shopPhotosStore.subscribe(load);
  }, []);

  useEffect(() => {
    const load = () => setMatrix(pricingStore.getMatrix());
    return pricingStore.subscribe(load);
  }, []);

  // Close the header profile dropdown when clicking outside of it.
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const [jobs, setJobs] = useState<any[]>(() => jobsStore.getActiveJobs());
  useEffect(() => {
    const load = () => setJobs(jobsStore.getActiveJobs());
    return jobsStore.subscribe(load);
  }, []);

  // Load landing page content from localStorage or use defaults
  const getContent = () => {
    const defaults = {
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
      bindingPrice: "20",
      hoursMonFri: "9:00 AM - 5:00 PM",
      hoursSat: "Closed",
      hoursSun: "Closed",
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
      locationCampus: "Palawan State University - Main Campus",
      locationRoom: "Room 4, TBI Building",
      locationBuilding: "Puerto Princesa City, 5300 Palawan",
      aboutTitle: "About Docufy",
      aboutSubtitle: "Your printing companion",
      aboutBody:
        "Docufy is a modern printing management system designed to make document printing and tracking easier for students, faculty, and staff. With our user-friendly platform, you can upload documents, place print orders, track your requests in real-time, and manage everything from a single dashboard. We're committed to providing fast, reliable, and affordable printing services to the academic community.",
    };
    const saved = localStorage.getItem("landing_content");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaults, ...parsed };
        // Legacy (pre-subtitle) saved content stored the FULL phrase in
        // feature1/2/3, e.g. "Upload documents instantly". Migrate it by
        // stripping the subtitle out of the title so words are not doubled.
        if (typeof parsed.feature1Sub !== "string") {
          for (const n of [1, 2, 3] as const) {
            const sub = defaults[`feature${n}Sub`];
            const match = sub.replace(/\.$/, "");
            const title = String(merged[`feature${n}`]);
            merged[`feature${n}`] = title.includes(match)
              ? title.replace(match, "").trim()
              : title;
            merged[`feature${n}Sub`] = sub;
          }
        }
        // Migrate saved shop hours that still carry old values to the
        // current schedule (9 AM - 5 PM, Monday to Friday, no lunch break).
        const HOURS_MIGRATION: Record<string, [string, string]> = {
          hoursMonFri: ["8:00 AM - 6:00 PM", "9:00 AM - 5:00 PM"],
          hoursMonFri6: ["9:00 AM - 6:00 PM", "9:00 AM - 5:00 PM"],
          hoursSat: ["9:00 AM - 4:00 PM", "Closed"],
          hoursSat6: ["9:00 AM - 6:00 PM", "Closed"],
        };
        for (const [key, [oldVal, newVal]] of Object.entries(HOURS_MIGRATION)) {
          const realKey = key.replace(/6$/, "");
          if (String(merged[realKey]) === oldVal) merged[realKey] = newVal;
        }
        // Structured shop-hours / location fields: build them from legacy
        // flat values when not yet saved so the landing page reflects them.
        if (!Array.isArray(merged.shopHours)) {
          const satSun =
            String(merged.hoursSat).toLowerCase() ===
            String(merged.hoursSun).toLowerCase()
              ? [{ label: "Saturday - Sunday", hours: String(merged.hoursSat || "Closed") }]
              : [
                  { label: "Saturday", hours: String(merged.hoursSat || "Closed") },
                  { label: "Sunday", hours: String(merged.hoursSun || "Closed") },
                ];
          merged.shopHours = [
            { label: "Monday - Friday", hours: String(merged.hoursMonFri || "") },
            ...satSun,
          ].filter((row) => row.hours !== "");
          merged.hoursNote = "No noon break";
        }
        if (!Array.isArray(merged.locationLines)) {
          merged.locationLines = [
            merged.locationCampus,
            merged.locationRoom,
            merged.locationBuilding,
          ].filter(Boolean);
        }
        return merged;
      } catch {
        // Fall through to defaults
      }
    }
    return defaults;
  };

  const content = getContent();

  // Footer About Docufy blurb: the existing About body, trimmed.
  const footerAboutShort =
    "Docufy is a printing service designed to make document printing easier for students and faculty.";

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // Scroll-spy: highlight the header nav item for the section currently in view.
  useEffect(() => {
    const sectionIds = ["home", "services", "shop-info", "footer"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Track the active card in the mobile services carousel from its scroll position.
  useEffect(() => {
    const el = servicesScrollerRef.current;
    if (!el) return;
    const update = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-services-card]"));
      if (cards.length === 0) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      cards.forEach((card, i) => {
        const box = card.getBoundingClientRect();
        const elBox = el.getBoundingClientRect();
        const dist = Math.abs(box.left - elBox.left + box.width / 2 - el.clientWidth / 2);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setActiveServiceCard(closest);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Auto-advance the mobile services carousel in an endless loop.
  // Desktop renders a static grid (no horizontal scroll), so it is skipped.
  useEffect(() => {
    const el = servicesScrollerRef.current;
    if (!el) return;
    const timer = window.setInterval(() => {
      if (el.scrollWidth <= el.clientWidth) return;
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-services-card]"));
      if (cards.length === 0) return;
      const next = (activeServiceCard + 1) % cards.length;
      const card = cards[next];
      el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activeServiceCard]);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "services", label: "Services & Pricing" },
    { id: "shop-info", label: "Shop Info" },
    { id: "footer", label: "About Docufy" },
  ];

  return (
    <div className="min-h-screen bg-[#F2F7FF] relative overflow-clip">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#1D73EC] rounded-full opacity-5 blur-3xl -translate-x-48 -translate-y-48 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#10316B] rounded-full opacity-5 blur-3xl translate-x-48 translate-y-48 pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-[#1D73EC] rounded-full opacity-5 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 border-b border-gray-200 bg-white backdrop-blur-md z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={logoImage}
              alt="Docufy Logo"
              className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
            />
            <div>
              <h1 className="truncate text-base font-bold text-[#1c1f26] sm:text-xl">
                Docufy PSMS
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-8">
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      scrollToSection(item.id);
                    }}
                    className={`group relative pb-1 font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-[#1D73EC]"
                        : "text-[#1c1f26] hover:text-[#1D73EC]"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#1D73EC] transition-transform duration-300 ease-out ${
                        isActive
                          ? "scale-x-100"
                          : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {user ? (
              <div className="relative shrink-0" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  aria-label="Open profile"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                  className="rounded-full transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-[#1D73EC]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D73EC] focus-visible:ring-offset-2"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-[#1D73EC] text-white shadow-sm flex items-center justify-center font-bold text-xs">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      userInitials
                    )}
                  </div>
                </button>

                {profilePresence && (
                  <div className={`absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-1.5 shadow-2xl ${profilePresence.isClosing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-200 pointer-events-none" : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate(`/${user.role}/dashboard`);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate(`/${user.role}/profile`);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4" /> Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate("/login")}
                className="h-9 rounded-lg border-[1.5px] border-[#1D73EC] bg-white px-3 text-xs font-medium text-[#1D73EC] transition-colors duration-200 hover:translate-y-0 hover:border-[#1D73EC] hover:bg-[#1D73EC]/5 hover:text-[#1D73EC] hover:shadow-none active:translate-y-0 active:border-[#1D73EC]/70 active:bg-[#1D73EC]/10 sm:h-10 sm:px-4 sm:text-sm"
              >
                Log In
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pt-4">
        <ShopStatusBanner />
      </div>

      {/* Hero Section */}
      <section
        id="home"
        className="relative z-10 w-full bg-white pb-10 pt-24 sm:pb-20 sm:pt-32 [background-image:radial-gradient(circle_at_top_right,rgba(29,115,236,0.07),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(47,111,214,0.06),transparent_42%),linear-gradient(to_bottom,transparent_78%,#F2F7FF)]"
      >
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <div className="min-w-0 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#1D73EC]/20 text-[#1D73EC] rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-[#1D73EC] rounded-full animate-pulse"></span>
                {content.heroSubtitle}
              </div>
              <h2 className="mb-5 font-bold leading-tight text-[#1c1f26] text-[clamp(2.25rem,7vw,3rem)] lg:text-[clamp(3rem,5.85vw,3.75rem)]">
                {content.heroTitle.split(",")[0]?.trim()},
                <br />
                <span className="text-[#1D73EC]">
                  {content.heroTitle.split(",")[1]?.trim()}
                </span>
              </h2>
              <p className="mb-7 max-w-xl text-gray-600 text-[clamp(1rem,3.125vw,1.25rem)]">
                {content.heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-[#1D73EC] text-white hover:bg-[#0f66d9] rounded-lg transition-all duration-200 active:scale-[0.98] active:shadow-sm shadow-md shadow-[#1D73EC]/30 hover:shadow-lg hover:shadow-[#1D73EC]/35 group"
                  onClick={() => navigate("/signup")}
                >
                  Get Started
                  <ArrowRight className="ml-2.5 w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              </div>

              {/* Features List */}
              <div className="mt-6 flex w-full min-w-0 items-center justify-center lg:justify-start">
                {[
                  {
                    title: content.feature1,
                    sub: content.feature1Sub,
                    icon: <CloudUpload />,
                  },
                  {
                    title: content.feature2,
                    sub: content.feature2Sub,
                    icon: <Clock />,
                  },
                  {
                    title: content.feature3,
                    sub: content.feature3Sub,
                    icon: <ShieldCheck />,
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex min-w-0 flex-1 items-center">
                    <div className="flex w-full min-w-0 flex-col items-center gap-1 text-center text-[#1c1f26] sm:w-auto sm:flex-shrink sm:items-start sm:text-left">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-blue-300 bg-[#F2F7FF] sm:h-9 sm:w-9">
                        {React.cloneElement(feature.icon, {
                          className:
                            "w-[16px] h-[16px] text-[#1D73EC] stroke-2 sm:w-[18px] sm:h-[18px]",
                        })}
                      </div>
                      <span className="flex flex-col leading-tight">
                        <span className="text-xs sm:text-sm sm:whitespace-nowrap">
                          {feature.title}
                        </span>
                        <span className="text-xs sm:text-sm sm:whitespace-nowrap">
                          {feature.sub}
                        </span>
                      </span>
                    </div>
                    {index < 2 && (
                      <span
                        aria-hidden
                        className="mx-auto h-12 w-px shrink-0 bg-blue-200 sm:h-14"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="order-first flex w-full items-center justify-center lg:order-none">
              <div className="flex aspect-square w-[min(12rem,60vw)] items-center justify-center rounded-full bg-[#1D73EC] shadow-2xl sm:w-[min(18rem,50vw)] lg:w-[min(24rem,37.5vw)]">
                <img
                  src={logoImage}
                  alt="Docufy"
                  className="h-[66.67%] w-[66.67%] rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services & Pricing */}
      <section
        id="services"
        className="bg-[#F2F7FF] w-full py-12 sm:py-16 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1D73EC]">
              Services &amp; Pricing
            </p>
            <h2 className="mt-4 text-3xl font-bold text-[#1c1f26] sm:text-4xl">
              What can we print?
            </h2>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              Quality printing services with clear, affordable pricing.
            </p>
          </div>
          <div
            ref={servicesScrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 lg:gap-8"
          >
            <Card data-services-card="0" className="flex w-[85%] shrink-0 snap-center flex-col rounded-2xl border-2 border-[#F2F7FF] bg-white p-8 shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#1D73EC] hover:shadow-2xl md:w-auto">
              <div className="flex w-16 h-16 bg-[#F2F7FF] rounded-2xl items-center justify-center">
                <Printer className="w-8 h-8 text-[#1D73EC]" />
              </div>
              <div className="mt-6 flex flex-1 flex-col">
                <h4 className="text-xl font-bold text-[#1c1f26]">
                  Black &amp; White Printing
                </h4>
                <p className="mt-2 text-gray-600">
                  Standard plain-paper printing for everyday text documents.
                </p>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 font-semibold text-[#1c1f26]">Paper sizes</dt>
                    <dd className="text-right text-gray-600">Short · A4 · Long</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 font-semibold text-[#1c1f26]">Content</dt>
                    <dd className="text-right text-gray-600">Text · Text + Image · Image</dd>
                  </div>
                </dl>
              </div>
              <div className="pt-6 mt-7 border-t border-gray-100">
                <div className="text-4xl font-bold text-[#1D73EC]">
                  ₱{matrix.document.text.bw.a4.toFixed(2)}{" "}
                  <span className="text-base font-normal text-gray-500">
                    per page
                  </span>
                </div>
              </div>
            </Card>

            <Card data-services-card="1" className="relative flex w-[85%] shrink-0 snap-center flex-col overflow-hidden rounded-2xl bg-[#1D73EC] p-8 text-white shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl md:w-auto">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -translate-y-12 translate-x-12" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full translate-y-8 -translate-x-8" />
              <div className="relative z-10 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Palette className="w-8 h-8 text-white" />
                  </div>
                  <div className="inline-block px-3 py-1 bg-white text-[#1D73EC] text-xs font-bold rounded-full">
                    POPULAR
                  </div>
                </div>
                <div className="mt-6 flex flex-1 flex-col">
                  <h4 className="text-xl font-bold">
                    Color Printing
                  </h4>
                  <p className="mt-2 text-white/90">
                    Full-color plain-paper printing for documents and presentations.
                  </p>
                  <dl className="mt-5 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 font-semibold text-white/70">Paper sizes</dt>
                      <dd className="text-right text-white/90">Short · A4 · Long</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 font-semibold text-white/70">Color modes</dt>
                      <dd className="text-right text-white/90">Partial · Full</dd>
                    </div>
                  </dl>
                </div>
                <div className="pt-6 mt-7 border-t border-white/15">
                  <div className="text-4xl font-bold">
                    ₱{matrix.document.text.full.a4.toFixed(2)}{" "}
                    <span className="text-base font-normal text-white/80">
                      per page
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card data-services-card="2" className="flex w-[85%] shrink-0 snap-center flex-col rounded-2xl border-2 border-[#F2F7FF] bg-white p-8 shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#1D73EC] hover:shadow-2xl md:w-auto">
              <div className="flex w-16 h-16 bg-[#F2F7FF] rounded-2xl items-center justify-center">
                <Package className="w-8 h-8 text-[#1D73EC]" />
              </div>
              <div className="mt-6 flex flex-1 flex-col">
                <h4 className="text-xl font-bold text-[#1c1f26]">
                  Photo, Vellum &amp; Sticker
                </h4>
                <p className="mt-2 text-gray-600">
                  Photo prints, vellum paper, and A4 sticker sheets.
                </p>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 font-semibold text-[#1c1f26]">Photo sizes</dt>
                    <dd className="text-right text-gray-600">2R · 3R · 4R · 5R · 6R · A4</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 font-semibold text-[#1c1f26]">Materials</dt>
                    <dd className="text-right text-gray-600">Vellum · Sticker (A4)</dd>
                  </div>
                </dl>
              </div>
              <div className="pt-6 mt-7 border-t border-gray-100">
                <div className="text-4xl font-bold text-[#1D73EC]">
                  ₱{Math.min(matrix.vellum.bw.a4, matrix.sticker.bw, matrix.photo["2R"].price).toFixed(2)}{" "}
                  <span className="text-base font-normal text-gray-500">
                    from
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Shop Info */}
      <section
        id="shop-info"
        className="bg-white w-full py-16 sm:py-20 relative z-10"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1D73EC]">
              Shop Information
            </p>
            <h2 className="mt-4 text-3xl font-bold text-[#1c1f26] sm:text-4xl">
              Visit us on campus.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
              {content.locationLines?.[0]
                ? `Docufy is conveniently located at ${content.locationLines[0]}. Drop by during operating hours, or start your order online.`
                : "Docufy is conveniently located on campus. Drop by during operating hours, or start your order online."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-14">
            {/* Left: Shop Hours + Location */}
            <div className="flex flex-col gap-6">
              {/* Shop Hours */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <h3 className="flex items-center gap-3 text-base font-bold text-[#1c1f26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-[#1D73EC]">
                    <Clock className="h-4 w-4" />
                  </span>
                  Shop Hours
                </h3>
                <dl className="mt-4">
                  {content.shopHours.map((row: { label: string; hours: string }, index: number) => (
                    <div
                      key={index}
                      className="flex items-baseline justify-between gap-6 border-t border-gray-100 py-3.5 first:border-t-0 first:pt-0 last:pb-0"
                    >
                      <dt className="text-sm font-semibold text-[#1c1f26]">
                        {row.label || "Schedule"}
                      </dt>
                      <dd className="text-right text-sm text-gray-600">{row.hours}</dd>
                    </div>
                  ))}
                </dl>
                {content.hoursNote && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#1D73EC]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {content.hoursNote}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-3 text-base font-bold text-[#1c1f26]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-[#1D73EC]">
                      <MapPin className="h-4 w-4" />
                    </span>
                    Location
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShopLocationOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#2F6FD6] hover:text-[#1e5bb8] transition-colors"
                  >
                    <MapPin className="h-4 w-4 shrink-0" />
                    Shop Photos
                  </button>
                </div>
                <address className="mt-4 space-y-1 not-italic">
                  {content.locationLines.map((line: string, index: number) => (
                    <p
                      key={index}
                      className={`text-sm leading-relaxed ${
                        index === 0 ? "font-semibold text-[#1c1f26]" : "text-gray-600"
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </address>
                <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg border-0 lg:hidden">
                  <iframe
                    title="Docufy Printing Services - Shop Location (mobile)"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3931.8605234742895!2d118.7358141!3d9.777867299999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33b5632f84660cb3%3A0x6c411581676a62cf!2sDocufy%20Printing%20Services!5e0!3m2!1sen!2sph!4v1788133073002!5m2!1sen!2sph"
                    className="h-full w-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>

            {/* Right: map fills the full height of the left column (desktop only) */}
            <div className="hidden flex-col lg:flex">
              <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-1">
                <div className="h-full w-full overflow-hidden rounded-lg">
                  <iframe
                    title="Docufy Printing Services - Shop Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3931.8605234742895!2d118.7358141!3d9.777867299999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33b5632f84660cb3%3A0x6c411581676a62cf!2sDocufy%20Printing%20Services!5e0!3m2!1sen!2sph!4v1788133073002!5m2!1sen!2sph"
                    className="h-full w-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Our Team */}
      <section
        id="jobs"
        className="bg-[#F2F7FF] w-full py-16 sm:py-20 relative z-10"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1D73EC]">
              Join Our Team
            </p>
            <h2 className="mt-4 text-3xl font-bold text-[#1c1f26] sm:text-4xl">
              Work with us.
            </h2>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              Explore current openings at Docufy and start your application today.
            </p>
            {jobs.length > 0 && (
              <div className="mt-8">
                <Button
                  type="button"
                  onClick={() => scrollToSection("jobs-list")}
                  className="h-12 rounded-lg bg-[#1D73EC] px-8 text-white shadow-md shadow-[#1D73EC]/30 transition-all duration-200 hover:bg-[#0f66d9] hover:shadow-lg hover:shadow-[#1D73EC]/35 active:scale-[0.98] active:shadow-sm"
                >
                  View Job Openings <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="mt-12 rounded-xl border border-blue-200/60 bg-white p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2F7FF]">
                <Briefcase className="h-6 w-6 text-[#1D73EC]" />
              </div>
              <p className="text-lg font-semibold text-[#1c1f26]">No open positions right now</p>
              <p className="mt-1 text-sm text-gray-500">
                Please check back later for new opportunities at Docufy.
              </p>
            </div>
          ) : (
            <ul id="jobs-list" className="mt-12 scroll-mt-24">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="grid gap-3 border-t border-blue-200/60 py-6 last:border-b sm:grid-cols-[1fr_auto] sm:items-center sm:gap-10 lg:py-7"
                >
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-[#1c1f26] lg:text-xl">
                      {job.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-500">
                      {[
                        job.type,
                        job.duration && `Schedule: ${job.duration}`,
                        job.location && `Location: ${job.location}`,
                        (job.posted || job.postedDate) && `Posted: ${job.posted || job.postedDate}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {job.description && (
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
                        {job.description}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => navigate(`/signup?jobId=${job.id}`)}
                    className="h-9 w-full rounded-lg bg-white px-5 text-sm font-semibold text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white sm:h-9 sm:w-auto"
                  >
                    Apply Now <ArrowRight className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-10 bg-[#1351AE]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-x-10 gap-y-10 py-12 lg:grid-cols-12 lg:gap-x-8 lg:py-14">
            {/* Brand / About Docufy */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <img
                  src={logoImage}
                  alt="Docufy Logo"
                  className="h-10 w-10 rounded-full"
                />
                <h2 className="text-lg font-bold text-white">Docufy PSMS</h2>
              </div>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                About Docufy
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-blue-100/90">
                {footerAboutShort}
              </p>
            </div>

            {/* Quick Links */}
            <nav className="lg:col-span-3 lg:pl-4" aria-label="Footer">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Quick Links
              </h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  { id: "home", label: "Home" },
                  { id: "services", label: "Services & Pricing" },
                  { id: "shop-info", label: "Shop Info" },
                  { id: "footer", label: "About Us" },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(link.id)}
                      className="text-sm text-blue-50/90 transition-colors hover:text-white"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Contact / Shop Information */}
            <div className="lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Contact / Shop Information
              </h3>
              <div className="mt-4 space-y-3.5">
                <p className="text-sm text-blue-50/90">
                  {content.locationLines[0]}
                </p>
                <div className="text-sm text-blue-50/90">
                  <p className="font-medium text-white">{content.shopHours[0].label}</p>
                  <p>{content.shopHours[0].hours}</p>
                </div>
                <p className="text-sm text-blue-50/90">{content.shopHours[1].label} - {content.shopHours[1].hours}</p>
                <a
                  href="mailto:support@docufy.com"
                  className="inline-flex items-center gap-2 text-sm text-blue-50/90 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4" />
                  support@docufy.com
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 border-t border-white/10 py-5 text-xs text-blue-100/80 sm:flex-row sm:justify-between">
            <p>&copy; 2026 Docufy PSMS. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="transition-colors hover:text-white"
              >
                Terms &amp; Condition
              </button>
              <span aria-hidden className="text-blue-100/40">|</span>
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="transition-colors hover:text-white"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Terms and Conditions Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#10316B]">
              Terms and Conditions
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Last updated: April 27, 2026
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                1. Acceptance of Terms
              </h3>
              <p>
                By accessing and using Docufy PSMS (Print Shop
                Management System), you accept and agree to be
                bound by the terms and provision of this
                agreement. If you do not agree to abide by the
                above, please do not use this service.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                2. Use License
              </h3>
              <p>
                Permission is granted to use Docufy PSMS for
                personal and academic purposes within Palawan
                State University. This license shall
                automatically terminate if you violate any of
                these restrictions and may be terminated by
                Docufy at any time.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                3. Service Description
              </h3>
              <p>
                Docufy PSMS provides printing services for
                students and faculty of Palawan State
                University. Services include document printing,
                color printing, binding, and related print shop
                services. We reserve the right to modify,
                suspend, or discontinue any aspect of the
                service at any time.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                4. User Accounts
              </h3>
              <p>
                You are responsible for maintaining the
                confidentiality of your account credentials. You
                agree to accept responsibility for all
                activities that occur under your account. You
                must notify us immediately of any unauthorized
                use of your account.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                5. Payment Terms
              </h3>
              <p>
                All payments must be made through the approved
                payment methods (online payment methods or
                Cash on Pickup).
                Prices are subject to change without notice.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                6. Content Restrictions
              </h3>
              <p>
                Users may not upload, print, or distribute
                content that is illegal, offensive, defamatory,
                or infringes on intellectual property rights.
                Docufy reserves the right to refuse service for
                any content deemed inappropriate.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                7. Limitation of Liability
              </h3>
              <p>
                Docufy PSMS shall not be liable for any damages
                arising from the use or inability to use the
                service, including but not limited to printing
                errors, delays, or data loss.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                8. Modifications to Terms
              </h3>
              <p>
                Docufy reserves the right to revise these terms
                at any time. Continued use of the service
                following any changes constitutes acceptance of
                those changes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                9. Contact Information
              </h3>
              <p>
                For questions about these Terms and Conditions,
                please contact us at support@docufy.com or visit
                our office at Room 4, Palawan State University -
                Main Campus, TBI Building, Puerto Princesa City,
                5300 Palawan.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#10316B]">
              Privacy Policy
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Last updated: April 27, 2026
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                1. Information We Collect
              </h3>
              <p>
                We collect information that you provide directly
                to us, including:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>
                  Name, email address, and contact information
                </li>
                <li>University identification details</li>
                <li>
                  Payment information and transaction history
                </li>
                <li>Documents uploaded for printing</li>
                <li>Order history and preferences</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                2. How We Use Your Information
              </h3>
              <p>We use the information we collect to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Process and fulfill your print orders</li>
                <li>Send order confirmations and updates</li>
                <li>Process payments and prevent fraud</li>
                <li>
                  Improve our services and user experience
                </li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                3. Data Security
              </h3>
              <p>
                We implement appropriate technical and
                organizational measures to protect your personal
                information against unauthorized access,
                alteration, disclosure, or destruction. However,
                no method of transmission over the internet is
                100% secure.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                4. Document Handling
              </h3>
              <p>Documents uploaded to our system are:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>
                  Stored securely and accessed only by
                  authorized staff
                </li>
                <li>
                  Automatically deleted 30 days after order
                  completion
                </li>
                <li>
                  Never shared with third parties without your
                  consent
                </li>
                <li>
                  Processed only for the purpose of fulfilling
                  your order
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                5. Cookies and Tracking
              </h3>
              <p>
                We use cookies and similar tracking technologies
                to track activity on our service and hold
                certain information. You can instruct your
                browser to refuse all cookies or to indicate
                when a cookie is being sent.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                6. Information Sharing
              </h3>
              <p>
                We do not sell, trade, or rent your personal
                information to third parties. We may share your
                information only in the following circumstances:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>
                  With service providers who assist in our
                  operations
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                7. Your Rights
              </h3>
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>
                  Object to processing of your information
                </li>
                <li>Export your data in a portable format</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                8. Data Retention
              </h3>
              <p>
                We retain your personal information only for as
                long as necessary to fulfill the purposes
                outlined in this privacy policy, unless a longer
                retention period is required by law.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                9. Children's Privacy
              </h3>
              <p>
                Our service is intended for university students
                and faculty. We do not knowingly collect
                personal information from individuals under 18
                years of age without parental consent.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                10. Changes to This Policy
              </h3>
              <p>
                We may update our Privacy Policy from time to
                time. We will notify you of any changes by
                posting the new Privacy Policy on this page and
                updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-[#10316B] mb-2">
                11. Contact Us
              </h3>
              <p>
                If you have any questions about this Privacy
                Policy, please contact us at:
              </p>
              <ul className="list-none ml-0 mt-2 space-y-1">
                <li>Email: support@docufy.com</li>
                <li>Phone: +63 123 456 7890</li>
                <li>
                  Address: Palawan State University - Main
                  Campus, TBI Building, Room 4, Puerto Princesa
                  City, 5300 Palawan
                </li>
              </ul>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {shopLocationOpen && (
        <Dialog open={shopLocationOpen} onOpenChange={setShopLocationOpen}>
          <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2F6FD6]" /> Shop Location
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              {content.locationLines[0]
                ? `Docufy is conveniently located at ${content.locationLines[0]}.`
                : "Palawan State University - Main Campus, Puerto Princesa City, Palawan"}
            </p>
            {shopPhotos.length > 0 ? (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setShowShopPhotos(!showShopPhotos)}
                  className="flex items-center gap-2 text-sm font-medium text-[#2F6FD6] hover:text-[#1e5bb8] transition-colors"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showShopPhotos ? "rotate-180" : ""
                    }`}
                  />
                  {showShopPhotos ? "Hide Shop Photos" : "View Shop Photos"}
                </button>
                {showShopPhotos && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {shopPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setLightboxPhoto(photo.dataUrl)}
                        className="cursor-pointer"
                      >
                        <img
                          src={photo.dataUrl}
                          alt="Shop location"
                          className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:ring-2 hover:ring-[#2F6FD6] transition-all"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No shop photos uploaded yet.
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {lightboxPhoto && (
        <Dialog open onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="sm:max-w-2xl p-0 bg-black border-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxPhoto}
              alt="Shop location full view"
              className="w-full max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      {showLogoutConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowLogoutConfirm}
          onConfirm={() => {
            logout();
            navigate("/");
          }}
          title="Sign out of Docufy?"
          description="You will be returned to the sign-in page. Your current session and app data will be preserved, but sign-in will be required to continue."
          confirmLabel="Log Out"
          cancelLabel="Stay Signed In"
          destructive
        />
      )}
    </div>
  );
}