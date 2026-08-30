/**
 * The inputs on the sign-in card.
 *
 * The shared `Input` is a 40px box with a hairline border, tuned for dense
 * admin tables where a screen holds thirty of them. An auth card holds two,
 * and they are the only thing on it — so these are taller, rounded to match
 * the card, and carry a leading icon that says what the field wants before
 * the label is read.
 *
 * Restyled here rather than in components/ui/input.tsx: changing that would
 * move every form in the app.
 */
import { forwardRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "h-11 rounded-xl border-input bg-secondary/40 pl-10 text-sm " +
  "focus-visible:border-accent focus-visible:bg-background focus-visible:ring-2 " +
  "focus-visible:ring-accent/20 focus-visible:ring-offset-0";

interface AuthFieldProps extends ComponentProps<"input"> {
  label: string;
  icon: LucideIcon;
  /** Sits on the label's right — "Forgot password?" and the like. */
  action?: React.ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon: Icon, action, id, className, ...props }, ref) => (
    <div>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={ref} id={id} className={cn(FIELD_CLASS, className)} {...props} />
      </div>
    </div>
  ),
);
AuthField.displayName = "AuthField";

/**
 * Password, with a reveal.
 *
 * Typing a long password blind into a field you cannot check is the most
 * common reason a correct password gets reported as wrong.
 */
export function AuthPasswordField({
  label,
  icon: Icon,
  action,
  id,
  ...props
}: Omit<AuthFieldProps, "type">) {
  const [shown, setShown] = useState(false);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} type={shown ? "text" : "password"} className={cn(FIELD_CLASS, "pr-10")} {...props} />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          // The label says what pressing it does, not what the field is doing.
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
