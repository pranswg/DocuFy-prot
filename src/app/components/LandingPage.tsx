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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bookmark,
  LayoutTemplate,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { jobsStore } from "../utils/jobsStore";
import { pricingStore, type PricingValues } from "../utils/pricingStore";
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
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showShopMap, setShowShopMap] = useState(false);
  const [pricing, setPricing] = useState<PricingValues>(pricingStore.getPricing());
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const servicesCarouselRef = useRef<HTMLDivElement>(null);
  const [activeService, setActiveService] = useState(0);
  const [docColorMode, setDocColorMode] = useState<"bw" | "color">("bw");
  const [showAboutMore, setShowAboutMore] = useState(false);

  useEffect(() => {
    const load = () => setPricing(pricingStore.getPricing());
    return pricingStore.subscribe(load);
  }, []);

  // Load landing page content from localStorage or use defaults
  const getContent = () => {
    const saved = localStorage.getItem("landing_content");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to defaults
      }
    }
    return {
      heroTitle: "Print, Track, Succeed",
      heroSubtitle: "Your Printing Companion",
      heroDescription:
        "Upload, print, and track your documents with ease. Professional printing services designed for students and faculty.",
      feature1: "Upload documents instantly",
      feature2: "Real-time order tracking",
      feature3: "Secure payment verification",
      bindingPrice: "20",
      hoursMonFri: "8:00 AM - 6:00 PM",
      hoursSat: "9:00 AM - 4:00 PM",
      hoursSun: "Closed",
      locationCampus: "Palawan State University - Main Campus",
      locationRoom: "Room 4, TBI Building",
      locationBuilding: "Puerto Princesa City, 5300 Palawan",
      aboutTitle: "About Docufy",
      aboutSubtitle: "Your printing companion",
      aboutBody:
        "Docufy is a modern printing management system designed to make document printing and tracking easier for students, faculty, and staff. With our user-friendly platform, you can upload documents, place print orders, track your requests in real-time, and manage everything from a single dashboard. We're committed to providing fast, reliable, and affordable printing services to the academic community.",
    };
  };

  const content = getContent();
  const jobs = jobsStore.getActiveJobs();

  useEffect(() => {
    const el = servicesCarouselRef.current;
    if (!el) return;

    const update = () => {
      if (window.innerWidth < 768) {
        const cards = Array.from(
          el.querySelectorAll<HTMLElement>("[data-service-card]")
        );
        cards.forEach((card) => {
          const cardRect = card.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const center = elRect.left + elRect.width / 2;
          const distance = Math.abs(cardCenter - center) / cardRect.width;

          const scale = Math.max(1 - distance * 0.28, 0.75);
          const opacity = Math.max(1 - distance * 1.1, 0.35);
          card.style.transform = `scale(${scale})`;
          card.style.opacity = opacity.toFixed(2);
          card.style.zIndex = String(Math.round((1 - distance) * 10));
        });
      } else {
        el.querySelectorAll<HTMLElement>("[data-service-card]").forEach(
          (card) => {
            card.style.transform = "";
            card.style.zIndex = "";
            card.style.opacity = "";
          }
        );
      }

      const cards = el.querySelectorAll<HTMLElement>("[data-service-card]");
      if (!cards.length) return;
      const elRect = el.getBoundingClientRect();
      const center = elRect.left + elRect.width / 2;
      let closestIndex = 0;
      let closestDist = Infinity;
      cards.forEach((card, i) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const dist = Math.abs(cardCenter - center);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });
      setActiveService(closestIndex);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Auto-center the active card when the services section enters the viewport
  useEffect(() => {
    const section = document.getElementById("services");
    if (!section) return;

    // Center the initial card on mount
    const timer = setTimeout(() => {
      const el = servicesCarouselRef.current;
      if (!el) return;
      const cards = el.querySelectorAll<HTMLElement>("[data-service-card]");
      const target = cards[activeService];
      if (!target) return;
      const cardRect = target.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta = cardRect.left - elRect.left - (el.clientWidth - cardRect.width) / 2;
      el.scrollTo({ left: el.scrollLeft + delta, behavior: "smooth" });
    }, 500);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const el = servicesCarouselRef.current;
          if (!el) return;
          const cards = el.querySelectorAll<HTMLElement>("[data-service-card]");
          const target = cards[activeService];
          if (!target) return;
          const cardRect = target.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const delta = cardRect.left - elRect.left - (el.clientWidth - cardRect.width) / 2;
          el.scrollTo({ left: el.scrollLeft + delta, behavior: "smooth" });
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [activeService]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const goToService = (index: number) => {
    const el = servicesCarouselRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-service-card]");
    if (!cards.length) return;
    setActiveService(index);
    const target = cards[Math.min(Math.max(index, 0), cards.length - 1)];
    const cardRect = target.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta = cardRect.left - elRect.left - (el.clientWidth - cardRect.width) / 2;
    el.scrollTo({ left: el.scrollLeft + delta, behavior: "smooth" });
  };

  const services = [
    {
      id: "document",
      icon: <Printer className="h-5 w-5 text-[#1D73EC]" />,
      iconBox: "bg-[#F2F7FF]",
      title: "Standard Document Printing",
      iconColor: "text-[#1D73EC]",
      toggle: true,
      cta: "Order Now",
    },
    {
      id: "binding",
      icon: <Bookmark className="h-5 w-5 text-[#1D73EC]" />,
      iconBox: "bg-[#F2F7FF]",
      title: "Binding & Finishing",
      iconColor: "text-[#1D73EC]",
      toggle: false,
      cta: "Order Now",
    },
    {
      id: "encoding",
      icon: <LayoutTemplate className="h-5 w-5 text-[#1D73EC]" />,
      iconBox: "bg-[#F2F7FF]",
      title: "Document Encoding & Layout",
      iconColor: "text-[#1D73EC]",
      toggle: false,
      cta: "Order Now",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F2F7FF] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-[#1D73EC] rounded-full opacity-5 blur-3xl -translate-x-48 -translate-y-48 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-[#10316B] rounded-full opacity-5 blur-3xl translate-x-48 translate-y-48 pointer-events-none" />
      <div className="fixed top-1/3 left-1/3 w-64 h-64 bg-[#1D73EC] rounded-full opacity-5 blur-3xl pointer-events-none" />

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
              <p className="hidden text-xs text-gray-500 sm:block">
                Your Printing Companion
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-8">
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection("home")}
                className="text-[#1c1f26] hover:text-[#1D73EC] transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("services")}
                className="text-[#1c1f26] hover:text-[#1D73EC] transition-colors font-medium"
              >
                Services & Pricing
              </button>
              <button
                onClick={() => scrollToSection("shop-info")}
                className="text-[#1c1f26] hover:text-[#1D73EC] transition-colors font-medium"
              >
                Shop Info
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-[#1c1f26] hover:text-[#1D73EC] transition-colors font-medium"
              >
                About Us
              </button>
            </nav>

            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="h-9 border-[#1D73EC] px-3 text-xs text-[#1D73EC] hover:bg-[#1D73EC] hover:text-white sm:h-10 sm:px-4 sm:text-sm"
            >
              Log In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="home"
        className="bg-white w-full pt-24 sm:pt-32 pb-10 sm:pb-20 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                  className="bg-[#1D73EC] text-white hover:bg-[#10316B] transition-all active:scale-95 shadow-md shadow-[#1D73EC]/25"
                  onClick={() => navigate("/signup")}
                >
                  Get Started{" "}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              {/* Features List */}
              <div className="mt-10 space-y-3">
                {[
                  content.feature1,
                  content.feature2,
                  content.feature3,
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-[#1c1f26]"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#1D73EC]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center lg:flex">
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
          <div className="flex items-center justify-end gap-2 mb-4 md:mb-6">
            <button
              onClick={() => { setActiveService((p) => Math.max(p - 1, 0)); goToService(activeService - 1); }}
              aria-label="Previous service"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-white text-[#1D73EC] transition-all hover:bg-[#1D73EC] hover:text-white hover:-translate-y-0.5 hover:shadow-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveService((p) => Math.min(p + 1, 2)); goToService(activeService + 1); }}
              aria-label="Next service"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-white text-[#1D73EC] transition-all hover:bg-[#1D73EC] hover:text-white hover:-translate-y-0.5 hover:shadow-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div ref={servicesCarouselRef} className="md:grid md:grid-cols-3 gap-6 lg:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none flex md:gap-6 gap-4 pb-2 md:pb-0 items-stretch [&>*]:transition-transform [&>*]:duration-300 [&>*]:will-change-transform">
            {/* Card 1: Standard Document Printing (B&W / Color toggle) */}
            <Card data-service-card onClick={() => goToService(0)} onTouchStart={() => setActiveService(0)} className={`cursor-pointer transition-all duration-300 border-2 p-4 rounded-xl snap-center md:snap-align-none min-w-[200px] md:min-w-0 w-[200px] md:w-auto aspect-square md:aspect-auto flex flex-col ${activeService === 0 ? "bg-[#F0F7FF] border-[#1D73EC] shadow-xl ring-2 ring-[#1D73EC]/40" : "bg-white border-[#E2E8F0] shadow-sm hover:shadow-md"}`}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F7FF]">
                  <Printer className="h-4 w-4 text-[#1D73EC]" />
                </div>
                <h4 className="text-xs font-bold leading-snug text-[#1c1f26]">
                  Standard Document Printing
                </h4>
              </div>

              <div className="mb-2.5 inline-flex w-fit items-center rounded-full border border-blue-200 bg-[#F2F7FF] p-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setDocColorMode("bw"); }}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${docColorMode === "bw" ? "bg-[#1D73EC] text-white shadow-sm" : "text-gray-500 hover:text-[#1D73EC]"}`}
                >
                  B&W
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDocColorMode("color"); }}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${docColorMode === "color" ? "bg-[#1D73EC] text-white shadow-sm" : "text-gray-500 hover:text-[#1D73EC]"}`}
                >
                  <Sparkles className="h-3 w-3" />
                  Color
                </button>
              </div>

              <div className="mb-2 flex items-baseline gap-0.5 text-[#1D73EC]">
                <span className="text-sm font-semibold">₱</span>
                <span className="text-2xl font-bold leading-none">
                  {docColorMode === "bw" ? pricing.bw.toFixed(2) : pricing.colorHigh.toFixed(2)}
                </span>
                <span className="ml-1 text-[10px] font-medium text-gray-500">/ page</span>
              </div>
              <p className="mb-3 text-[11px] leading-snug text-gray-600">
                {docColorMode === "bw"
                  ? "Crisp B&W prints for documents, handouts, and thesis drafts."
                  : "Vibrant full-color prints for presentations, posters, and photos."}
              </p>
              <div className="mt-auto">
                <Button
                  onClick={(e) => { e.stopPropagation(); navigate("/signup"); }}
                  className="w-full bg-[#1D73EC] text-xs text-white hover:bg-[#10316B] h-8"
                >
                  Order Now
                </Button>
              </div>
            </Card>

            {/* Card 2: Binding & Finishing */}
            <Card data-service-card onClick={() => goToService(1)} onTouchStart={() => setActiveService(1)} className={`cursor-pointer transition-all duration-300 border-2 p-4 rounded-xl snap-center md:snap-align-none min-w-[200px] md:min-w-0 w-[200px] md:w-auto aspect-square md:aspect-auto flex flex-col ${activeService === 1 ? "bg-[#F0F7FF] border-[#1D73EC] shadow-xl ring-2 ring-[#1D73EC]/40" : "bg-white border-[#E2E8F0] shadow-sm hover:shadow-md"}`}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F7FF]">
                  <Bookmark className="h-4 w-4 text-[#1D73EC]" />
                </div>
                <h4 className="text-xs font-bold leading-snug text-[#1c1f26]">
                  Binding & Finishing
                </h4>
              </div>

              <div className="mb-2 flex items-baseline gap-0.5 text-[#1D73EC]">
                <span className="text-sm font-semibold">₱</span>
                <span className="text-2xl font-bold leading-none">{content.bindingPrice}+</span>
                <span className="ml-1 text-[10px] font-medium text-gray-500">starting</span>
              </div>
              <ul className="mb-3 space-y-1 text-[11px] text-gray-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-[#1D73EC]" /> Coil binding
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-[#1D73EC]" /> Stapled & stapleless
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-[#1D73EC]" /> Hardbound covers
                </li>
              </ul>
              <div className="mt-auto">
                <Button
                  onClick={(e) => { e.stopPropagation(); navigate("/signup"); }}
                  className="w-full bg-[#1D73EC] text-xs text-white hover:bg-[#10316B] h-8"
                >
                  Order Now
                </Button>
              </div>
            </Card>

            {/* Card 3: Document Encoding & Layout */}
            <Card data-service-card onClick={() => goToService(2)} onTouchStart={() => setActiveService(2)} className={`cursor-pointer transition-all duration-300 border-2 p-4 rounded-xl snap-center md:snap-align-none min-w-[200px] md:min-w-0 w-[200px] md:w-auto aspect-square md:aspect-auto flex flex-col ${activeService === 2 ? "bg-[#F0F7FF] border-[#1D73EC] shadow-xl ring-2 ring-[#1D73EC]/40" : "bg-white border-[#E2E8F0] shadow-sm hover:shadow-md"}`}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F7FF]">
                  <LayoutTemplate className="h-4 w-4 text-[#1D73EC]" />
                </div>
                <h4 className="text-xs font-bold leading-snug text-[#1c1f26]">
                  Document Encoding & Layout
                </h4>
              </div>

              <div className="mb-2 flex items-baseline gap-0.5 text-[#1D73EC]">
                <span className="text-2xl font-bold leading-none">Custom</span>
                <span className="ml-1 text-[10px] font-medium text-gray-500">/ document</span>
              </div>
              <p className="mb-3 text-[11px] leading-snug text-gray-600">
                Custom layout design, formatting, and encoding for student theses, reports, and faculty documents.
              </p>
              <div className="mt-auto">
                <Button
                  onClick={(e) => { e.stopPropagation(); navigate("/signup"); }}
                  className="w-full bg-[#1D73EC] text-xs text-white hover:bg-[#10316B] h-8"
                >
                  Order Now
                </Button>
              </div>
            </Card>
          </div>

          {/* Pagination dots */}
          <div className="mt-5 flex items-center justify-center gap-2 md:hidden">
            {services.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goToService(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${activeService === i ? "w-6 bg-[#1D73EC]" : "w-2.5 bg-blue-200 hover:bg-[#1D73EC]/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Shop Info */}
      <section
        id="shop-info"
        className="bg-white w-full py-12 sm:py-16 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                      <p>
                        <span className="font-semibold text-[#1D73EC]">
                          Mon - Fri:
                        </span>{" "}
                        {content.hoursMonFri}
                      </p>
                      <p>
                        <span className="font-semibold text-[#1D73EC]">
                          Sat:
                        </span>{" "}
                        {content.hoursSat}
                      </p>
                      <p>
                        <span className="font-semibold text-[#1D73EC]">
                          Sun:
                        </span>{" "}
                        {content.hoursSun}
                      </p>
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
                      <p className="font-semibold text-[#1D73EC]">
                        {content.locationCampus}
                      </p>
                      <p>{content.locationRoom}</p>
                      <p>{content.locationBuilding}</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                        <Badge className="shrink-0 bg-blue-100 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">Active</Badge>
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
                  <div className="hidden p-6 md:block">
                    <div className="mb-6 flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#1D73EC]">
                        <Briefcase className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h4 className="text-lg font-bold text-[#1c1f26]">{job.title}</h4>
                          <Badge className="bg-blue-100 text-xs text-blue-700 hover:bg-blue-100">Active</Badge>
                        </div>
                        <div className="flex flex-col gap-1.5 text-sm text-gray-700 md:flex-row md:flex-wrap md:gap-x-5">
                          <p><span className="font-semibold text-[#1D73EC]">Schedule:</span> {job.duration}</p>
                          {job.location && <p><span className="font-semibold text-[#1D73EC]">Location:</span> {job.location}</p>}
                        </div>
                      </div>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-gray-600">{job.description}</p>

                    <Button onClick={() => navigate(`/signup?jobId=${job.id}`)} className="mt-5 w-full bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white">Apply Now</Button>
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

              {/* Collapsed: short preview */}
              <div className="mt-3 text-center sm:hidden">
                <p className="text-sm leading-relaxed text-white/95">
                  Docufy is a modern printing management system for students, faculty, and staff.
                </p>
              </div>

              {/* Mobile expandable body */}
              <div className="sm:hidden">
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showAboutMore ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="pt-3 text-center">
                      <p className="text-sm leading-relaxed text-white/95">
                        {content.aboutBody ||
                          "Docufy is a modern printing management system designed to make document printing and tracking easier for students, faculty, and staff. With our user-friendly platform, you can upload documents, place print orders, track your requests in real-time, and manage everything from a single dashboard. We're committed to providing fast, reliable, and affordable printing services to the academic community."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile toggle */}
              <div className="mt-3 text-center sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowAboutMore((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 active:scale-95"
                  aria-expanded={showAboutMore}
                >
                  {showAboutMore ? "Show less" : "Show more"}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showAboutMore ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Desktop: full body */}
              <div className="hidden sm:block">
                <p className="mt-4 text-center text-lg leading-relaxed text-white sm:text-xl">
                  {content.aboutBody ||
                    "Docufy is a modern printing management system designed to make document printing and tracking easier for students, faculty, and staff. With our user-friendly platform, you can upload documents, place print orders, track your requests in real-time, and manage everything from a single dashboard. We're committed to providing fast, reliable, and affordable printing services to the academic community."}
                </p>
              </div>
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
              <button className="transition-colors hover:text-[#1D73EC]">
                Contact
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
              {content.locationCampus}, {content.locationRoom},{" "}
              {content.locationBuilding}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}