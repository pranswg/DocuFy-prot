import React, { useState, useEffect } from "react";
import {
  Store,
  Wifi,
  WifiOff,
  CalendarClock,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { shopStatusStore, type ShopStatus, type ShopStatusState } from "../../utils/shopStatusStore";
import { formatPHTime } from "../../utils/pht";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_META: Record<ShopStatus, { label: string; chip: string; icon: React.ElementType }> = {
  open: { label: "Open for Business", chip: "bg-green-100 text-green-700 border-green-200", icon: Wifi },
  paused: { label: "Paused", chip: "bg-amber-100 text-amber-700 border-amber-200", icon: WifiOff },
  "closed-scheduled": { label: "Scheduled Close", chip: "bg-gray-100 text-gray-600 border-gray-200", icon: CalendarClock },
};

export default function ShopStatusControl() {
  const { user } = useAuth();
  const [state, setState] = useState<ShopStatusState>(() => shopStatusStore.getState());
  const [pauseOpen, setPauseOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [eta, setEta] = useState("");

  useEffect(() => {
    const unsub = shopStatusStore.subscribe(() => setState(shopStatusStore.getState()));
    return unsub;
  }, []);

  const meta = STATUS_META[state.status];
  const Icon = state.status === "paused" ? WifiOff : state.status === "closed-scheduled" ? CalendarClock : Wifi;

  const applyStatus = (status: ShopStatus, opts?: { reason?: string; eta?: string }) => {
    shopStatusStore.setStatus({ status, reason: opts?.reason, eta: opts?.eta }, user?.name);
    const label = STATUS_META[status].label;
    toast.success(`Docufy marked as "${label}".`, {
      description: status === "paused" ? "Customers have been notified." : undefined,
    });
    setPauseOpen(false);
    setReason("");
    setEta("");
  };

  const openPause = () => {
    setReason("");
    setEta("");
    setPauseOpen(true);
  };

  return (
    <>
      <Card className="bg-white shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-5 pt-4 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-[#2F6FD6] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-800">Shop Status</h3>
                <Badge variant="outline" className={`border text-xs font-bold ${meta.chip}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {meta.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {state.status === "open" && "Docufy is currently accepting orders and processing the queue."}
                {state.status === "paused" && (
                  state.reason ? (
                    <>
                      <span className="font-medium text-slate-600">{state.reason}</span>
                      {state.eta && <span> · back around {state.eta}</span>}
                    </>
                  ) : (
                    "Docufy is temporarily paused. New orders are on hold."
                  )
                )}
                {state.status === "closed-scheduled" && (
                  state.reason ? (
                    <>
                      <span className="font-medium text-slate-600">{state.reason}</span>
                      {state.eta && <span> · back around {state.eta}</span>}
                    </>
                  ) : (
                    "Docufy is closed as scheduled. New orders are on hold."
                  )
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {state.updatedBy ? `Updated by ${state.updatedBy}` : "Updated"} · {formatPHTime(state.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              disabled={state.status === "open"}
              onClick={() => applyStatus("open")}
              className="border-[#2F6FD6] bg-[#2F6FD6] text-white hover:bg-[#1e5bb8] hover:border-[#1e5bb8] text-xs h-9 px-3 disabled:opacity-50"
            >
              <Wifi className="w-3.5 h-3.5 mr-1.5" />
              Mark Open
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={state.status === "paused"}
              onClick={openPause}
              className="border-amber-300 text-amber-700 bg-white hover:bg-amber-600 hover:border-amber-600 hover:text-white text-xs h-9 px-3 disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              Mark Paused
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={state.status === "closed-scheduled"}
              onClick={() => applyStatus("closed-scheduled")}
              className="border-slate-300 text-slate-600 bg-white hover:bg-slate-600 hover:border-slate-600 hover:text-white text-xs h-9 px-3 disabled:opacity-50"
            >
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
              Mark Closed (Scheduled)
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Pause Docufy</DialogTitle>
            <DialogDescription>
              Let customers know why the shop is paused. New orders will be on hold until you mark the shop open again.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason <span className="text-red-500">*</span></Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Brownout, no internet, staff unavailable"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">ETA (optional)</Label>
              <Input
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                placeholder='e.g. "2:00 PM" or "30 minutes"'
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setPauseOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              data-primary-action
              disabled={!reason.trim()}
              onClick={() => applyStatus("paused", { reason: reason.trim(), eta: eta.trim() || undefined })}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Pause Docufy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}