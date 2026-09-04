import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Settings,
  FileCheck,
  CheckCircle,
  Package,
  Briefcase,
  AlertCircle,
  X,
  Smartphone,
  Banknote,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  Info,
  ChevronDown,
  QrCode,
  Bell,
  Camera,
  Layers,
  StickyNote,
  User,
  LayoutGrid,
  Clock,
  Boxes,
} from "lucide-react";

import { toast } from "sonner";
import Layout from "../Layout";
import StaffTimeInGate from "./StaffTimeInGate";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { formatCurrency } from "../../utils/formatNumber";
import { todayPHTKey } from "../../utils/pht";
import { formatPHTime } from "../../utils/pht";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { useAuth } from "../../contexts/AuthContext";
import { dataStore } from "../../utils/dataStore";
import { ordersStore } from "../../utils/ordersStore";
import { inventoryStore } from "../../utils/inventoryStore";
import { notificationStore } from "../../utils/notificationStore";
import {
  paymentMethodsStore,
  type PaymentMethodType,
} from "../../utils/paymentMethodsStore";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  pricingStore,
  formatPrice,
  getPriceFromMatrix,
  resolveColorTier,
  mapPaperSizeKey,
  CONTENT_TYPE_LABELS,
  PHOTO_SIZE_LABELS,
  type ContentType,
  type ServiceType,
  type PhotoSizeKey,
  type PricingValues,
  type ColorTier,
} from "../../utils/pricingStore";
import PaymentMethodQRPanel from "./PaymentMethodQR";

const ALLOWED_FILE_TYPES = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    ".xlsx",
  "text/plain": ".txt",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const staffMenuItems = [
  { label: "Dashboard", path: "/staff/dashboard", icon: <LayoutGrid className="w-5 h-5" /> },
  { label: "Clock-In & Timesheet", path: "/staff/timesheet", icon: <Clock className="w-5 h-5" /> },
  { label: "Walk-in Transactions", path: "/staff/walk-in", icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Payment Verification", path: "/staff/payment-verification", icon: <CreditCard className="w-5 h-5" /> },
  { label: "Orders", path: "/staff/queue", icon: <Package className="w-5 h-5" /> },
  { label: "Inventory", path: "/staff/inventory", icon: <Boxes className="w-5 h-5" /> },
  { label: "Notifications", path: "/staff/notifications", icon: <Bell className="w-5 h-5" /> },
];

const customerMenuItems = [
  {
    label: "Dashboard",
    path: "/customer/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Print Request",
    path: "/customer/new-request",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    label: "My Orders",
    path: "/customer/orders",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Job Board",
    path: "/customer/job-board",
    icon: <Briefcase className="w-5 h-5" />,
  },
];

function scrollPageToTop() {
  window.scrollTo(0, 0);
  document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
}

function isImageFile(file: File): boolean {
  const ext = file.name.toLowerCase().split(".").pop();
  return ext === "jpg" || ext === "jpeg" || ext === "png";
}

type ColorAnalysis = {
  totalPages: number;
  colorPages: number[];
  bwPages: number[];
  colorPercentages: { [page: number]: number };
};

type FileData = {
  id: string;
  file: File;
  fileName: string;
  pageCount: number;
  colorAnalysis: ColorAnalysis | null;
  contentType: ContentType;
  printType: "" | "document" | "vellum" | "sticker" | "photo";
  paperSize: string;
  copies: number;
  colorMode: string;
  pagesPerSheet: string;
  orientation: string;
  pageRange: string;
  specificPages: string;
  twoSided: string;
  margins: string;
  scale: string;
  customScale: number;
  notes: string;
  photoSize: PhotoSizeKey;
  photoFinish: "matte" | "glossy";
  photoQty: number;
};

interface PrintTransactionProps {
  mode: "customer" | "walkin";
  userRole?: "admin" | "staff";
}

// Draft + pending-order persistence so an online payment order is only pushed to
// the system once the customer actually submits their payment reference, and so
// returning to the print request resumes where they left off.
const PRINT_DRAFT_KEY = "docufy_print_draft";
const PENDING_ORDER_KEY = "docufy_pending_online_order";

type PrintDraft = {
  orderId: string;
  files: Array<{
    id: string;
    fileName: string;
    pageCount: number;
    contentType: ContentType;
    printType: FileData["printType"];
    paperSize: string;
    copies: number;
    colorMode: string;
    pagesPerSheet: string;
    orientation: string;
    pageRange: string;
    specificPages: string;
    twoSided: string;
    margins: string;
    scale: string;
    customScale: number;
    notes: string;
    photoSize: PhotoSizeKey;
    photoFinish: "matte" | "glossy";
    photoQty: number;
  }>;
  selectedAddons: { [key: string]: number };
  serviceType: ServiceType;
  paymentMethod: string;
  currentStep: number;
};

function savePrintDraft(draft: PrintDraft) {
  sessionStorage.setItem(PRINT_DRAFT_KEY, JSON.stringify(draft));
}

function readPrintDraft(): PrintDraft | null {
  try {
    const raw = sessionStorage.getItem(PRINT_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as PrintDraft) : null;
  } catch {
    return null;
  }
}

function clearPrintDraft() {
  sessionStorage.removeItem(PRINT_DRAFT_KEY);
}

function savePendingOrder(payload: Record<string, unknown>) {
  sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(payload));
}

function readPendingOrder():
  | (Record<string, unknown> & { id: string })
  | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> & { id?: string };
    return parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

function clearPendingOrder() {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
}

