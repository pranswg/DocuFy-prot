import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  FileText,
  Clock,
  MapPin,
  Printer,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  ChevronDown,
  Palette,
  Package,
  Sparkles,
  X,
  CloudUpload,
  ShieldCheck,
  LayoutDashboard,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
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
  const [showShopMap, setShowShopMap] = useState(false);
  const [matrix, setMatrix] = useState<PricingMatrix>(pricingStore.getMatrix());
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [showShopPhotos, setShowShopPhotos] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const servicesScrollerRef = useRef<HTMLDivElement>(null);
  const [activeServiceCard, setActiveServiceCard] = useState(0);

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

  const [shopPhotos, setShopPhotos] = useState<ShopPhoto[]>(
    shopPhotosStore.getPhotos(),
  );
  useEffect(() => {
    const load = () => setShopPhotos(shopPhotosStore.getPhotos());
    return shopPhotosStore.subscribe(load);
  }, []);

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
    const sectionIds = ["home", "services", "shop-info", "about"];
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
    { id: "about", label: "About Us" },
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
        className="bg-white w-full pt-24 sm:pt-32 pb-10 sm:pb-20 relative z-10"
      >
        <div className="pointer-events-none absolute -top-32 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#1D73EC]/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-48 h-96 w-96 rounded-full bg-[#2F6FD6]/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#F2F7FF]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#1D73EC]/20 text-[#1D73EC] rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-[#1D73EC] rounded-full animate-pulse"></span>
                {content.heroSubtitle}
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1c1f26] mb-5 leading-tight">
                {content.heroTitle.split(",")[0]?.trim()},
                <br />
                <span className="text-[#1D73EC]">
                  {content.heroTitle.split(",")[1]?.trim()}
                </span>
              </h2>
              <p className="text-base sm:text-xl text-gray-600 mb-7 max-w-xl">
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
              <div className="mt-6 flex min-w-0 items-center">
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
                    <div className="flex min-w-0 flex-col items-start gap-1 text-left text-[#1c1f26]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-blue-300 bg-[#F2F7FF] sm:h-9 sm:w-9">
                        {React.cloneElement(feature.icon, {
                          className:
                            "w-[16px] h-[16px] text-[#1D73EC] stroke-2 sm:w-[18px] sm:h-[18px]",
                        })}
                      </div>
                      <span className="flex flex-col leading-tight">
                        <span className="whitespace-nowrap text-xs sm:text-sm">
                          {feature.title}
                        </span>
                        <span className="whitespace-nowrap text-xs sm:text-sm">
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

            <div className="order-first flex items-center justify-center lg:order-none lg:flex">
              <div className="relative">
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-[#1D73EC] shadow-2xl sm:h-72 sm:w-72 lg:h-96 lg:w-96">
                  <img
                    src={logoImage}
                    alt="Docufy"
                    className="h-32 w-32 rounded-full sm:h-48 sm:w-48 lg:h-64 lg:w-64"
                  />
                </div>
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
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold text-[#1c1f26] mb-4">
              Services & Pricing
            </h3>
            <p className="text-lg text-gray-600">
              Affordable printing solutions for all your needs
            </p>
          </div>
          <div
            ref={servicesScrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 lg:gap-8"
          >
            <Card data-services-card="0" className="w-[85%] shrink-0 snap-center rounded-2xl border-2 border-[#F2F7FF] bg-white p-8 shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#1D73EC] hover:shadow-2xl md:w-auto">
              <div className="w-16 h-16 bg-[#F2F7FF] rounded-2xl flex items-center justify-center mb-6">
                <Printer className="w-8 h-8 text-[#1D73EC]" />
              </div>
              <h4 className="text-xl font-bold text-[#1c1f26] mb-3">
                Black & White Printing
              </h4>
              <p className="text-gray-600 mb-6">
                Standard plain-paper printing for text
                documents (Short, A4, Long)
              </p>
              <div className="text-4xl font-bold text-[#1D73EC]">
                ₱{matrix.document.text.bw.a4.toFixed(2)}{" "}
                <span className="text-base font-normal text-gray-500">
                  / page
                </span>
              </div>
            </Card>

            <Card data-services-card="1" className="w-[85%] shrink-0 snap-center rounded-2xl bg-[#1D73EC] p-8 text-white shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl md:w-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -translate-y-12 translate-x-12" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full translate-y-8 -translate-x-8" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <div className="inline-block px-3 py-1 bg-white text-[#1D73EC] text-xs font-bold rounded-full mb-4">
                  POPULAR
                </div>
                <h4 className="text-xl font-bold mb-3">
                  Color Printing
                </h4>
                <p className="text-white/90 mb-6">
                  Full-color plain-paper printing for documents
                  and presentations
                </p>
                <div className="text-4xl font-bold">
                  ₱{matrix.document.text.full.a4.toFixed(2)}{" "}
                  <span className="text-base font-normal text-white/80">
                    / page
                  </span>
                </div>
              </div>
            </Card>

            <Card data-services-card="2" className="w-[85%] shrink-0 snap-center rounded-2xl border-2 border-[#F2F7FF] bg-white p-8 shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#1D73EC] hover:shadow-2xl md:w-auto">
              <div className="w-16 h-16 bg-[#F2F7FF] rounded-2xl flex items-center justify-center mb-6">
                <Package className="w-8 h-8 text-[#1D73EC]" />
              </div>
              <h4 className="text-xl font-bold text-[#1c1f26] mb-3">
                Photo, Vellum & Sticker
              </h4>
              <p className="text-gray-600 mb-6">
                Photo prints (2R to A4), vellum paper, and A4
                sticker sheets
              </p>
              <div className="text-4xl font-bold text-[#1D73EC]">
                ₱{Math.min(matrix.vellum.bw.a4, matrix.sticker.bw, matrix.photo["2R"].price).toFixed(2)}{" "}
                <span className="text-base font-normal text-gray-500">
                  from
                </span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Shop Info */}
      <section
        id="shop-info"
        className="bg-white w-full py-12 sm:py-16 relative z-10"
      >
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-[#1D73EC]/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-[#2F6FD6]/[0.05] blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold text-[#1c1f26] mb-4">
              Shop Info
            </h3>
            <p className="text-lg text-gray-600">
              Visit us during our operating hours
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
            <Card className="p-4 sm:p-8 bg-white border-2 border-[#1D73EC] shadow-xl rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2F7FF] rounded-full -translate-y-16 translate-x-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F2F7FF] rounded-full translate-y-12 -translate-x-12" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#1D73EC] rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="min-w-0 w-full">
                    <h4 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 text-[#1c1f26]">
                      Shop Hours
                    </h4>
                    <div className="space-y-1.5 sm:space-y-3 text-gray-700 text-xs sm:text-lg">
                      {content.shopHours.map((row: { label: string; hours: string }, index: number) => (
                        <p key={index}>
                          <span className="font-semibold text-[#1D73EC]">
                            {row.label || "Schedule"}:
                          </span>{" "}
                          {row.hours}
                        </p>
                      ))}
                      {content.hoursNote && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F7FF] px-2.5 py-1 text-xs font-semibold text-[#1D73EC] sm:text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          {content.hoursNote}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-8 bg-white border-2 border-[#1D73EC] shadow-xl rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#F2F7FF] rounded-full -translate-y-16 -translate-x-16" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#F2F7FF] rounded-full translate-y-12 translate-x-12" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#1D73EC] rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="min-w-0 w-full">
                    <h4 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 text-[#1c1f26]">
                      Location
                    </h4>
                    <div className="space-y-1.5 sm:space-y-3 text-gray-700 text-xs sm:text-lg">
                      {content.locationLines.map((line: string, index: number) => (
                        <p key={index} className={index === 0 ? "font-semibold text-[#1D73EC]" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <Button
                      onClick={() => setShowShopMap(true)}
                      className="mt-3 sm:mt-5 w-full bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white transition-all duration-200 active:scale-[0.97] text-xs sm:text-sm h-9 sm:h-10"
                    >
                      <MapPin className="w-4 h-4" /> Shop Location
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Job Openings Section */}
      <section
        id="jobs"
        className="bg-white w-full py-12 sm:py-16 relative z-10"
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-[#1D73EC]/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-[#2F6FD6]/[0.04] blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <span className="w-2 h-2 bg-white border-2 border-blue-200 rounded-full animate-pulse"></span>
              We're Hiring!
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-[#1c1f26] mb-4">
              Job Openings
            </h3>
            <p className="text-lg text-gray-600">
              Join our team
            </p>
          </div>

          {jobs.length === 0 ? (
            <Card className="border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-[#1D73EC]/35" />
              <p className="text-lg font-semibold text-gray-500">No open positions right now</p>
              <p className="mt-1 text-sm text-gray-400">Please check back later for new opportunities.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-6 lg:gap-8">
              {jobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                <Card key={job.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ${isExpanded ? "border-[#1D73EC] ring-2 ring-[#1D73EC]/15 shadow-md" : "border-gray-200 hover:border-[#1D73EC]/50"}`}>
                  {/* Mobile: compact accordion row (default collapsed) */}
                  <button
                    type="button"
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 p-3 text-left md:hidden"
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold leading-snug text-[#1c1f26]">{job.title}</h4>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
                        <span>
                          <span className="font-semibold text-[#1D73EC]">Schedule:</span> {job.duration}
                        </span>
                        <span>
                          <span className="font-semibold text-[#1D73EC]">Posted:</span> {job.posted || job.postedDate}
                        </span>
                        <Badge className="shrink-0 bg-blue-100 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">{job.type || "Active"}</Badge>
                      </p>
                    </div>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 ${isExpanded ? "rotate-180 border-[#1D73EC] bg-[#1D73EC] text-white" : "border-blue-200 bg-white text-[#1D73EC]"}`}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>

                  {/* Mobile: expanded description + Apply Now (smooth height animation) */}
                  <div className="md:hidden">
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                          <p className="text-xs leading-relaxed text-gray-600">{job.description}</p>
                          <Button onClick={() => navigate(`/signup?jobId=${job.id}`)} className="mt-3 w-full bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white">Apply Now</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop: full card */}
                  <div className="hidden p-6 md:flex md:flex-1 md:flex-col">
                    <div className="mb-6 flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#1D73EC]">
                        <Briefcase className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h4 className="text-lg font-bold text-[#1c1f26]">{job.title}</h4>
                          <Badge className="bg-blue-100 text-xs text-blue-700 hover:bg-blue-100">{job.type || "Active"}</Badge>
                        </div>
                        <div className="flex flex-col gap-1.5 text-sm text-gray-700 md:flex-row md:flex-wrap md:gap-x-5">
                          <p><span className="font-semibold text-[#1D73EC]">Schedule:</span> {job.duration}</p>
                          {job.location && <p><span className="font-semibold text-[#1D73EC]">Location:</span> {job.location}</p>}
                          {job.department && <p><span className="font-semibold text-[#1D73EC]">Department:</span> {job.department}</p>}
                          <p><span className="font-semibold text-[#1D73EC]">Posted:</span> {job.posted || job.postedDate}</p>
                        </div>
                      </div>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-gray-600">{job.description}</p>

                    <Button onClick={() => navigate(`/signup?jobId=${job.id}`)} className="mt-auto w-full bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white">Apply Now</Button>
                  </div>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* About Us Section */}
      <section
        id="about"
        className="bg-[#F2F7FF] w-full py-12 sm:py-16 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold text-[#1c1f26] mb-4">
              {content.aboutTitle || "About Docufy"}
            </h3>
            <p className="text-lg text-gray-600">
              {content.aboutSubtitle ||
                "Your printing companion"}
            </p>
          </div>
          <Card className="group relative overflow-hidden rounded-3xl bg-[#1D73EC] p-5 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full translate-y-8 -translate-x-8" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-white/90" />
                <span className="text-sm font-semibold uppercase tracking-wide text-white/90 sm:text-base">
                  Who we are
                </span>
              </div>

              {/* Body */}
              <p className="mt-4 text-center text-sm leading-relaxed text-white/95 sm:text-lg">
                {content.aboutBody ||
                  "Docufy is a modern printing management system designed to make document printing and tracking easier for students, faculty, and staff. With our user-friendly platform, you can upload documents, place print orders, track your requests in real-time, and manage everything from a single dashboard. We're committed to providing fast, reliable, and affordable printing services to the academic community."}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/90 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex items-center gap-2.5">
              <img
                src={logoImage}
                alt="Docufy Logo"
                className="h-8 w-8 rounded-full"
              />
              <div>
                <h1 className="text-sm font-bold text-[#1c1f26]">Docufy</h1>
                <p className="text-[11px] text-gray-500">Your Printing Companion</p>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs text-gray-500 sm:text-sm">
              <button
                onClick={() => setShowTerms(true)}
                className="transition-colors hover:text-[#1D73EC]"
              >
                Terms
              </button>
              <button
                onClick={() => setShowPrivacy(true)}
                className="transition-colors hover:text-[#1D73EC]"
              >
                Privacy
              </button>
            </div>

            <p className="text-xs text-gray-400 md:text-sm">
              &copy; 2026 Docufy PSMS
            </p>
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

      {/* Shop Location Dialog */}
      <Dialog open={showShopMap} onOpenChange={setShowShopMap}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#1D73EC]" /> Shop Location
            </DialogTitle>
            <DialogDescription>
              {content.locationLines.filter(Boolean).join(", ")}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border-2 border-blue-100">
            <iframe
              title="Docufy Printing Services - Shop Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3931.8605234742895!2d118.7358141!3d9.777867299999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33b5632f84660cb3%3A0x6c411581676a62cf!2sDocufy%20Printing%20Services!5e0!3m2!1sen!2sph!4v1788133073002!5m2!1sen!2sph"
              className="w-full h-72 border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          {shopPhotos.length > 0 && (
            <div className="mt-4">
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
          )}
        </DialogContent>
      </Dialog>

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