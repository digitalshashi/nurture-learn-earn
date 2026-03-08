import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check } from "lucide-react";

const plans = [
  { name: "Starter", price: "$29/mo", features: ["1 Course", "100 Students", "Basic Analytics", "Email Support"], current: false },
  { name: "Pro", price: "$79/mo", features: ["10 Courses", "1,000 Students", "Advanced Analytics", "Priority Support", "Certificates"], current: true },
  { name: "Business", price: "$199/mo", features: ["Unlimited Courses", "Unlimited Students", "All Features", "White Label", "API Access"], current: false },
];

const invoices = [
  { date: "Mar 1, 2026", amount: "$79.00", status: "paid" },
  { date: "Feb 1, 2026", amount: "$79.00", status: "paid" },
  { date: "Jan 1, 2026", amount: "$79.00", status: "paid" },
];

export default function Billing() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Billing & Plans</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {plans.map((p) => (
            <Card key={p.name} className={`card-shadow ${p.current ? "ring-2 ring-accent" : ""}`}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.current && <Badge className="bg-accent text-accent-foreground">Current</Badge>}
                </div>
                <p className="text-2xl font-bold mb-4">{p.price}</p>
                <ul className="space-y-2 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" />{f}</li>
                  ))}
                </ul>
                <Button variant={p.current ? "outline" : "default"} className={!p.current ? "bg-accent text-accent-foreground hover:bg-accent/90 w-full" : "w-full"}>
                  {p.current ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Invoices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((inv, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{inv.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{inv.amount}</span>
                  <Badge className="bg-success text-success-foreground text-[10px]">{inv.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
