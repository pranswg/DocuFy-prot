import React, { useState, useEffect } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router";
import {
  LayoutDashboard,
  FileText,
  Upload,
  AlertCircle,
  Package,
  Briefcase,
  X,
  Image,
  Smartphone,
  CheckCircle2,
  Banknote,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { dataStore } from "../../utils/dataStore";
import {
  paymentMethodsStore,
  type PaymentMethodType,
} from "../../utils/paymentMethodsStore";
import PaymentMethodQRPanel from "../shared/PaymentMethodQR";
import Tesseract from "tesseract.js";

let ocrWorkerPromise: Promise<Tesseract.Worker> | null = null;

function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker("eng");
  }
  return ocrWorkerPromise;
}

// Preprocess an uploaded image so OCR can read light-gray / low-contrast text.
// Upscales, converts to grayscale, and boosts contrast / darkens so faint text
// (e.g. GCash "Ref No." labels in light gray) becomes clearly readable black.
async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const contrast = 1.7;
  const brightness = -35;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const adjusted = (gray - 128) * contrast + 128 + brightness;
    const v = Math.max(0, Math.min(255, adjusted));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Extract a GCash-style reference number from the OCR text. Prefers the digits
// shown after a "Ref No." / "Reference Number" label (spanning line breaks);
// only falls back to a standalone digit run when no label is found, and even
// then only for a plausible reference length so random numbers are ignored.
function extractReferenceNumber(text: string): string {
  const labelMatch = text.match(
    /(?:Ref\.?\s*No\.?|Reference\s*Number)\s*[:.\-\s\n]*([0-9][0-9\s,.\-]*)/i,
  );
  if (labelMatch) {
    const ref = labelMatch[1].replace(/[^\d]/g, "");
    if (ref.length >= 6) return ref.slice(0, 20);
  }

  // Fallback: find standalone digit groups and prefer one near 13 digits
  // (typical GCash reference) so phone numbers / random groups are avoided.
  const candidates: string[] = [];
  for (const m of text.matchAll(/(?:^|[^\d])(\d[\d\s,.\-]{5,19})(?:[^\d]|$)/g)) {
    const digits = m[1].replace(/[^\d]/g, "");
    if (digits.length >= 6 && digits.length <= 20) {
      candidates.push(digits);
    }
  }
  if (candidates.length) {
    candidates.sort(
      (a, b) =>
        Math.abs(a.length - 13) - Math.abs(b.length - 13) ||
        b.length - a.length,
    );
    return candidates[0].slice(0, 20);
  }
  return "";
}

