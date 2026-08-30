/**
 * The bank details form, and the banner that asks for it.
 *
 * The account number is typed here by the member and goes straight into
 * save_affiliate_bank_details(), which encrypts it before it touches a row. It
 * is deliberately not held anywhere it could leak afterwards:
 *
 *   * The field is cleared the moment the dialog closes, so a number does not
 *     sit in React state behind a modal for the rest of the session.
 *   * Nothing here is logged, and no error message echoes what was typed.
 *   * What comes back is the masked summary — holder, bank, last four digits.
 *     The number cannot be read back by anyone, the member included, which
 *     means correcting a typo is retyping it. That is the right trade for a
 *     field written once and read only by a payout run.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveBankDetails } from "@/lib/affiliate/api";
import { maskAccount } from "@/lib/affiliate/link";
import type { AffiliateBankDetails } from "@/lib/affiliate/types";
import { AlertTriangle, Loader2, Lock, X } from "lucide-react";

const BLANK = { accountHolder: "", bankName: "", accountNumber: "", ifscCode: "" };

export function BankDetailsDialog({
  open,
  onOpenChange,
  details,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: AffiliateBankDetails;
  onSaved: (next: AffiliateBankDetails) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill only what is safe to show back, and drop the number from memory
  // as soon as the dialog is dismissed.
  useEffect(() => {
    if (open) {
      setForm({
        ...BLANK,
        accountHolder: details.account_holder ?? "",
        bankName: details.bank_name ?? "",
      });
      setError(null);
    } else {
      setForm(BLANK);
    }
  }, [open, details.account_holder, details.bank_name]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const { details: saved, error: failure } = await saveBankDetails(form);
    setSaving(false);

    if (failure || !saved) {
      setError(failure ?? "Could not save your bank details.");
      return;
    }

    // Clear before anything else: the number has been stored and has no
    // further reason to exist in this tab.
    setForm(BLANK);
    onSaved(saved);
    onOpenChange(false);
    toast({
      title: "Bank details saved",
      description: "Commissions will be paid to this account.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{details.has_details ? "Update bank details" : "Add bank details"}</DialogTitle>
          <DialogDescription>
            Paid out to this account. Only you can enter these, and the account number cannot be
            read back once saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="af-holder" className="text-xs">
              Account holder name
            </Label>
            <Input
              id="af-holder"
              value={form.accountHolder}
              onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
              autoComplete="off"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="af-bank" className="text-xs">
              Bank name
            </Label>
            <Input
              id="af-bank"
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              autoComplete="off"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="af-account" className="text-xs">
              Account number
              {details.account_last4 && (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  (currently {maskAccount(details.account_last4)})
                </span>
              )}
            </Label>
            <Input
              id="af-account"
              value={form.accountNumber}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              inputMode="numeric"
              // Off on purpose: a browser or password manager storing this is
              // exactly the copy this form exists to avoid.
              autoComplete="off"
              spellCheck={false}
              placeholder="9 to 18 digits"
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="af-ifsc" className="text-xs">
              IFSC code
            </Label>
            <Input
              id="af-ifsc"
              value={form.ifscCode}
              onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
              autoComplete="off"
              spellCheck={false}
              placeholder="HDFC0001234"
              className="mt-1 font-mono uppercase"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>
          )}

          <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your account number and IFSC are encrypted before they are stored. Nobody — including
            support — can read them back from this screen.
          </p>

          <Button className="w-full" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {details.has_details ? "Update bank details" : "Save bank details"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The warning strip above the dashboard.
 *
 * Dismissible, because a member who has decided to add their details later
 * should not have to read the same sentence on every visit — but dismissal is
 * per session rather than remembered, since the thing it warns about (unpaid
 * commissions piling up) does not go away by being acknowledged.
 */
export function BankDetailsBanner({
  onAdd,
  onDismiss,
}: {
  onAdd: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold">
            <span className="text-accent">Warning!</span> Your bank details are missing.
          </p>
          <p className="text-xs text-muted-foreground">
            Please add your details to start receiving commissions.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" className="font-semibold" onClick={onAdd}>
          Add bank details
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onDismiss}
          aria-label="Dismiss this warning"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
