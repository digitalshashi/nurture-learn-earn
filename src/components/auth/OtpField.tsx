/**
 * The six-digit code entry.
 *
 * The stock shadcn slots are a single joined box with a hairline between
 * digits, which reads as one text input that happens to have dividers. This
 * one gives every digit its own tile so the field says "six characters" before
 * anyone types, lifts the tile being filled, and — the part that actually
 * changes how it feels — submits itself on the sixth digit.
 *
 * Nobody wants to type a code and then reach for a button. Pasting the code
 * out of the email does the same thing: input-otp handles the paste, the sixth
 * character arrives, and the form goes.
 */
import { useEffect, useRef } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once, when the sixth digit lands. */
  onComplete: () => void;
  disabled?: boolean;
  /** Set after a rejected code: the tiles shake and the field clears itself. */
  invalid?: boolean;
}

export function OtpField({ value, onChange, onComplete, disabled, invalid }: OtpFieldProps) {
  // Completion is a one-shot per code. Without this guard a re-render while
  // the request is in flight fires the submit again.
  const submitted = useRef(false);

  useEffect(() => {
    if (value.length < 6) {
      submitted.current = false;
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    onComplete();
  }, [value, onComplete]);

  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      disabled={disabled}
      containerClassName={cn("justify-between gap-2", invalid && "animate-otp-shake")}
      aria-label="Six-digit sign-in code"
    >
      <InputOTPGroup className="flex w-full justify-between gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className={cn(
              // Each digit is its own tile, so the border between them is gap
              // rather than a hairline.
              "h-14 w-full rounded-xl border border-input bg-background text-lg font-semibold tabular-nums",
              "first:rounded-xl last:rounded-xl",
              "transition-[border-color,box-shadow,transform] duration-150",
              // The tile being typed into lifts and takes the brand ring.
              "data-[active=true]:-translate-y-0.5 data-[active=true]:border-accent",
              "data-[active=true]:ring-2 data-[active=true]:ring-accent/25 data-[active=true]:ring-offset-0",
              invalid && "border-destructive text-destructive",
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
