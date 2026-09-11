import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  Banknote,
  Wallet,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { dataStore } from "../../utils/dataStore";
import { formatCurrency } from "../../utils/formatNumber";
import {
  readPendingOrder,
  readOrderBlob,
  applyDownPaymentPlan,
  materializeCashPendingOrder,
} from "../../utils/pendingOrderStore";
import { ConfirmationDialog } from "../ui/confirmation-dialog";

const menuItems = [
  {
    label: "Dashboard",
    path: "/customer/dashboard",
    icon: <Banknote className="w-5 h-5" />,
  },
];

export default function DownPaymentMethod() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [amountChoice, setAmountChoice] = useState<"down" | "full">("down");
  const [showConfirm, setShowConfirm] = useState(false);

  const total = useMemo(() => {
    if (!orderId) return 0;
    const order = dataStore.getOrderById(orderId);
    const held = readPendingOrder();
    const blob = readOrderBlob(orderId);
    const raw =
      (order || (held && held.id === orderId ? held : null) || blob)?.total ||
      "₱0";
    const n = parseFloat(String(raw).replace(/[₱,]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }, [orderId]);

  const isDownTier = useMemo(
    () => total >= 51 && total < 100,
    [total],
  );

  useEffect(() => {
    if (!isDownTier && total > 0) {
      navigate(`/customer/payment/${orderId}`, { replace: true });
    }
  }, [isDownTier, total, orderId, navigate]);

  // Only Cash on Pickup orders reach this page (online down-tier orders pay in
  // full on the payment verification page directly), so the venue is fixed to
  // the shop.
  if (!isDownTier) {
    return null;
  }

  const downDue = total * 0.5;

  const applyPlan = () => {
    const decision = applyDownPaymentPlan(orderId!, total, {
      venue: "shop",
      amountChoice,
      wallet: "",
    });
    // The order was held as pending during checkout; materialize it into the
    // data store so Payment Verification can load it.
    materializeCashPendingOrder(orderId!);
    toast.success(
      decision.isFull ? "Full payment selected" : "Down payment selected",
    );
    navigate(`/customer/payment/${orderId}`, {
      state: {
        paymentMethod: "Cash",
        total,
      },
    });
  };

  return (
    <Layout
      menuItems={menuItems}
      title="Down Payment Method"
      showBackButton
      backButtonPath="/customer/dashboard"
      hideMobileBackButton
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Down Payment Method
          </h1>
          <p className="text-gray-500 mt-1">
            Choose how you'd like to pay for order {orderId}. Order total{" "}
            {formatCurrency(total)}.
          </p>
        </div>

        {/* How you'll pay — Cash on Pickup only (the down-payment function is
            available only when Cash on Pickup is selected at checkout). */}
        <Card className="p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            How you'll pay
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This order is set up for Cash on Pickup at the shop.
          </p>
          <div className="relative flex items-start gap-3 p-4 border-2 border-[#2F6FD6] rounded-lg text-left bg-white">
            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-100">
              <Banknote className="w-5 h-5 text-[#2F6FD6]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Pay at the Shop</p>
              <p className="text-xs text-gray-500">
                Visit the shop and pay in cash. Staff verifies your payment at
                the counter.
              </p>
            </div>
          </div>
        </Card>

        {/* Step: amount */}
        <Card className="p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            How much would you like to pay today?
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            You can pay a 50% down payment now and the rest on pickup, or settle
            the full amount now.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAmountChoice("down")}
              className={`relative flex items-start gap-3 p-4 border-2 rounded-lg text-left transition-all active:scale-[0.98] ${
                amountChoice === "down"
                  ? "border-[#2F6FD6] bg-white"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {amountChoice === "down" && (
                <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
              )}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-100">
                <Wallet className="w-5 h-5 text-[#2F6FD6]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Down Payment (50%)</p>
                <p className="text-sm text-[#2F6FD6] font-semibold">
                  {formatCurrency(downDue)}{" "}
                  <span className="font-normal text-xs text-gray-500">
                    now
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  Balance of {formatCurrency(total - downDue)} due on pickup.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAmountChoice("full")}
              className={`relative flex items-start gap-3 p-4 border-2 rounded-lg text-left transition-all active:scale-[0.98] ${
                amountChoice === "full"
                  ? "border-[#2F6FD6] bg-white"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {amountChoice === "full" && (
                <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2F6FD6] rounded-full" />
              )}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-100">
                <CheckCircle2 className="w-5 h-5 text-[#2F6FD6]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Full Amount</p>
                <p className="text-sm text-[#2F6FD6] font-semibold">
                  {formatCurrency(total)}{" "}
                  <span className="font-normal text-xs text-gray-500">
                    now
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  No balance due on pickup.
                </p>
              </div>
            </button>
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-6 bg-[#F2F7FF] border border-blue-200 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Order Total</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
            <span className="font-semibold text-gray-900">
              {amountChoice === "down"
                ? "Down Payment Due Now"
                : "Full Payment Due Now"}
            </span>
            <span className="font-bold text-[#2F6FD6]">
              {formatCurrency(amountChoice === "down" ? downDue : total)}
            </span>
          </div>
          {amountChoice === "down" && (
            <div className="flex justify-between text-sm pt-1">
              <span className="text-gray-600">Balance on Pickup</span>
              <span className="font-semibold text-gray-700">
                {formatCurrency(total - downDue)}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Paying via <strong>cash at the shop</strong>. Visit the shop to pay
            in cash before your payment deadline.
          </p>
        </Card>

        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button
            className="h-11 w-full bg-[#2F6FD6] hover:bg-[#2557b8] text-white"
            onClick={() => setShowConfirm(true)}
          >
            Proceed to Payment Verification
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          applyPlan();
        }}
        title="Confirm your payment plan?"
        description={`You'll pay ${formatCurrency(
          amountChoice === "down" ? downDue : total,
        )} ${amountChoice === "down" ? "(50% down)" : "(full amount)"} in cash at the shop. Your order stays on hold until your payment is verified.`}
        confirmLabel="Confirm & Continue"
        cancelLabel="Go Back"
        destructive={false}
      />
    </Layout>
  );
}