function NumberStepper({
  value,
  min = 1,
  onCommit,
}: {
  value: number;
  min?: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (n: number) => {
    const safe = Math.max(min, n || min);
    setDraft(String(safe));
    onCommit(safe);
  };

  return (
    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-fit">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => commit((Number(draft) || min) - 1)}
        disabled={Number(draft) <= min}
        className="p-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="w-4 h-4" />
      </button>
      <Input
        type="number"
        min={min}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (!draft || Number(draft) < min) commit(min);
          else commit(Number(draft));
        }}
        className="h-10 w-16 rounded-none border-0 text-center font-bold text-gray-900 focus-visible:ring-0 focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase"
        onClick={() => commit((Number(draft) || min) + 1)}
        className="p-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function PrintTransaction({ mode, userRole }: PrintTransactionProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isWalkin = mode === "walkin";
  const role = userRole || "staff";

  const [currentStep, setCurrentStep] = useState(1);
  const [fileError, setFileError] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showColorPricing, setShowColorPricing] = useState(false);
  const [breakdownFileId, setBreakdownFileId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingValues>(pricingStore.getPricing());
  const downPaymentThreshold = pricing.downPaymentThreshold;
  useEffect(() => {
    const load = () => setPricing(pricingStore.getPricing());
    return pricingStore.subscribe(load);
  }, []);
  const [showAllAnalysis, setShowAllAnalysis] = useState<{
    [fileId: string]: boolean;
  }>({});
  const [showDetectedPages, setShowDetectedPages] = useState<{
    [fileId: string]: boolean;
  }>({});
  const [files, setFiles] = useState<FileData[]>([]);
  const [serviceType, setServiceType] = useState<ServiceType>("document");

  // Walk-in customer info
  const [customerType, setCustomerType] = useState("walkin");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Payment (customer only)
  const [paymentMethod, setPaymentMethod] = useState("");
  const [onlineMethods, setOnlineMethods] = useState<PaymentMethodType[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);

  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<{
    [key: string]: number;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPlaceOrderConfirm, setShowPlaceOrderConfirm] = useState(false);
  const [showProceedConfirm, setShowProceedConfirm] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [expandedFileSettings, setExpandedFileSettings] = useState<Record<string, boolean>>({});
  const [submittedOrderId, setSubmittedOrderId] = useState("");
  const [availablePaperSizes, setAvailablePaperSizes] = useState<
    Array<{
      id: string;
      name: string;
      displayName: string;
      inStock: boolean;
    }>
  >([]);
  const [availableAddons, setAvailableAddons] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      inStock: boolean;
      unit: string;
      category: string;
      description: string;
    }>
  >([]);

  useEffect(() => {
    const load = () => {
      setAvailablePaperSizes(inventoryStore.getPaperSizeOptions());
      setAvailableAddons(inventoryStore.getAddons());
    };
    load();
    const unsubscribe = inventoryStore.subscribe(load);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadMethods = () =>
      setOnlineMethods(paymentMethodsStore.getPaymentMethods());
    loadMethods();
    const unsubscribe = paymentMethodsStore.subscribe(loadMethods);
    return unsubscribe;
  }, []);

  // Resume an in-progress online payment print request. If the customer backed
  // out of payment verification (or left via the sidebar) before submitting
  // their reference, restore the draft so they continue where they left off.
  const [isResumed, setIsResumed] = useState(false);
  useEffect(() => {
    if (isWalkin) return;
    const draft = readPrintDraft();
    if (!draft) return;
    const restoredFiles: FileData[] = draft.files.map((f) => ({
      id: f.id,
      file: new File([], f.fileName),
      fileName: f.fileName,
      pageCount: f.pageCount,
      colorAnalysis: null,
      contentType: f.contentType,
      printType: f.printType,
      paperSize: f.paperSize,
      copies: f.copies,
      colorMode: f.colorMode,
      pagesPerSheet: f.pagesPerSheet,
      orientation: f.orientation,
      pageRange: f.pageRange,
      specificPages: f.specificPages,
      twoSided: f.twoSided,
      margins: f.margins,
      scale: f.scale,
      customScale: f.customScale,
      notes: f.notes,
      photoSize: f.photoSize,
      photoFinish: f.photoFinish,
      photoQty: f.photoQty,
    }));
    setFiles(restoredFiles);
    setSelectedAddons(draft.selectedAddons || {});
    setServiceType(draft.serviceType || "document");
    setPaymentMethod(draft.paymentMethod || "");
    if (draft.paymentMethod) {
      setSubmittedOrderId(draft.orderId);
    }
    // Bring the customer straight to the payment review step.
    setCurrentStep(4);
    setIsResumed(true);

    // Resume at payment verification when the customer arrives here via the
    // sidebar "Print Request" (or browser back). The in-page "Go Back" button
    // in payment verification passes fromPaymentVerification:true so the order
    // can instead be reviewed/edited on the previous step without jumping away.
    if (
      draft.paymentMethod &&
      !location.state?.fromPaymentVerification
    ) {
      navigate(`/customer/payment/${draft.orderId}`, {
        replace: true,
        state: { paymentMethod: draft.paymentMethod, showSuccessAfter: true },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMethod = onlineMethods.find(
    (m) => m.name === paymentMethod,
  );
  const isOnline = paymentMethod !== "" && paymentMethod !== "cash";
  const isGcash = isOnline && paymentMethod.toLowerCase() === "gcash";

  const viewMethodQR = (name: string) => {
    setPaymentMethod(name);
    setShowQRModal(true);
  };

  const handleEmailChange = (email: string) => {
    setCustomerEmail(email);
    if (customerType === "registered" && email) {
      const orders = dataStore.getOrders();
      const customerOrder = orders.find((order) => order.customerEmail === email);
      if (customerOrder) {
        setCustomerName(customerOrder.customerName);
      } else {
        setCustomerName("");
      }
    }
  };

  const noteTemplates = [
    "Please staple per set",
    "Front page color only",
    "Please arrange pages in order",
    "Bind on left side",
  ];

  const detectPageCount = async (file: File): Promise<number> => {
    const fileExtension = file.name.toLowerCase().split(".").pop();

    if (fileExtension === "pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const text = new TextDecoder("latin1").decode(uint8Array);
        const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
        if (pageMatches && pageMatches.length > 0) {
          return pageMatches.length;
        }
        return Math.max(1, Math.ceil(file.size / 102400));
      } catch (error) {
        console.error("Error reading PDF:", error);
        return Math.max(1, Math.ceil(file.size / 102400));
      }
    } else if (fileExtension === "doc" || fileExtension === "docx") {
      return Math.max(1, Math.ceil(file.size / 51200));
    } else if (fileExtension === "ppt" || fileExtension === "pptx") {
      return Math.max(1, Math.ceil(file.size / 153600));
    } else if (fileExtension === "xls" || fileExtension === "xlsx") {
      return Math.max(1, Math.ceil(file.size / 50000));
    } else if (fileExtension === "txt") {
      return Math.max(1, Math.ceil(file.size / 3000));
    } else if (fileExtension === "jpg" || fileExtension === "jpeg" || fileExtension === "png") {
      return 1;
    }
    return 1;
  };

  const analyzeColorContent = async (pageCount: number): Promise<ColorAnalysis> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const colorPages: number[] = [];
    const bwPages: number[] = [];
    const colorPercentages: { [page: number]: number } = {};
    for (let i = 1; i <= pageCount; i++) {
      const hasColor = Math.random() > 0.6;
      if (hasColor) {
        colorPages.push(i);
        colorPercentages[i] = Math.floor(Math.random() * 70) + 15;
      } else {
        bwPages.push(i);
        colorPercentages[i] = 0;
      }
    }
    return {
      totalPages: pageCount,
      colorPages,
      bwPages,
      colorPercentages,
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    setFileError("");

    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesToProcess = Array.from(selectedFiles);

    for (const file of filesToProcess) {
      const fileType = file.type;
      const fileExtension = "." + file.name.toLowerCase().split(".").pop();

      const isValidType =
        Object.keys(ALLOWED_FILE_TYPES).includes(fileType) ||
        Object.values(ALLOWED_FILE_TYPES).includes(fileExtension);

      if (!isValidType) {
        setFileError(
          `Unsupported file format in "${file.name}". Please upload PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, or PNG files only.`,
        );
        e.target.value = "";
        return;
      }
    }

    setIsProcessingFile(true);

    try {
      const processedFiles: FileData[] = [];

      for (const file of filesToProcess) {
        const pageCount = await detectPageCount(file);
        const fileId = Math.random().toString(36).substr(2, 9);

        const newFile: FileData = {
          id: fileId,
          file,
          fileName: file.name,
          pageCount,
          colorAnalysis: null,
          contentType: isImageFile(file) ? "imageOnly" : "text",
          printType: "",
          paperSize: availablePaperSizes.length > 0 ? availablePaperSizes[0].name : "a4",
          copies: 1,
          colorMode: "bw",
          pagesPerSheet: "1",
          orientation: "portrait",
          pageRange: "all",
          specificPages: "",
          twoSided: "no",
          margins: "default",
          scale: "default",
          customScale: 100,
          notes: "",
          photoSize: "2R",
          photoFinish: "matte",
          photoQty: 1,
        };

        processedFiles.push(newFile);
      }

      setFiles((prev) => [...prev, ...processedFiles]);
      setIsProcessingFile(false);

      for (const processedFile of processedFiles) {
        setAnalyzingFileId(processedFile.id);
        const colorAnalysis = await analyzeColorContent(processedFile.pageCount);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === processedFile.id
              ? {
                  ...f,
                  colorAnalysis,
                  colorMode:
                    colorAnalysis.colorPages.length > 0
                      ? "colored"
                      : "bw",
                }
              : f,
          ),
        );
        setAnalyzingFileId(null);
      }
    } catch (error) {
      setFileError("Error processing files. Please try again.");
      console.error(error);
      setIsProcessingFile(false);
      setAnalyzingFileId(null);
    } finally {
      e.target.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const updateFileOption = (
    fileId: string,
    field: keyof Omit<FileData, "id" | "file" | "fileName" | "pageCount">,
    value: any,
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, [field]: value } : f)),
    );
  };

  const calculateFileTotal = (fileData: FileData) => {
    if (fileData.printType === "photo") {
      const matrix = pricingStore.getMatrix();
      const size = matrix.photo[fileData.photoSize];
      return (size ? size.price : 0) * Math.max(1, fileData.photoQty);
    }

    const {
      pageCount,
      copies,
      colorMode,
      paperSize,
      contentType,
      colorAnalysis,
      pagesPerSheet,
    } = fileData;
    const validCopies = Math.max(1, copies);

    let tierPct: number;
    if (colorMode !== "colored") {
      tierPct = 0;
    } else if (colorAnalysis && colorAnalysis.colorPages.length > 0) {
      const sum = colorAnalysis.colorPages.reduce(
        (acc, p) => acc + (colorAnalysis.colorPercentages[p] ?? 0),
        0,
      );
      tierPct = sum / colorAnalysis.colorPages.length;
    } else {
      tierPct = 100;
    }
    const colorTier = resolveColorTier(
      colorMode === "colored" ? "colored" : "bw",
      tierPct,
    );

    const sizeKey = mapPaperSizeKey(paperSize);
    const matrix = pricingStore.getMatrix();
    const perPage = getPriceFromMatrix(
      matrix,
      (fileData.printType as ServiceType) || serviceType,
      {
        contentType,
        colorTier,
        sizeKey,
      },
    );

    let baseTotal = perPage * pageCount * validCopies;

    const pagesPerSheetNum = parseInt(pagesPerSheet);
    if (pagesPerSheetNum > 1) {
      baseTotal = baseTotal / pagesPerSheetNum;
    }

    return Math.max(0, baseTotal);
  };

  const matrixRatesFor = (fileData: FileData) => {
    const matrix = pricingStore.getMatrix();
    const svc = (fileData.printType as ServiceType) || serviceType;
    const sizeKey = mapPaperSizeKey(fileData.paperSize);
    const ctype = fileData.contentType;
    const rate = (colorTier: ColorTier) =>
      getPriceFromMatrix(matrix, svc, {
        contentType: ctype,
        colorTier,
        sizeKey,
      });
    return { bw: rate("bw"), partial: rate("partial"), full: rate("full") };
  };

  const calculateTotal = () => {
    const filesTotal = files.reduce(
      (sum, file) => sum + calculateFileTotal(file),
      0,
    );
    const addonsTotal = Object.entries(selectedAddons).reduce(
      (sum, [addonId, qty]) => {
        const addon = availableAddons.find((a) => a.id === addonId);
        return sum + (addon ? addon.price * qty : 0);
      },
      0,
    );
    return filesTotal + addonsTotal;
  };

  const validatePhotoMinQty = (): boolean => {
    for (const f of files) {
      if (f.printType === "photo") {
        const matrix = pricingStore.getMatrix();
        const item = matrix.photo[f.photoSize];
        const minQty = item ? item.minQty : 0;
        if (minQty > 0 && f.photoQty < minQty) {
          toast.error(
            `${PHOTO_SIZE_LABELS[f.photoSize]} photos (${f.fileName}) require a minimum of ${minQty} pcs.`,
          );
          return false;
        }
      }
    }
    return true;
  };

  const resetForm = () => {
    setFiles([]);
    setSelectedAddons({});
    setServiceType("document");
    setPaymentMethod("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerType("walkin");
    setCurrentStep(1);
  };

  const handleProceedToQueue = () => {
    const total = calculateTotal();
    const orderId = dataStore.getNextOrderId();
    const transactionId = orderId;

    if (!validatePhotoMinQty()) return;

    const now = new Date();

    if (files.length > 0) {
      const totalPages = files.reduce((sum, f) => sum + f.pageCount * f.copies, 0);
      const hasColor = files.some((f) => f.colorMode === "colored");
      const hasPhoto = files.some((f) => f.printType === "photo");
      const firstPhoto = files.find((f) => f.printType === "photo");

      const newOrder = {
        id: orderId,
        customer: customerType === "walkin" ? "Walk-in Customer" : customerName || "Walk-in Customer",
        pages: totalPages > 0 ? totalPages : firstPhoto ? firstPhoto.photoQty : 0,
        type: hasPhoto ? "Photo" : hasColor ? "Colored" : "B&W",
        notes: hasPhoto
          ? `Walk-in photo print - ${files.filter((f) => f.printType === "photo").map((f) => `${f.photoQty} pc(s) ${PHOTO_SIZE_LABELS[f.photoSize]} (${f.photoFinish})`).join(", ")}`
          : `Walk-in transaction - ${files.length} file(s)`,
        status: "received" as const,
        time: formatPHTime(now),
        paperSize: firstPhoto
          ? firstPhoto.photoSize === "2R" ? "2R" : firstPhoto.photoSize === "A4photo" ? "A4" : firstPhoto.photoSize
          : files[0]?.paperSize === "a4" ? "A4" : files[0]?.paperSize === "legal" ? "Legal" : "A4",
        copies: firstPhoto ? firstPhoto.photoQty : 1,
        submittedAt: now,
        paymentVerified: true,
        orderSource: "walkin" as const,
        margins: files[0]?.margins || "default",
        scale: files[0]?.scale || "default",
        customScale: files[0]?.customScale || 100,
        downPaymentRequired: false,
        downPaymentVerified: false,
        attachedFiles: files.map((f) => ({
          name: f.fileName,
          size: `${(f.file.size / 1024 / 1024).toFixed(2)} MB`,
          type: f.file.type.toUpperCase().includes("PDF") ? "PDF" :
                f.file.type.toUpperCase().includes("WORD") || f.file.type.toUpperCase().includes("DOCUMENT") ? "Document" :
                f.file.type.toUpperCase().includes("POWERPOINT") || f.file.type.toUpperCase().includes("PRESENTATION") ? "PowerPoint" :
                f.file.type.toUpperCase().includes("EXCEL") || f.file.type.toUpperCase().includes("SPREADSHEET") ? "Excel" :
                f.file.type.toUpperCase().includes("IMAGE") ? "Image" : "Document",
          url: URL.createObjectURL(f.file),
          uploadedAt: now.toISOString(),
        })),
        expectedPaperUsage: (() => {
          const map: Record<string, number> = {};
          files.forEach((f) => {
            if (f.printType === "photo") return;
            const pps = parseInt(f.pagesPerSheet || "1", 10) || 1;
            const sheets = Math.ceil(f.pageCount / pps) * (f.copies || 1);
            const size = f.paperSize || "a4";
            map[size] = (map[size] || 0) + sheets;
          });
          return Object.entries(map).map(([size, sheets]) => ({ size, sheets }));
        })(),
        paperDeductedOnCreate: false,
      };

      ordersStore.addOrder(newOrder);
    }

    toast.success(
      <div className="flex flex-col gap-1">
        <span className="font-semibold">Walk-in order sent to queue!</span>
        <span className="text-sm">Order ID: {transactionId}</span>
        <span className="text-sm">Total: {formatCurrency(total)}</span>
      </div>,
      { duration: 5000 }
    );

    resetForm();
  };

  const handleSubmit = () => {
    if (!paymentMethod) {
      toast.error(
        "Please select a payment method before placing your order.",
      );
      return;
    }

    const total = calculateTotal();
    const orderId = dataStore.getNextOrderId();
    const methodLabel = isOnline ? paymentMethod : "Cash";

    if (!validatePhotoMinQty()) return;

    const totalPages = files.reduce(
      (sum, f) => sum + f.pageCount * f.copies,
      0,
    );
    const hasColor = files.some((f) => f.colorMode === "colored");

    const requiresDownPayment = total >= downPaymentThreshold;
    const downPaymentAmount = requiresDownPayment ? total * 0.5 : 0;

    const newOrder = {
      id: orderId,
      customerId: user?.email || "customer@example.com",
      customerName: user?.name || "Customer",
      customerEmail: user?.email || "customer@example.com",
      status: isOnline || requiresDownPayment
        ? ("Awaiting Payment" as const)
        : ("Received" as const),
      holdReason: isOnline
        ? `${methodLabel} payment of ₱${Math.round(total)} is pending verification. Your order will be queued once the payment is verified.`
        : requiresDownPayment
          ? `Down payment required: ₱${Math.round(downPaymentAmount)} (50% of total ₱${Math.round(total)}). Please pay this amount via Cash before your order can be processed.`
          : undefined,
      total: `₱${Math.round(total)}`,
      date: todayPHTKey(),
      paperSize:
        files[0]?.paperSize === "a4"
          ? "A4"
          : files[0]?.paperSize === "short"
            ? "Short"
            : files[0]?.paperSize === "long"
              ? "Long"
              : files[0]?.paperSize === "folio"
                ? "Folio"
                : files[0]?.paperSize === "legal"
                  ? "Legal"
                  : files[0]?.paperSize === "a3"
                    ? "A3"
                    : "A4",
      printType: hasColor ? "Colored" : "Black & White",
      copies:
        files.reduce((sum, f) => sum + f.copies, 0) /
        files.length,
      paymentMethod: isOnline ? methodLabel : "Cash",
      fileName: files[0]?.fileName || "document.pdf",
      pages: totalPages,
      attachedFiles: files.map((f) => ({
        name: f.fileName,
        size: `${(f.file.size / 1024 / 1024).toFixed(2)} MB`,
        type: f.file.type.toUpperCase().includes("PDF")
          ? "PDF"
          : "Document",
        url: URL.createObjectURL(f.file),
        uploadedAt: new Date().toISOString(),
        paperSize: f.paperSize,
        orientation: f.orientation,
        copies: f.copies,
        twoSided: f.twoSided,
        pagesPerSheet: f.pagesPerSheet,
        colorMode: f.colorMode,
        pageRange: f.pageRange,
        specificPages: f.specificPages,
        margins: f.margins,
        scale: f.scale,
        customScale: f.customScale,
        pageCount: f.pageCount,
      })),
      orientation: files[0]?.orientation || "Portrait",
      twoSided: files[0]?.twoSided || "no",
      pagesPerSheet: files[0]?.pagesPerSheet || "1",
      margins: files[0]?.margins || "default",
      scale: files[0]?.scale || "default",
      customScale: files[0]?.customScale || 100,
      colorMode: hasColor ? "color" : "bw",
      pageRange: files[0]?.pageRange || "all",
      notes:
        files
          .map((f) => f.notes)
          .filter((n) => n)
          .join("; ") || "",
      addons: Object.entries(selectedAddons)
        .filter(([_, qty]) => qty > 0)
        .map(([addonId, qty]) => {
          const addon = availableAddons.find((a) => a.id === addonId);
          return {
            name: addon?.name || "",
            quantity: qty,
            price: addon?.price || 0,
          };
        }),
      orderSource: "online" as const,
      downPaymentRequired: requiresDownPayment,
      downPaymentAmount: requiresDownPayment ? downPaymentAmount : undefined,
      downPaymentVerified: false,
      expectedPaperUsage: (() => {
        const map: Record<string, number> = {};
        files.forEach((f) => {
          if (f.printType === "photo") return;
          const pps = parseInt(f.pagesPerSheet || "1", 10) || 1;
          const sheets = Math.ceil(f.pageCount / pps) * (f.copies || 1);
          const size = f.paperSize || "a4";
          map[size] = (map[size] || 0) + sheets;
        });
        return Object.entries(map).map(([size, sheets]) => ({ size, sheets }));
      })(),
      paperDeductedOnCreate: false,
    };

    // ONLINE payment orders are NOT pushed to the system yet. We hold the full
    // order payload as a pending order + a resume draft, then only create the
    // real order once the customer submits their payment reference on the
    // payment verification page. Backing out / going to the dashboard simply
    // leaves the pending order unsaved (never entered the queue).
    if (isOnline) {
      const orderData = {
        orderId,
        total,
        paymentMethod: methodLabel,
        timestamp: new Date().toISOString(),
        downPaymentRequired: requiresDownPayment,
        downPaymentAmount: requiresDownPayment ? downPaymentAmount : undefined,
      };
      localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));

      savePendingOrder(newOrder as unknown as Record<string, unknown>);
      savePrintDraft({
        orderId,
        files: files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          pageCount: f.pageCount,
          contentType: f.contentType,
          printType: f.printType,
          paperSize: f.paperSize,
          copies: f.copies,
          colorMode: f.colorMode,
          pagesPerSheet: f.pagesPerSheet,
          orientation: f.orientation,
          pageRange: f.pageRange,
          specificPages: f.specificPages,
          twoSided: f.twoSided,
          margins: f.margins,
          scale: f.scale,
          customScale: f.customScale,
          notes: f.notes,
          photoSize: f.photoSize,
          photoFinish: f.photoFinish,
          photoQty: f.photoQty,
        })),
        selectedAddons,
        serviceType,
        paymentMethod,
        currentStep,
      });

      setSubmittedOrderId(orderId);

      navigate(`/customer/payment/${orderId}`, {
        state: {
          paymentMethod: methodLabel,
          total,
          showSuccessAfter: true,
        },
      });
      return;
    }

    dataStore.addOrder(newOrder);

    const notifTitle = requiresDownPayment ? "New Order — Down Payment Required" : "New Print Request";
    const notifMsg = requiresDownPayment
      ? `New order #${orderId} from ${user?.email || "customer"} is awaiting down payment verification — ₱${Math.round(downPaymentAmount)} required (50% of total ₱${Math.round(total)}).`
      : `New print request #${orderId} from ${user?.email || "customer"}. ${files.length} file(s), ${totalPages} pages total.`;

    notificationStore.addNotification("order", notifTitle, notifMsg, {
      clickable: true,
      relatedOrderId: orderId,
      recipientRole: "admin",
    });

    notificationStore.addNotification("order", notifTitle, notifMsg, {
      clickable: true,
      relatedOrderId: orderId,
      recipientRole: "staff",
    });

    const orderData = {
      orderId,
      total,
      paymentMethod: methodLabel,
      timestamp: new Date().toISOString(),
      downPaymentRequired: requiresDownPayment,
      downPaymentAmount: requiresDownPayment ? downPaymentAmount : undefined,
    };
    localStorage.setItem(
      `order_${orderId}`,
      JSON.stringify(orderData),
    );

    setSubmittedOrderId(orderId);
    setShowSuccessModal(true);
  };

  const handleCancelOrder = () => {
    setShowCancelConfirmDialog(true);
  };

  const confirmCancelOrder = () => {
    resetForm();
    setShowCancelConfirmDialog(false);
    toast.info("Walk-in transaction cancelled");
  };

  const steps = isWalkin
    ? [
        { number: 1, title: "Customer & Files", icon: Upload },
        { number: 2, title: "Print Options", icon: Settings },
        { number: 3, title: "Add-ons", icon: ShoppingCart },
        { number: 4, title: "Review & Complete", icon: CheckCircle },
      ]
    : [
        { number: 1, title: "Upload Document", icon: Upload },
        { number: 2, title: "Print Options", icon: Settings },
        { number: 3, title: "Add-ons", icon: ShoppingCart },
        { number: 4, title: "Summary", icon: CheckCircle },
      ];

  const menuItems = isWalkin
    ? role === "admin"
      ? adminMenuItems
      : staffMenuItems
    : customerMenuItems;
  const dashboardPath = isWalkin
    ? role === "admin"
      ? "/admin/dashboard"
      : "/staff/dashboard"
    : "/customer/dashboard";
  const title = isWalkin ? "Walk-in Transactions" : "Print Request";

  const content = (
    <div className={isWalkin ? "max-w-4xl mx-auto space-y-8" : "max-w-4xl mx-auto space-y-2 sm:space-y-3"}>
      {!isWalkin && isResumed && submittedOrderId && (
        <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3 min-w-0">
            <Clock className="w-5 h-5 text-[#2F6FD6] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                Resuming your print request
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                You left this request at Payment Verification before submitting your reference. Your order has not been finalized yet — continue where you left off.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/customer/payment/${submittedOrderId}`, {
                state: { paymentMethod, showSuccessAfter: true },
              })
            }
            className="shrink-0 bg-white text-[#2F6FD6] border-2 border-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white transition-all"
          >
            Go to Payment Verification
          </Button>
        </div>
      )}
      {/* Step Indicator */}
      <Card className={isWalkin ? "p-6 bg-white shadow-sm" : "p-4 sm:p-6 bg-white shadow-sm"}>
        <div className={isWalkin ? "flex items-center justify-between" : "flex items-center justify-center w-full"}>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className={isWalkin ? "flex flex-col items-center" : "flex flex-1 flex-col items-center justify-center min-w-0"}>
                <div
                  className={
                    isWalkin
                      ? `w-12 h-12 rounded-full flex items-center justify-center ${
                          currentStep >= step.number
                            ? "bg-[#2F6FD6] text-white"
                            : "bg-gray-200 text-gray-500"
                        }`
                      : `w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
                          currentStep >= step.number
                            ? "bg-[#2F6FD6] text-white shadow-sm"
                            : "bg-gray-200 text-gray-500"
                        }`
                  }
                >
                  <step.icon className={isWalkin ? "w-6 h-6" : "w-5 h-5 sm:w-6 sm:h-6"} />
                </div>
                <p
                  className={
                    isWalkin
                      ? `mt-2 text-sm font-medium ${
                          currentStep >= step.number ? "text-gray-900" : "text-gray-500"
                        }`
                      : `mt-2 text-[10px] font-medium leading-tight text-center sm:text-sm ${
                          currentStep >= step.number
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`
                  }
                >
                  {isWalkin ? (
                    step.title
                  ) : (
                    <>
                      <span className="sm:hidden">{step.title.split(" ")[0]}</span>
                      <span className="hidden sm:inline">{step.title}</span>
                    </>
                  )}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={isWalkin ? "flex-1 h-1 mx-4" : "flex-shrink-0 px-1 sm:px-3"}>
                  <div
                    className={
                      isWalkin
                        ? `h-1 ${currentStep > step.number ? "bg-[#2F6FD6]" : "bg-gray-200"}`
                        : `h-1 w-5 sm:w-12 rounded-full ${
                            currentStep > step.number
                              ? "bg-[#2F6FD6]"
                              : "bg-gray-200"
                          }`
                    }
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-4 sm:p-8 bg-white shadow-sm">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isWalkin
                ? "Step 1: Customer Information & Upload Files"
                : "Step 1: Upload Documents"}
            </h2>

            {isWalkin && (
              <>
                {/* Customer Type Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Customer Type</Label>
                  <Select value={customerType} onValueChange={setCustomerType}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">Walk-in Customer (Anonymous)</SelectItem>
                      <SelectItem value="registered">Registered Customer</SelectItem>
                      <SelectItem value="new">New Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(customerType === "registered" || customerType === "new") && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-blue-900">Customer Information</h3>
                    <div className="space-y-3">
                      {customerType === "registered" ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="customerEmail" className="text-sm">
                              Email Address *
                            </Label>
                            <Input
                              id="customerEmail"
                              type="email"
                              placeholder="customer@email.com"
                              value={customerEmail}
                              onChange={(e) => handleEmailChange(e.target.value)}
                              className="bg-white"
                            />
                          </div>
                          {customerName && (
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-600">
                                Customer Name (Auto-filled)
                              </Label>
                              <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700">
                                {customerName}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="customerName" className="text-sm">
                              Full Name
                            </Label>
                            <Input
                              id="customerName"
                              placeholder="Enter customer name"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerEmail" className="text-sm">
                              Email Address
                            </Label>
                            <Input
                              id="customerEmail"
                              type="email"
                              placeholder="customer@email.com"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              className="bg-white"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {fileError && (
              <div className="p-4 bg-white border-2 border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    {fileError}
                  </p>
                </div>
                <button
                  onClick={() => setFileError("")}
                  className="text-red-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {files.length > 0 && (
              <div className="space-y-3">
                {files.map((fileData, index) => (
                  <div
                    key={fileData.id}
                    className="p-4 rounded-lg border-2 bg-white border-gray-300"
                  >
                    <div className="flex items-start gap-3">
                      <FileCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {index + 1}. {fileData.fileName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {fileData.pageCount}{" "}
                              {fileData.pageCount === 1 ? "page" : "pages"}{" "}
                              detected
                            </p>
                            {analyzingFileId === fileData.id && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-blue-700 font-medium">
                                  Analyzing document...
                                </p>
                              </div>
                            )}
                            {fileData.colorAnalysis && analyzingFileId !== fileData.id && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-blue-700 font-medium">
                                  ✓ Analysis complete
                                </p>
                                {fileData.colorAnalysis.colorPages.length > 0 ? (
                                  <p className="text-xs text-gray-600">
                                    Color detected on{" "}
                                    {fileData.colorAnalysis.colorPages.length}{" "}
                                    page
                                    {fileData.colorAnalysis.colorPages.length !== 1 ? "s" : ""}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-600">
                                    No color detected (Black &amp; White)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(fileData.id)}
                            className="text-red-400 hover:bg-red-500 hover:text-white border-2 border-red-200 hover:border-red-500 transition-all"
                            disabled={analyzingFileId === fileData.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center hover:border-[#2F6FD6] transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 mb-2 font-medium">
                {files.length === 0
                  ? isWalkin
                    ? "Upload Document"
                    : "Upload Your First Document"
                  : "Add More Files"}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Supported formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 max-w-lg mx-auto">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-700 text-left">
                    <strong>Preferred Format: PDF</strong>
                    <br />
                    Docufy will not take responsibility for
                    any formatting errors or issues with Word
                    (.docx), PowerPoint (.pptx), or other
                    non-PDF files.
                  </p>
                </div>
              </div>

              <label className="inline-block cursor-pointer">
                <span className="px-6 py-3 bg-white text-[#2F6FD6] rounded-lg border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md font-medium inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {files.length === 0 ? "Choose File" : "Add More Files"}
                </span>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,image/jpeg,image/png"
                  className="hidden"
                  disabled={isProcessingFile}
                  multiple
                />
              </label>

              {isProcessingFile && (
                <p className="text-sm text-gray-600 mt-4">Processing file...</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Step 2: Print Options for Each File
            </h2>

            {files.map((fileData, index) => (
              <Card key={fileData.id} className="p-4 sm:p-6 bg-gray-50">
                <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-300">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#2F6FD6] shrink-0" />
                    <span className="truncate block">
                      File {index + 1}: {fileData.fileName}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {fileData.pageCount} pages detected
                  </p>
                </div>

                {fileData.colorAnalysis && (
                  <div className="mb-3 sm:mb-2 p-3 sm:p-4 bg-white border-2 border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Document Analysis Results
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-black">Total Pages:</span>
                        <span className="font-medium text-black">
                          {fileData.colorAnalysis.totalPages}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-black">Color Pages:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black">
                            {fileData.colorAnalysis.colorPages.length > 0
                              ? `${fileData.colorAnalysis.colorPages.length} pages`
                              : "None"}
                          </span>
                          {fileData.colorAnalysis.colorPages.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowDetectedPages({
                                  ...showDetectedPages,
                                  [fileData.id]: !showDetectedPages[fileData.id],
                                })
                              }
                              className="text-xs text-[#2F6FD6] hover:text-[#1e5bb8] font-medium underline"
                            >
                              {showDetectedPages[fileData.id] ? "Hide Pages" : "See Detected Pages"}
                            </button>
                          )}
                        </div>
                      </div>
                      {showDetectedPages[fileData.id] && fileData.colorAnalysis.colorPages.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                          <p className="text-xs text-blue-700 font-medium mb-1">
                            Color Pages: {fileData.colorAnalysis.colorPages.join(", ")}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-black">B&amp;W Pages:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black">
                            {fileData.colorAnalysis.bwPages.length} pages
                          </span>
                          {fileData.colorAnalysis.bwPages.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowDetectedPages({
                                  ...showDetectedPages,
                                  [fileData.id + "-bw"]: !showDetectedPages[fileData.id + "-bw"],
                                })
                              }
                              className="text-xs text-[#2F6FD6] hover:text-[#1e5bb8] font-medium underline"
                            >
                              {showDetectedPages[fileData.id + "-bw"] ? "Hide Pages" : "See Detected Pages"}
                            </button>
                          )}
                        </div>
                      </div>
                      {showDetectedPages[fileData.id + "-bw"] && fileData.colorAnalysis.bwPages.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-700 font-medium mb-1">
                            B&amp;W Pages: {fileData.colorAnalysis.bwPages.join(", ")}
                          </p>
                        </div>
                      )}
                      {fileData.colorAnalysis.colorPages.length > 0 && showDetectedPages[fileData.id] && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-700 font-medium mb-2">
                            Color Intensity by Page:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                            {(showAllAnalysis[fileData.id]
                              ? fileData.colorAnalysis.colorPages
                              : fileData.colorAnalysis.colorPages.slice(0, 6)
                            ).map((page) => (
                              <div key={page} className="flex justify-between">
                                <span className="text-blue-700">Page {page}:</span>
                                <span className="font-medium text-blue-900">
                                  {fileData.colorAnalysis!.colorPercentages[page]}% color
                                </span>
                              </div>
                            ))}
                          </div>
                          {fileData.colorAnalysis.colorPages.length > 6 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllAnalysis({
                                  ...showAllAnalysis,
                                  [fileData.id]: !showAllAnalysis[fileData.id],
                                })
                              }
                              className="text-xs text-[#2F6FD6] hover:text-[#1e5bb8] font-medium mt-2 underline"
                            >
                              {showAllAnalysis[fileData.id]
                                ? "- Show Less"
                                : `+ See More (${fileData.colorAnalysis.colorPages.length - 6} more pages)`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExpandedFileSettings((current) => ({
                      ...current,
                      [fileData.id]: !current[fileData.id],
                    }))}
                    aria-expanded={expandedFileSettings[fileData.id] || false}
                    className="mb-3 flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#2F6FD6] sm:hidden"
                  >
                    {expandedFileSettings[fileData.id] ? "Hide Print Settings" : "See More Print Settings"}
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedFileSettings[fileData.id] ? "rotate-180" : ""}`} />
                  </button>
                )}

                <div className={`${files.length > 1 && !expandedFileSettings[fileData.id] ? "hidden sm:block" : "block"} space-y-4 sm:space-y-6`}>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Print Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["document", "vellum", "sticker", "photo"] as const).map((pt) => (
                        <Button
                          type="button"
                          key={pt}
                          variant="outline"
                          onClick={() => {
                            updateFileOption(
                              fileData.id,
                              "printType",
                              fileData.printType === pt ? "" : pt,
                            );
                          }}
                          className={`group min-h-12 h-12 px-3 text-base font-medium transition-all duration-150 active:scale-95 ${fileData.printType === pt ? "bg-[#2F6FD6] text-white" : ""}`}
                        >
                          {pt === "document" && (
                            <Layers className={`w-4 h-4 shrink-0 ${fileData.printType === pt ? "text-white" : "text-[#2F6FD6]"} group-hover:text-white`} />
                          )}
                          {pt === "vellum" && (
                            <FileText className={`w-4 h-4 shrink-0 ${fileData.printType === pt ? "text-white" : "text-[#2F6FD6]"} group-hover:text-white`} />
                          )}
                          {pt === "sticker" && (
                            <StickyNote className={`w-4 h-4 shrink-0 ${fileData.printType === pt ? "text-white" : "text-[#2F6FD6]"} group-hover:text-white`} />
                          )}
                          {pt === "photo" && (
                            <Camera className={`w-4 h-4 shrink-0 ${fileData.printType === pt ? "text-white" : "text-[#2F6FD6]"} group-hover:text-white`} />
                          )}
                          <span className={`text-sm font-medium ${fileData.printType === pt ? "text-white" : "text-gray-900"} group-hover:text-white`}>
                            {pt === "document"
                              ? "Document"
                              : pt === "vellum"
                                ? "Vellum"
                                : pt === "sticker"
                                  ? "Sticker"
                                  : "Photo"}
                          </span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Pick what type of printing this file needs. The print
                      options below unlock once a type is selected.
                    </p>
                  </div>

                  {fileData.printType ? (
                    <>
                      {fileData.printType === "photo" ? (
                        <div className="space-y-4 p-4 sm:p-5 rounded-xl border-2 border-blue-200 bg-white">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Photo Size</Label>
                              <Select
                                value={fileData.photoSize}
                                onValueChange={(value) =>
                                  updateFileOption(fileData.id, "photoSize", value as PhotoSizeKey)
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(["2R", "3R", "4R", "5R", "6R", "A4photo"] as PhotoSizeKey[]).map((size) => (
                                    <SelectItem key={size} value={size}>
                                      {PHOTO_SIZE_LABELS[size]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Finish</Label>
                              <RadioGroup
                                value={fileData.photoFinish}
                                onValueChange={(value) =>
                                  updateFileOption(fileData.id, "photoFinish", value as "matte" | "glossy")
                                }
                                className="flex flex-col gap-2"
                              >
                                <label
                                  className={`relative overflow-hidden flex flex-1 items-center gap-2 p-3 border-2 rounded-lg cursor-pointer ${
                                    fileData.photoFinish === "glossy"
                                      ? "border-[#2F6FD6] bg-white border-2 border-blue-200"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  {fileData.photoFinish === "glossy" && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
                                  )}
                                  <RadioGroupItem value="glossy" />
                                  <span className="text-sm font-medium text-gray-900">Glossy</span>
                                </label>
                                <label
                                  className={`relative overflow-hidden flex flex-1 items-center gap-2 p-3 border-2 rounded-lg cursor-pointer ${
                                    fileData.photoFinish === "matte"
                                      ? "border-[#2F6FD6] bg-white border-2 border-blue-200"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  {fileData.photoFinish === "matte" && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
                                  )}
                                  <RadioGroupItem value="matte" />
                                  <span className="text-sm font-medium text-gray-900">Matte</span>
                                </label>
                              </RadioGroup>
                            </div>
                          </div>
                          <div className="sm:grid sm:grid-cols-2 sm:gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Quantity</Label>
                              {(() => {
                                const item = pricingStore.getMatrix().photo[fileData.photoSize];
                                const minQty = item ? item.minQty : 1;
                                return (
                                  <>
                                    <NumberStepper
                                      min={minQty}
                                      value={fileData.photoQty}
                                      onCommit={(n) => updateFileOption(fileData.id, "photoQty", n)}
                                    />
                                    <p className="text-xs text-gray-500">
                                      {minQty > 1 ? `Minimum order: ${minQty} pcs. ` : ""}Price: {formatPrice(item?.price || 0)} each.
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="pt-3 mt-3 border-t border-gray-300">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">
                                Subtotal for this file:
                              </span>
                              <span className="text-lg font-semibold text-[#2F6FD6]">
                                {formatCurrency(calculateFileTotal(fileData))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Paper Size</Label>
                              <Select
                                value={fileData.paperSize}
                                onValueChange={(value) =>
                                  updateFileOption(fileData.id, "paperSize", value)
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePaperSizes.length > 0 ? (
                                    availablePaperSizes.map((size) => (
                                      <SelectItem key={size.id} value={size.name} disabled={!size.inStock}>
                                        {size.displayName}
                                        {!size.inStock && " (Out of Stock)"}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="a4">A4</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <Label className="text-sm font-medium">Number of Copies</Label>
                            <NumberStepper
                              min={1}
                              value={fileData.copies}
                              onCommit={(n) => updateFileOption(fileData.id, "copies", n)}
                            />
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Page Range</Label>
                              <Select
                                value={fileData.pageRange}
                                onValueChange={(value) =>
                                  updateFileOption(fileData.id, "pageRange", value)
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Pages</SelectItem>
                                  <SelectItem value="odd">Odd Pages Only</SelectItem>
                                  <SelectItem value="even">Even Pages Only</SelectItem>
                                  <SelectItem value="specific">Specific Pages</SelectItem>
                                </SelectContent>
                              </Select>
                              {fileData.pageRange === "specific" && (
                                <Input
                                  placeholder="e.g., 1-5, 8, 11-13"
                                  value={fileData.specificPages}
                                  onChange={(e) =>
                                    updateFileOption(fileData.id, "specificPages", e.target.value)
                                  }
                                  className="h-10 mt-2"
                                />
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Color Mode</Label>
                            <RadioGroup
                              value={fileData.colorMode}
                              onValueChange={(value) =>
                                updateFileOption(fileData.id, "colorMode", value)
                              }
                              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                            >
                              <label
                                className={`relative overflow-hidden flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${
                                  fileData.colorMode === "bw"
                                    ? "border-[#2F6FD6] bg-white border-2 border-blue-200"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                {fileData.colorMode === "bw" && (
                                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
                                )}
                                <RadioGroupItem value="bw" id={`bw-${fileData.id}`} />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">Black and White</p>
                                  <p className="text-xs text-gray-600">
                                    {formatPrice(matrixRatesFor(fileData).bw)} per page — all pages printed
                                    in grayscale
                                  </p>
                                </div>
                              </label>
                              <label
                                className={`relative overflow-hidden flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${
                                  fileData.colorMode === "colored"
                                    ? "border-[#2F6FD6] bg-white border-2 border-blue-200"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                {fileData.colorMode === "colored" && (
                                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
                                )}
                                <RadioGroupItem value="colored" id={`colored-${fileData.id}`} />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">Colored</p>
                                  <p className="text-xs text-gray-600 mt-0.5">Analysis-based pricing</p>
                                </div>
                              </label>
                            </RadioGroup>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setBreakdownFileId(fileData.id);
                                setShowColorPricing(true);
                              }}
                              className="w-full text-[#2F6FD6] font-semibold hover:text-white"
                            >
                              <Info className="mr-2 h-4 w-4" />
                              See Colored Pricing Breakdown
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Additional Notes (Optional)</Label>
                              <span className="text-xs text-gray-500">
                                {fileData.notes.length}/100
                              </span>
                            </div>
                            <Textarea
                              value={fileData.notes}
                              onChange={(e) =>
                                updateFileOption(fileData.id, "notes", e.target.value)
                              }
                              placeholder="Add any special instructions for this specific file..."
                              rows={3}
                              className="text-sm"
                              maxLength={100}
                            />
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Quick templates:</p>
                              <Select
                                onValueChange={(template) => {
                                  const currentNotes = fileData.notes;
                                  const newNotes = currentNotes
                                    ? `${currentNotes}\n${template}`
                                    : template;
                                  updateFileOption(fileData.id, "notes", newNotes.slice(0, 100));
                                }}
                              >
                                <SelectTrigger className="h-9 text-black sm:hidden">
                                  <SelectValue className="text-black" placeholder="Choose a template" />
                                </SelectTrigger>
                                <SelectContent className="sm:hidden">
                                  {noteTemplates.map((template) => (
                                    <SelectItem key={template} value={template}>
                                      {template}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="hidden sm:flex flex-wrap gap-2">
                                {noteTemplates.map((template) => (
                                  <button
                                    key={template}
                                    type="button"
                                    onClick={() => {
                                      const currentNotes = fileData.notes;
                                      const newNotes = currentNotes
                                        ? `${currentNotes}\n${template}`
                                        : template;
                                      updateFileOption(fileData.id, "notes", newNotes.slice(0, 100));
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                                  >
                                    + {template}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-gray-300">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Subtotal for this file:</span>
                              <span className="text-lg font-semibold text-[#2F6FD6]">
                                {formatCurrency(calculateFileTotal(fileData))}
                              </span>
                            </div>
                          </div>

                          {files.length > 1 && (
                            <div className="pt-3 mt-3 border-t border-gray-200">
                              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentSettings = {
                                      printType: fileData.printType,
                                      paperSize: fileData.paperSize,
                                      orientation: fileData.orientation,
                                      copies: fileData.copies,
                                      twoSided: fileData.twoSided,
                                      pagesPerSheet: fileData.pagesPerSheet,
                                      colorMode: fileData.colorMode,
                                      pageRange: fileData.pageRange,
                                      specificPages: fileData.specificPages,
                                      margins: fileData.margins,
                                      scale: fileData.scale,
                                      customScale: fileData.customScale,
                                    };
                                    setFiles(files.map((f) => {
                                      if (f.id === fileData.id) return f;
                                      return { ...f, ...currentSettings };
                                    }));
                                    toast.success("Print settings applied to all files");
                                  }}
                                  className="w-full border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#F2F7FF] font-medium sm:flex-1"
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Apply Settings to All Files
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <p className="text-sm text-gray-600">
                        Select a print type above to unlock the print options
                        for this file.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {files.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>
                  Please upload at least one file in Step 1 to
                  configure print options.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-[#2F6FD6]" />
              Step 3: Add-ons (Optional)
            </h2>

            <div className="p-4 bg-white border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Need additional supplies? Add clips, staplers,
                folders, or binding services to your order.
              </p>
            </div>

            {availableAddons.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  No add-ons are currently available.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  You can continue without adding extras to your order.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAddons.map((addon) => {
                  const quantity = selectedAddons[addon.id] || 0;
                  return (
                    <Card key={addon.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{addon.description}</p>
                          <p className="text-sm font-bold text-[#2F6FD6] mt-2">
                            ₱{addon.price} / {addon.unit}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                          {addon.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAddons((prev) => ({
                              ...prev,
                              [addon.id]: Math.max(0, (prev[addon.id] || 0) - 1),
                            }));
                          }}
                          disabled={quantity === 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>

                        <Input
                          type="number"
                          min="0"
                          value={quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setSelectedAddons((prev) => ({
                              ...prev,
                              [addon.id]: Math.max(0, value),
                            }));
                          }}
                          className="w-20 text-center text-lg font-bold"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAddons((prev) => ({
                              ...prev,
                              [addon.id]: (prev[addon.id] || 0) + 1,
                            }));
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        {quantity > 0 && (
                          <span className="ml-auto text-sm font-semibold text-blue-600">
                            ₱{Math.round(addon.price * quantity)}
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {Object.keys(selectedAddons).some((key) => selectedAddons[key] > 0) && (
              <Card className="p-4 bg-white border-2 border-blue-200 border-2 border-blue-300">
                <h3 className="font-bold text-gray-900 mb-3">Selected Add-ons</h3>
                <div className="space-y-2">
                  {Object.entries(selectedAddons)
                    .filter(([_, qty]) => qty > 0)
                    .map(([addonId, qty]) => {
                      const addon = availableAddons.find((a) => a.id === addonId);
                      if (!addon) return null;
                      return (
                        <div key={addonId} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {addon.name} × {qty}
                          </span>
                          <span className="font-semibold text-gray-900">
                            ₱{Math.round(addon.price * qty)}
                          </span>
                        </div>
                      );
                    })}
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-bold">
                    <span>Add-ons Total:</span>
                    <span className="text-blue-700">
                      {formatCurrency(
                        Object.entries(selectedAddons).reduce(
                          (sum, [addonId, qty]) => {
                            const addon = availableAddons.find((a) => a.id === addonId);
                            return sum + (addon ? addon.price * qty : 0);
                          },
                          0,
                        ),
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* STEP 4 */}
        {currentStep === 4 && (
          isWalkin ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Step 4: Review & Complete Transaction
              </h2>

              <Card className="p-5 bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Customer Information
                </h3>
                <div className="text-sm text-gray-700">
                  {customerType === "walkin" ? (
                    <p>Walk-in Customer (Anonymous)</p>
                  ) : (
                    <>
                      <p>
                        <strong>Type:</strong>{" "}
                        {customerType === "registered" ? "Registered Customer" : "New Customer"}
                      </p>
                      {customerName && (
                        <p>
                          <strong>Name:</strong> {customerName}
                        </p>
                      )}
                      {customerEmail && (
                        <p>
                          <strong>Email:</strong> {customerEmail}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </Card>

              {files.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Print Jobs ({files.length} file{files.length !== 1 ? "s" : ""})
                  </h3>
                  {files.map((fileData, index) => (
                    <Card key={fileData.id} className="p-5 bg-gray-50">
                      <div className="font-semibold text-gray-900 mb-1 pb-2 border-b border-gray-300 truncate">
                        File {index + 1}: {fileData.fileName}
                      </div>
                      <p className="text-xs font-medium text-[#2F6FD6] mb-3">
                        Print Type:{" "}
                        {fileData.printType === "photo"
                          ? "Photo"
                          : fileData.printType === "vellum"
                            ? "Vellum"
                            : fileData.printType === "sticker"
                              ? "Sticker"
                              : "Document"}
                      </p>
                      {fileData.printType === "photo" ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Photo Size</p>
                            <p className="font-medium text-gray-900">
                              {PHOTO_SIZE_LABELS[fileData.photoSize]}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Finish</p>
                            <p className="font-medium text-gray-900 capitalize">
                              {fileData.photoFinish}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Quantity</p>
                            <p className="font-medium text-gray-900">{fileData.photoQty} pcs</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Price each</p>
                            <p className="font-medium text-gray-900">
                              {formatPrice(pricingStore.getMatrix().photo[fileData.photoSize]?.price ?? 0)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Pages</p>
                            <p className="font-medium text-gray-900">{fileData.pageCount} pages</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Copies</p>
                            <p className="font-medium text-gray-900">{fileData.copies}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Paper Size</p>
                            <p className="font-medium text-gray-900 capitalize">{fileData.paperSize}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Color Mode</p>
                            <p className="font-medium text-gray-900">
                              {fileData.colorMode === "bw" ? "Black & White" : "Colored"}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                        <span className="font-semibold text-[#2F6FD6]">
                          {formatCurrency(calculateFileTotal(fileData))}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {Object.keys(selectedAddons).some((key) => selectedAddons[key] > 0) && (
                <Card className="p-5 bg-white border-2 border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Add-ons</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedAddons)
                      .filter(([_, qty]) => qty > 0)
                      .map(([addonId, qty]) => {
                        const addon = availableAddons.find((a) => a.id === addonId);
                        if (!addon) return null;
                        return (
                          <div key={addonId} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {addon.name} × {qty}
                            </span>
                            <span className="font-semibold text-gray-900">
                              ₱{(addon.price * qty).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}

              <div className="p-6 bg-[#2F6FD6] text-white rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-lg">Total Amount</p>
                  <p className="text-3xl font-semibold">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>

              <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                      Walk-in Payment
                    </h4>
                    <p className="text-sm text-blue-800">
                      Payment will be collected immediately upon transaction completion. The order will be processed right away and payment is verified automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Step 4: Order Summary
              </h2>

              <button
                type="button"
                onClick={() => setShowOrderSummary((isOpen) => !isOpen)}
                aria-expanded={showOrderSummary}
                className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#2F6FD6] sm:hidden"
              >
                {showOrderSummary ? "Hide Order Summary" : "See Order Summary"}
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showOrderSummary ? "rotate-180" : ""}`} />
              </button>

              <div className={`space-y-4 ${showOrderSummary ? "" : "hidden sm:block"}`}>
                <div className="text-sm text-gray-600 mb-4">
                  <strong>Total Files:</strong> {files.length}
                </div>

                {files.map((fileData, index) => (
                  <Card key={fileData.id} className="p-5 bg-gray-50">
                    <div className="font-semibold text-gray-900 mb-1 pb-2 border-b border-gray-300 truncate">
                      File {index + 1}: {fileData.fileName}
                    </div>
                    <p className="text-xs font-medium text-[#2F6FD6] mb-3">
                      Print Type:{" "}
                      {fileData.printType === "photo"
                        ? "Photo"
                        : fileData.printType === "vellum"
                          ? "Vellum"
                          : fileData.printType === "sticker"
                            ? "Sticker"
                            : "Document"}
                    </p>
                    {fileData.printType === "photo" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Photo Size</p>
                          <p className="font-medium text-gray-900">
                            {PHOTO_SIZE_LABELS[fileData.photoSize]}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Finish</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {fileData.photoFinish}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-medium text-gray-900">
                            {fileData.photoQty} pcs
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price each</p>
                          <p className="font-medium text-gray-900">
                            {formatPrice(pricingStore.getMatrix().photo[fileData.photoSize]?.price ?? 0)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Pages</p>
                          <p className="font-medium text-gray-900">
                            {fileData.pageCount} pages
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Page Range</p>
                          <p className="font-medium text-gray-900">
                            {fileData.pageRange === "all"
                              ? "All Pages"
                              : `Pages: ${fileData.specificPages}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Paper Size</p>
                          <p className="font-medium text-gray-900">
                            {fileData.paperSize === "a4" && "A4"}
                            {fileData.paperSize === "letter" && "Letter"}
                            {fileData.paperSize === "legal" && "Legal"}
                            {fileData.paperSize === "short" && "Short Bond"}
                            {fileData.paperSize === "long" && "Long Bond"}
                            {fileData.paperSize === "folio" && "Folio"}
                            {fileData.paperSize === "a5" && "A5"}
                            {fileData.paperSize === "a3" && "A3"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Copies</p>
                          <p className="font-medium text-gray-900">{fileData.copies}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Color Mode</p>
                          <p className="font-medium text-gray-900">
                            {fileData.colorMode === "bw" && "Black & White"}
                            {fileData.colorMode === "colored" && "Colored"}
                          </p>
                        </div>
                        {fileData.colorMode === "colored" && fileData.colorAnalysis && (
                          <div className="col-span-2">
                            <p className="text-gray-600">Color Breakdown</p>
                            <div className="font-medium text-gray-900 text-xs space-y-0.5">
                              {(() => {
                                const highColor = fileData.colorAnalysis.colorPages.filter(
                                  (p) => (fileData.colorAnalysis!.colorPercentages[p] ?? 0) > 50,
                                ).length;
                                const lowColor = fileData.colorAnalysis.colorPages.filter(
                                  (p) => (fileData.colorAnalysis!.colorPercentages[p] ?? 0) <= 50,
                                ).length;
                                const bwCount = fileData.colorAnalysis.bwPages.length;
                                return (
                                  <>
                                    {highColor > 0 && (
                                      <span className="block">
                                        {formatPrice(matrixRatesFor(fileData).full)}/page × {highColor} page
                                        {highColor !== 1 ? "s" : ""} (&gt;50% color)
                                      </span>
                                    )}
                                    {lowColor > 0 && (
                                      <span className="block">
                                        {formatPrice(matrixRatesFor(fileData).partial)}/page × {lowColor} page
                                        {lowColor !== 1 ? "s" : ""} (≤50% color)
                                      </span>
                                    )}
                                    {bwCount > 0 && (
                                      <span className="block">
                                        {formatPrice(matrixRatesFor(fileData).bw)}/page × {bwCount} B&amp;W page
                                        {bwCount !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        {fileData.notes && (
                          <div className="col-span-2 mt-2">
                            <p className="text-gray-600">Special Instructions</p>
                            <p className="font-medium text-gray-900 text-xs whitespace-pre-wrap bg-white p-2 rounded border border-gray-200 mt-1">
                              {fileData.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                      <span className="font-semibold text-[#2F6FD6]">
                        {formatCurrency(calculateFileTotal(fileData))}
                      </span>
                    </div>
                  </Card>
                ))}

                {Object.keys(selectedAddons).some((key) => selectedAddons[key] > 0) && (
                  <Card className="p-5 bg-white border-2 border-blue-200 border-2 border-blue-300">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      Add-ons
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(selectedAddons)
                        .filter(([_, qty]) => qty > 0)
                        .map(([addonId, qty]) => {
                          const addon = availableAddons.find((a) => a.id === addonId);
                          if (!addon) return null;
                          return (
                            <div key={addonId} className="flex justify-between text-sm">
                              <span className="text-gray-700">
                                {addon.name} × {qty}
                              </span>
                              <span className="font-semibold text-gray-900">
                                ₱{Math.round(addon.price * qty)}
                              </span>
                            </div>
                          );
                        })}
                      <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-bold">
                        <span>Add-ons Subtotal:</span>
                        <span className="text-blue-700">
                          {formatCurrency(
                            Object.entries(selectedAddons).reduce(
                              (sum, [addonId, qty]) => {
                                const addon = availableAddons.find((a) => a.id === addonId);
                                return sum + (addon ? addon.price * qty : 0);
                              },
                              0,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <Card className="p-4 sm:p-6 bg-white border-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentOptions((isOpen) => !isOpen)}
                  aria-expanded={showPaymentOptions}
                  className="flex w-full items-center justify-between text-left sm:hidden"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Select Payment Method
                  </span>
                  <ChevronDown className={`h-5 w-5 text-[#2F6FD6] transition-transform duration-200 sm:hidden ${showPaymentOptions ? "rotate-180" : ""}`} />
                </button>
                <div className={`${showPaymentOptions ? "block" : "hidden"} sm:block`}>
                  <h3 className="mb-3 hidden text-lg font-semibold text-gray-900 sm:mb-6 sm:block">
                    Select Payment Method
                  </h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2">
                      {onlineMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`relative overflow-hidden flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${
                            paymentMethod === method.name
                              ? "border-[#2F6FD6] bg-white"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setPaymentMethod(method.name)}
                        >
                          {paymentMethod === method.name && (
                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
                          )}
                          <RadioGroupItem value={method.name} id={`pm-${method.id}`} disabled={false} />
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <Smartphone className="w-5 h-5 text-[#2F6FD6]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Label htmlFor={`pm-${method.id}`} className="font-semibold text-gray-900 cursor-pointer">
                                {method.name}
                              </Label>
                              <p className="text-xs text-gray-500">
                                Pay via {method.name} mobile wallet
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewMethodQR(method.name);
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-[#1D73EC] hover:text-[#10316B] shrink-0"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              View QR
                            </button>
                          </div>
                        </div>
                      ))}

                      <div
                        className={`relative overflow-hidden flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${
                          paymentMethod === "cash"
                            ? "border-[#2F6FD6] bg-white"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setPaymentMethod("cash")}
                      >
                        {paymentMethod === "cash" && (
                          <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
                        )}
                        <RadioGroupItem value="cash" id="cash" />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-[#73bbff] rounded-lg flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <Label htmlFor="cash" className="font-semibold text-gray-900 cursor-pointer">
                              Cash on Pickup
                            </Label>
                            <p className="text-xs text-gray-500">
                              Pay when you collect your order
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>

                  {isOnline && (
                    <div className="mt-6">
                      <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <strong>Note:</strong> You will be
                        redirected to payment verification after
                        placing your order. Please upload your{" "}
                        {paymentMethod} payment receipt there.
                      </p>
                      {!isGcash && (
                        <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-3 mt-2">
                          <strong>Auto-detection:</strong> the{" "}
                          reference number is only auto-detected from
                          the payment screenshot for GCash payments.
                          For {paymentMethod} you will enter it
                          manually.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {(() => {
                const total = calculateTotal();
                const requiresDownPayment = total >= downPaymentThreshold;
                const downPaymentValue = requiresDownPayment ? total * 0.5 : 0;

                if (requiresDownPayment) {
                  return (
                    <div className="p-5 bg-amber-50 border-2 border-amber-400 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CreditCard className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-2">
                            Down Payment Required
                            <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                              50% Upfront
                            </span>
                          </h4>
                          <p className="text-sm text-amber-800 mb-3 leading-relaxed">
                            Orders totaling <strong>₱{downPaymentThreshold.toFixed(2)} or more</strong> require a{" "}
                            <strong>50% down payment</strong> before printing begins. Your order will stay{" "}
                            <strong>awaiting payment verification</strong> until the down payment is verified by Admin or Staff.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div className="p-3 bg-white rounded-lg border border-amber-200">
                              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
                                Down Payment Due
                              </p>
                              <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(downPaymentValue)}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-amber-200">
                              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
                                Balance on Pickup
                              </p>
                              <p className="text-2xl font-bold text-gray-700">
                                {formatCurrency(downPaymentValue)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-amber-100 rounded-lg">
                            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                              Pay the down payment via{" "}
                              <strong>
                                {isOnline
                                  ? paymentMethod
                                  : paymentMethod === "cash"
                                    ? "Cash at the shop"
                                    : "your chosen payment method"}
                              </strong>
                              {" "}and inform the staff to verify. Once verified, your order moves to the queue automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (total > 0) {
                  return (
                    <div className="p-4 bg-white border-2 border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                          <strong>No down payment required.</strong> Your order total is below ₱{downPaymentThreshold.toFixed(2)} — pay in full via your chosen payment method.
                        </p>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              <div className="p-4 sm:p-6 bg-[#2F6FD6] text-white rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-lg">Total Amount</p>
                  <p className="text-3xl font-semibold">
                    {formatCurrency(calculateTotal())}
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Navigation Buttons */}
        {isWalkin && currentStep === 4 ? (
          <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-gray-100">
            {/* Top row: Back + Cancel Order */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    const prev = currentStep - 1;
                    setCurrentStep(prev);
                    scrollPageToTop();
                  } else {
                    navigate(dashboardPath);
                  }
                }}
                className="w-full py-2.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="w-full py-2.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all"
              >
                Cancel Order
              </button>
            </div>
            {/* Bottom row: Proceed to In Queue */}
            <button
              type="button"
              onClick={() => setShowProceedConfirm(true)}
              disabled={files.length === 0}
              className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-[#2557b8] disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              Proceed to In Queue
            </button>
          </div>
        ) : (
        <div className={isWalkin ? "flex items-center justify-between mt-8 pt-6 border-t" : "flex items-center justify-between mt-1 pt-6 border-t gap-4 sm:gap-5"}>
          <Button
            variant="outline"
            className={`bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:text-gray-900 ${isWalkin ? "" : "min-w-[155px] h-12 sm:h-11 px-6 text-base font-medium"}`}
            onClick={() => {
              if (currentStep > 1) {
                const prev = currentStep - 1;
                setCurrentStep(prev);
                scrollPageToTop();
              } else {
                navigate(dashboardPath);
              }
            }}
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex gap-2 sm:gap-3">
            {currentStep < 4 ? (
              <Button
                className={isWalkin
                  ? "bg-[#2F6FD6] text-white hover:bg-[#2557b8] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  : "min-w-[155px] h-12 sm:h-11 px-6 text-base font-medium bg-[#2F6FD6] text-white hover:bg-[#2557b8] disabled:bg-gray-400 disabled:cursor-not-allowed"}
                onClick={() => {
                  const nextStep = currentStep + 1;
                  setCurrentStep(nextStep);
                  scrollPageToTop();
                }}
                disabled={
                  (currentStep === 1 && files.length === 0) ||
                  (currentStep === 2 && files.length > 0 && !files.every((f) => f.printType)) ||
                  analyzingFileId !== null
                }
              >
                {analyzingFileId ? "Analyzing..." : "Next Step"}
              </Button>
            ) : (
              <>
                {isWalkin && (
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={handleCancelOrder}
                  >
                    Cancel Order
                  </Button>
                )}
                <Button
                  className={isWalkin
                    ? "bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
                    : "min-w-[155px] h-12 sm:h-11 px-6 text-base font-medium bg-[#2F6FD6] text-white hover:bg-[#2557b8] disabled:bg-gray-400"}
                  onClick={() => {
                    if (isWalkin) {
                      setShowProceedConfirm(true);
                    } else {
                      setShowPlaceOrderConfirm(true);
                    }
                  }}
                  disabled={isWalkin ? files.length === 0 : files.length === 0 || !paymentMethod}
                >
                  {isWalkin ? "Proceed to In Queue" : isOnline ? "Go to Payment Verification" : "Place Order"}
                </Button>
              </>
            )}
          </div>
        </div>
        )}
      </Card>
    </div>
  );

  return (
    <Layout menuItems={menuItems} title={title} showBackButton>
      {isWalkin ? <StaffTimeInGate>{content}</StaffTimeInGate> : content}

      {/* Colored Pricing Breakdown Modal */}
      <Dialog open={showColorPricing} onOpenChange={setShowColorPricing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Colored Pricing Breakdown</DialogTitle>
            <DialogDescription>
              Colored mode uses document analysis so each page is priced by its
              detected content, based on the print type you chose for this file.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const bFile = files.find((f) => f.id === breakdownFileId) || null;
            if (!bFile) {
              return (
                <p className="text-sm text-gray-500">
                  Select a print type and configure this file to see its pricing
                  breakdown.
                </p>
              );
            }
            const matrix = pricingStore.getMatrix();
            const bService = (bFile.printType as ServiceType) || serviceType;
            const bSizeKey = mapPaperSizeKey(bFile.paperSize);
            const bCType = bFile.contentType;
            const rate = (tier: ColorTier) =>
              getPriceFromMatrix(matrix, bService, {
                contentType: bCType,
                colorTier: tier,
                sizeKey: bSizeKey,
              });
            const typeLabel =
              bFile.printType === "photo"
                ? "Photo"
                : bFile.printType === "vellum"
                  ? "Vellum"
                  : bFile.printType === "sticker"
                    ? "Sticker"
                    : "Document";

            if (bFile.printType === "photo") {
              const size = pricingStore.getMatrix().photo[bFile.photoSize];
              return (
                <>
                  <div className="rounded-lg border border-blue-200 bg-[#F2F7FF] p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-gray-900">Print type</span>
                      <span className="font-medium text-[#2F6FD6]">Photo</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Photo size</span>
                      <span className="text-gray-900">
                        {PHOTO_SIZE_LABELS[bFile.photoSize]}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Finish</span>
                      <span className="text-gray-900 capitalize">{bFile.photoFinish}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Quantity</span>
                      <span className="text-gray-900">{bFile.photoQty} pcs</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Price each</span>
                      <span className="text-gray-900">{formatPrice(size ? size.price : 0)}</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-blue-200">
                      <span className="font-medium text-gray-900">Subtotal</span>
                      <span className="font-medium text-[#2F6FD6]">
                        {formatCurrency(calculateFileTotal(bFile))}
                      </span>
                    </div>
                  </div>
                </>
              );
            }

            return (
              <>
                <div className="rounded-lg border border-blue-200 bg-[#F2F7FF] p-3 text-sm mb-3">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium text-gray-900">Print type</span>
                    <span className="font-medium text-[#2F6FD6]">{typeLabel}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Paper size</span>
                    <span className="text-gray-900">
                      {bFile.paperSize.charAt(0).toUpperCase() + bFile.paperSize.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Content type</span>
                    <span className="text-gray-900">{CONTENT_TYPE_LABELS[bCType]}</span>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-blue-200 bg-[#F2F7FF] p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span>Black and white page</span>
                    <strong>{formatPrice(rate("bw"))}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Partially colored page (&le;50%)</span>
                    <strong>{formatPrice(rate("partial"))}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Fully colored page (&gt;50%)</span>
                    <strong>{formatPrice(rate("full"))}</strong>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Paper size, copies, and page range are applied to the final total.
                </p>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* View Payment QR Code Modal (customer only) */}
      {!isWalkin && (
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#10316B]">
                {selectedMethod ? `${selectedMethod.name} QR Code` : "Payment QR Code"}
              </DialogTitle>
              <DialogDescription>
                Scan the QR code to pay, or download it for later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMethod && onlineMethods.some((m) => m.id === selectedMethod.id) ? (
                <PaymentMethodQRPanel method={selectedMethod} />
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  This payment method is no longer available. Please choose another
                  method.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-10"
                onClick={() => setShowQRModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Success Modal */}
      {!isWalkin && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                {calculateTotal() >= downPaymentThreshold ? (
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-10 h-10 text-amber-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                )}
              </div>
              <DialogTitle className="text-center text-xl">
                {calculateTotal() >= downPaymentThreshold
                  ? "Order Submitted — Down Payment Required"
                  : "Print Request Received!"}
              </DialogTitle>
              <DialogDescription className="text-center space-y-4 pt-4">
                {(() => {
                  const total = calculateTotal();
                  const requiresDownPayment = total >= downPaymentThreshold;
                  const downPaymentValue = requiresDownPayment ? total * 0.5 : 0;

                  return requiresDownPayment ? (
                    <>
                      <p className="text-gray-700">
                        Your order has been submitted and placed <strong>awaiting payment verification</strong>. A down payment must be made and verified before printing can begin.
                      </p>
                      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-left space-y-2">
                        <p className="text-sm font-bold text-amber-800">Down Payment Summary</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Order Total</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
                          <span className="text-amber-800 font-bold">Down Payment (50%)</span>
                          <span className="font-bold text-amber-700">{formatCurrency(downPaymentValue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Balance on Pickup</span>
                          <span className="font-semibold text-gray-700">{formatCurrency(downPaymentValue)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        Pay <strong>{formatCurrency(downPaymentValue)}</strong> via{" "}
                        <strong>{isOnline ? paymentMethod : "Cash at the shop"}</strong>, then inform staff to verify. Your order will be queued for printing once verified.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700">
                        Your print request has been successfully received by our admin/staff team.
                      </p>
                      <p className="text-sm text-gray-600">
                        You can track your order status from the <strong>My Orders</strong> page or proceed to payment verification if required.
                      </p>
                    </>
                  );
                })()}
                <div className="bg-[#F2F7FF] p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Order ID</p>
                  <p className="font-mono font-semibold text-[#10316B]">
                    {submittedOrderId}
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (isOnline) {
                    navigate(`/customer/payment/${submittedOrderId}`, {
                      state: {
                        paymentMethod,
                        total: calculateTotal(),
                      },
                    });
                  } else {
                    navigate(`/customer/track/${submittedOrderId}`);
                  }
                }}
                className="flex-1"
              >
                {isOnline ? "Proceed to Payment" : "Track Order"}
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/customer/dashboard");
                }}
                className="flex-1 bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white"
              >
                Go to Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Place Order / Go to Payment Verification Confirmation (customer only) */}
      {!isWalkin && showPlaceOrderConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowPlaceOrderConfirm}
          onConfirm={() => { handleSubmit(); setShowPlaceOrderConfirm(false); }}
          title={isOnline ? "Go to Payment Verification?" : "Place this order?"}
          description={
            isOnline
              ? `Your print request for ${files.length} file(s), ${files.reduce((s, f) => s + f.pageCount * f.copies, 0)} pages, total ${formatCurrency(calculateTotal())} via ${paymentMethod}. Continuing will take you to payment verification, where you will upload your ${paymentMethod} payment receipt and submit your reference number. Your order is NOT placed in the system until you submit your reference.`
              : `Submit your print request for ${files.length} file(s), ${files.reduce((s, f) => s + f.pageCount * f.copies, 0)} pages, total ${formatCurrency(calculateTotal())} via ${paymentMethod === "" ? "your selected method" : paymentMethod}. This will create your order, reserve paper stock, and notify staff. Review your details before confirming.`
          }
          confirmLabel={isOnline ? "Go to Payment Verification" : "Place Order"}
          cancelLabel="Go Back"
          destructive={false}
        />
      )}

      {/* Cancel Confirmation Dialog (walk-in only) */}
      {isWalkin && (
        <Dialog open={showCancelConfirmDialog} onOpenChange={setShowCancelConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Cancel Walk-in Transaction
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this walk-in transaction? All entered information will be lost.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-2">
              <p className="text-sm text-amber-900">
                <strong>Warning:</strong> This action cannot be undone. Customer details, uploaded files, and all settings will be cleared.
              </p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirmDialog(false)}
              >
                Keep Editing
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancelOrder}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Cancel Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Proceed to In Queue Confirmation (walk-in only) */}
      {isWalkin && showProceedConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowProceedConfirm}
          onConfirm={() => { handleProceedToQueue(); setShowProceedConfirm(false); }}
          title="Place Walk-in Order?"
          description={`This will create a walk-in order for ${customerType === "walkin" ? "Walk-in Customer" : (customerName || "Walk-in Customer")} with ${files.length} file(s), total ${formatCurrency(calculateTotal())}, and send it to the print queue immediately.`}
          confirmLabel="Proceed to In Queue"
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
    </Layout>
  );
}