const menuItems = [
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

export default function PaymentVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const [paymentMethod, setPaymentMethod] = useState<
    string
  >(""); // method name or "cash"
  const [onlineMethods, setOnlineMethods] = useState<
    PaymentMethodType[]
  >([]);
  const [
    showPaymentMethodSelector,
    setShowPaymentMethodSelector,
  ] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [showImagePreview, setShowImagePreview] =
    useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<
    string | null
  >(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const isOnline = paymentMethod !== "" && paymentMethod !== "cash";
  const selectedMethod = isOnline
    ? paymentMethodsStore.findByName(paymentMethod)
    : undefined;
  const methodUnavailable =
    isOnline && !onlineMethods.some((m) => m.name === paymentMethod);
  const isGcash = paymentMethod.toLowerCase() === "gcash";

  // Live online payment methods that admin manages
  useEffect(() => {
    const loadMethods = () =>
      setOnlineMethods(paymentMethodsStore.getPaymentMethods());
    loadMethods();
    const unsubscribe = paymentMethodsStore.subscribe(loadMethods);
    return unsubscribe;
  }, []);

  // Load payment method from navigation state or localStorage
  useEffect(() => {
    if (location.state?.paymentMethod) {
      setPaymentMethod(location.state.paymentMethod);
    } else if (orderId) {
      const savedOrder = localStorage.getItem(
        `order_${orderId}`,
      );
      if (savedOrder) {
        try {
          const orderData = JSON.parse(savedOrder);
          if (orderData.paymentMethod) {
            setPaymentMethod(orderData.paymentMethod);
          }
        } catch (error) {
          console.error("Error loading order data:", error);
        }
      }
    }
  }, [location.state, orderId]);

  // Default to the first available online method if none chosen yet
  useEffect(() => {
    if (!paymentMethod && onlineMethods.length > 0) {
      setPaymentMethod(onlineMethods[0].name);
    }
  }, [onlineMethods, paymentMethod]);

  // OCR scan to extract the GCash reference number from the uploaded image.
  // The image is preprocessed (grayscale + contrast boost) so light-gray
  // "Ref No." / "Reference Number" labels are readable, then the digits after
  // the label are extracted even when the number wraps across two lines.
  const scanReferenceNumber = async (file: File) => {
    setIsScanning(true);
    toast.info("Scanning image for reference number...");
    try {
      const worker = await getOcrWorker();
      const canvas = await preprocessImage(file);
      const result = await worker.recognize(canvas);
      const text = result.data.text;

      let ref = extractReferenceNumber(text);

      // Cap length defensively (GCash references are ~13 digits).
      ref = ref.slice(0, 20);

      if (ref.length >= 6) {
        setReferenceNumber(ref);
        toast.success("Reference number detected. Please review it before submitting.");
      } else {
        toast.error(
          "Could not detect a reference number. Please enter it manually.",
        );
      }
    } catch (err) {
      console.error("OCR failed:", err);
      toast.error(
        "Could not read the image. Please enter the reference number manually.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (file) {
      // Validate file type - only images
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (!validTypes.includes(file.type)) {
        setFileError(
          "Please upload an image file only (JPG, PNG, GIF, or WebP)",
        );
        e.target.value = "";
        return;
      }

      setProofFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);

      // Auto-scan for reference number ONLY for GCash payments
      if (isGcash) {
        await scanReferenceNumber(file);
      }
    }
  };

  const handleViewImage = () => {
    setShowImagePreview(true);
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setImagePreviewUrl(null);
    setReferenceNumber("");
    setFileError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod !== "cash") {
      if (!referenceNumber.trim()) {
        toast.error(
          `Please enter a ${selectedMethod?.name || "payment"} reference number`,
        );
        return;
      }

      // Save the reference number to the order in dataStore
      // The payment will remain unverified until admin/staff manually verifies it
      const order = dataStore.getOrders().find((o) => o.id === orderId);
      if (order) {
        dataStore.updateOrder(orderId!, {
          paymentReferenceNumber: referenceNumber,
          paymentVerified: false,
          paymentProofUrl: imagePreviewUrl || undefined,
        });

        toast.success("Payment details submitted. Awaiting verification by staff.");
      }
    }

    // Show success dialog instead of navigating immediately
    setShowSuccessDialog(true);
  };

  const selectMethod = (value: string) => {
    setPaymentMethod(value);
    setShowPaymentMethodSelector(false);
    setReferenceNumber("");
    setProofFile(null);
    setImagePreviewUrl(null);
  };

  return (
    <Layout
      menuItems={menuItems}
      title="Payment Verification"
      showBackButton
      backButtonPath="/customer/new-request"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Payment Verification
          </h1>
          <p className="text-gray-500 mt-1">
            Order ID: {orderId}
          </p>
        </div>

        {/* Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your order total requires payment verification
            before processing can begin.
          </AlertDescription>
        </Alert>

        {/* Payment Method Display/Selector */}
        <Card className="p-6 bg-white shadow-sm">
          {!showPaymentMethodSelector ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Selected Payment Method
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isOnline
                        ? "bg-[#007DFF]"
                        : "bg-blue-600"
                    }`}
                  >
                    {isOnline ? (
                      <Smartphone className="w-6 h-6 text-white" />
                    ) : (
                      <Banknote className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {isOnline
                        ? paymentMethod
                        : "Cash on Pickup"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isOnline
                        ? "Mobile wallet payment"
                        : "Pay when you collect"}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setShowPaymentMethodSelector(true)
                }
                className="border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white border-2 border-[#2F6FD6] transition-colors"
              >
                Change Payment Method
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Payment Method
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowPaymentMethodSelector(false)
                  }
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Online Payment Options (managed by admin) */}
                {onlineMethods.map((method) => {
                  const isSelected = paymentMethod === method.name;
                  return (
                    <button
                      key={method.id}
                      onClick={() => selectMethod(method.name)}
                      className={`p-3 rounded-lg border-2 transition-all hover:shadow-sm ${
                        isSelected
                          ? "border-[#007DFF] bg-white border-2 border-blue-200"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSelected
                              ? "bg-[#007DFF]"
                              : "bg-gray-100"
                          }`}
                        >
                          <Smartphone
                            className={`w-5 h-5 ${
                              isSelected
                                ? "text-white"
                                : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-xs font-semibold ${
                              isSelected
                                ? "text-[#007DFF]"
                                : "text-gray-900"
                            }`}
                          >
                            {method.name}
                          </p>
                          <p className="text-[9px] text-gray-500">
                            Mobile wallet
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#007DFF]" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Cash on Pickup Button */}
                <button
                  onClick={() => selectMethod("cash")}
                  className={`p-3 rounded-lg border-2 transition-all hover:shadow-sm ${
                    paymentMethod === "cash"
                      ? "border-blue-600 bg-white border-2 border-blue-200"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        paymentMethod === "cash"
                          ? "bg-blue-600"
                          : "bg-gray-100"
                      }`}
                    >
                      <Banknote
                        className={`w-5 h-5 ${
                          paymentMethod === "cash"
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-xs font-semibold ${
                          paymentMethod === "cash"
                            ? "text-blue-600"
                            : "text-gray-900"
                        }`}
                      >
                        Cash on Pickup
                      </p>
                      <p className="text-[9px] text-gray-500">
                        Pay on collect
                      </p>
                    </div>
                    {paymentMethod === "cash" && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </button>
              </div>
            </>
          )}
        </Card>

        {/* Payment Instructions - Show based on selected method */}
        {isOnline && (
          <Card className="p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {paymentMethod} Payment Details
            </h2>

            {methodUnavailable ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                This payment method is no longer available. Please
                change your payment method above and submit a new
                payment.
              </div>
            ) : selectedMethod ? (
              <PaymentMethodQRPanel method={selectedMethod} />
            ) : null}
          </Card>
        )}

        {paymentMethod === "cash" && (
          <Card className="p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Cash on Pickup Details
            </h2>
            <div className="p-6 bg-white border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Payment on Pickup
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    You have selected to pay in cash when you
                    collect your order. Please ensure you have
                    the exact amount ready.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        No advance payment required
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        Pay the full amount when collecting your
                        order
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        Please bring exact change if possible
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Reference Form - For digital payments (not cash) */}
        {isOnline && (
          <Card className="p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Submit Payment Reference
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (paymentMethod !== "cash" && !referenceNumber.trim()) {
                  toast.error(
                    `Please enter a ${selectedMethod?.name || "payment"} reference number`,
                  );
                  return;
                }
                setShowSubmitConfirm(true);
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Reference Number *
                </Label>
                <Input
                  id="reference"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) =>
                    setReferenceNumber(e.target.value)
                  }
                  placeholder="Enter payment reference number"
                  required
                />
                <p className="text-sm text-gray-500">
                  Enter the reference number from your{" "}
                  {selectedMethod?.name || "payment"} receipt
                </p>
                {isScanning && (
                  <p className="text-sm text-[#2F6FD6] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning image for the reference number...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">
                  Upload Proof of Payment (Screenshot or
                  Receipt)
                </Label>
                <p className="text-sm text-gray-500 mb-2">
                  Image files only (JPG, PNG, GIF, WebP)
                </p>

                {fileError && (
                  <div className="p-3 bg-white border-2 border-blue-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-900">
                        {fileError}
                      </p>
                    </div>
                    <button
                      onClick={() => setFileError("")}
                      className="text-red-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {!proofFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#2F6FD6] transition-colors">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 mb-4 font-medium">
                      Upload Payment Screenshot
                    </p>
                    <label className="inline-block cursor-pointer">
                      <span className="px-6 py-2 bg-white text-[#2F6FD6] rounded-lg border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md font-medium inline-flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Choose Image File
                      </span>
                      <Input
                        id="proof"
                        type="file"
                        onChange={handleFileUpload}
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-4 bg-white border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Image className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {proofFile.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {(proofFile.size / 1024).toFixed(1)}{" "}
                            KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleViewImage}
                          className="px-3 py-1 text-sm bg-white border border-[#2F6FD6] text-[#2F6FD6] rounded hover:bg-[#2F6FD6] hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          View
                        </button>
                        <label className="cursor-pointer">
                          <span className="px-3 py-1 text-sm bg-white border border-[#2F6FD6] text-[#2F6FD6] rounded hover:bg-[#2F6FD6] hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Change
                          </span>
                          <Input
                            type="file"
                            onChange={handleFileUpload}
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          title="Remove file"
                          className="p-1.5 text-red-500 rounded hover:bg-red-50 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate("/customer/dashboard")
                  }
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
                >
                  Submit Reference
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Confirm Button for Cash Payment */}
        {paymentMethod === "cash" && (
          <Card className="p-6 bg-white shadow-sm">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/customer/dashboard")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  navigate(`/customer/track/${orderId}`)
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm Order
              </Button>
            </div>
          </Card>
        )}

        {/* Status Card */}
        <Card className="p-6 bg-yellow-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Waiting for Admin Verification
              </h3>
              <p className="text-sm text-gray-600">
                Once you submit your reference number, an
                administrator will verify your payment. You'll
                be notified when your order is approved and
                begins processing.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Image Preview Dialog */}
      <Dialog
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Payment Proof Preview</DialogTitle>
            <DialogDescription>
              {proofFile?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-auto max-h-[70vh]">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Payment Proof"
                className="w-full h-auto rounded-lg border border-gray-200"
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowImagePreview(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          if (!open) {
            // If user closes dialog via X or clicking outside, redirect to order tracking
            navigate(`/customer/track/${orderId}`);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Print Request Received!
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Your payment details have been submitted successfully. Please wait for staff verification before your order begins processing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={() => navigate(`/customer/track/${orderId}`)}
              className="w-full bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
            >
              See My Order
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/customer/dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Payment Confirmation */}
      {showSubmitConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowSubmitConfirm}
          onConfirm={() => { handleSubmit({ preventDefault: () => {} } as React.FormEvent); setShowSubmitConfirm(false); }}
          title="Submit Payment for Verification?"
          description={
            paymentMethod === "cash"
              ? "Confirm your Cash on Pickup order? Your order is ready to be processed."
              : `Submit reference ${referenceNumber.trim() || "number"}${imagePreviewUrl ? " and payment proof" : ""} for ${selectedMethod?.name || "online"} payment for order ${orderId}? Once submitted, your payment will be queued for admin/staff verification and the order will not print until approved.`
          }
          confirmLabel={paymentMethod === "cash" ? "Confirm Order" : "Submit Reference"}
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
    </Layout>
  );
}