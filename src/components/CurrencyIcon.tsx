import { DollarSign, Euro, IndianRupee, type LucideProps } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { type CurrencyCode } from "@/lib/currency";

const ICONS: Record<CurrencyCode, typeof DollarSign> = {
  INR: IndianRupee,
  EUR: Euro,
  USD: DollarSign,
};

/**
 * The money glyph for the workspace currency.
 *
 * Every "money" affordance in the product used lucide's DollarSign, so a
 * workspace pricing in rupees still showed a dollar sign on its earnings tiles,
 * revenue cards and nav. This picks the matching glyph instead.
 */
export function CurrencyIcon(props: LucideProps) {
  const { currency } = useCurrency();
  const Icon = ICONS[currency] ?? DollarSign;
  return <Icon {...props} />;
}

/** For a specific currency rather than the workspace one. */
export function CurrencyIconFor({ code, ...props }: LucideProps & { code: unknown }) {
  const Icon = ICONS[(code as CurrencyCode)] ?? DollarSign;
  return <Icon {...props} />;
}

export default CurrencyIcon;
