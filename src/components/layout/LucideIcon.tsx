import { icons } from "lucide-react";

/**
 * Renders a Lucide icon from its kebab-case name, the form nav items are
 * stored in (`navigation_menu.icon_name`). Unknown names fall back to a
 * circle rather than rendering nothing, so a bad row is visible, not silent.
 */
export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const IconComp = (icons as any)[pascalName];
  if (!IconComp) {
    const Fallback = (icons as any)["Circle"];
    return Fallback ? <Fallback className={className} /> : null;
  }
  return <IconComp className={className} />;
}
