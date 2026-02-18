import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePinDialogProps {
  open: boolean;
  onPinCreated: (pin: string) => void;
}

export function CreatePinDialog({ open, onPinCreated }: CreatePinDialogProps) {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStep("create");
      setPin("");
      setConfirmPin("");
      setError("");
    }
  }, [open]);

  const handlePinComplete = (value: string) => {
    if (step === "create") {
      setPin(value);
      setStep("confirm");
      setConfirmPin("");
      setError("");
    }
  };

  const handleConfirmComplete = (value: string) => {
    if (value === pin) {
      onPinCreated(value);
    } else {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-lg">
            {step === "create" ? "Create Your Fast Lock PIN" : "Confirm Your PIN"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {step === "create"
              ? "Your fast is now locked! Create a 4-digit PIN to prevent accidentally ending your fast early."
              : "Re-enter your 4-digit PIN to confirm."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {step === "create" ? (
            <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={handlePinComplete}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          ) : (
            <>
              <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin} onComplete={handleConfirmComplete}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VerifyPinDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  storedPin: string;
}

export function VerifyPinDialog({ open, onClose, onVerified, storedPin }: VerifyPinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const handleComplete = (value: string) => {
    if (value === storedPin) {
      onVerified();
    } else {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-7 w-7 text-destructive" />
          </div>
          <DialogTitle className="text-lg">Enter PIN to End Fast</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Enter your 4-digit PIN to unlock and end your fast early.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={handleComplete}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>

        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface HoldToEndButtonProps {
  onHoldComplete: () => void;
}

export function HoldToEndButton({ onHoldComplete }: HoldToEndButtonProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const HOLD_DURATION = 1500; // ms
  const TICK = 30;

  const startHold = () => {
    setHolding(true);
    setProgress(0);
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setHolding(false);
        setProgress(0);
        onHoldComplete();
      }
    }, TICK);
  };

  const cancelHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className={cn(
        "relative w-full h-12 rounded-md text-base font-semibold overflow-hidden transition-colors select-none",
        "bg-destructive/15 text-destructive border border-destructive/30",
        holding && "bg-destructive/20"
      )}
    >
      {/* Progress fill */}
      <div
        className="absolute inset-y-0 left-0 bg-destructive/25 transition-none"
        style={{ width: `${progress * 100}%` }}
      />
      <div className="relative flex items-center justify-center gap-2">
        <Lock className="h-4 w-4" />
        <span>{holding ? "Hold to unlock..." : "Hold to End Fast Early"}</span>
      </div>
    </button>
  );
}
