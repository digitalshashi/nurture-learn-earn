export interface StaircaseStep {
  month: string; // YYYY-MM-01
  label: string; // e.g. "Mar 2026"
  targetRevenue: number;
}

/**
 * Turns a target income + target date into a month-by-month revenue
 * staircase. Uses compound growth from the starting monthly revenue so early
 * months ramp gently and later months carry more of the increase.
 */
export function buildStaircase(
  startingMonthlyRevenue: number,
  targetAmount: number,
  targetDate: string,
): StaircaseStep[] {
  const start = new Date();
  start.setDate(1);
  const end = new Date(targetDate);
  end.setDate(1);

  const months = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
  );

  const base = Math.max(startingMonthlyRevenue, 1);
  const growthRate = Math.pow(targetAmount / base, 1 / months) - 1;

  const steps: StaircaseStep[] = [];
  for (let i = 1; i <= months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const revenue = i === months ? targetAmount : base * Math.pow(1 + growthRate, i);
    steps.push({
      month: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      targetRevenue: Math.round(revenue),
    });
  }
  return steps;
}

export function stageForRevenue(monthlyRevenue: number): string {
  if (monthlyRevenue < 1000) return "Foundation ($0-1k/mo)";
  if (monthlyRevenue < 10000) return "Traction ($1k-10k/mo)";
  if (monthlyRevenue < 30000) return "Growth ($10k-30k/mo)";
  if (monthlyRevenue < 100000) return "Scale ($30k-100k/mo)";
  return "Leader ($100k+/mo)";
}
