import { NavLink } from "react-router-dom";
import { ArrowLeftRight, CreditCard, Wallet, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyIcon } from "@/components/CurrencyIcon";

// Typed by props rather than LucideIcon so CurrencyIcon, which is a plain
// component wrapping the right glyph, fits alongside the lucide ones.
const TABS: { to: string; label: string; icon: React.ComponentType<LucideProps> }[] = [
  { to: "/sales/earnings", label: "Earnings", icon: CurrencyIcon },
  { to: "/sales/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/sales/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/sales/withdrawals", label: "Withdrawals", icon: Wallet },
];

/** Shared header so the four Sales pages read as one section. */
export function SalesNav({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold font-display">{title}</h1>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>

      <nav
        aria-label="Sales sections"
        className="mt-4 flex gap-1 overflow-x-auto scrollbar-none border-b border-border"
      >
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 shrink-0 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
                "border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default SalesNav;
