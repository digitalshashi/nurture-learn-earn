import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 7200 },
  { month: "Apr", revenue: 6100 },
  { month: "May", revenue: 8400 },
  { month: "Jun", revenue: 9200 },
];

const metrics = [
  { title: "Total Revenue", value: "$41,000", icon: DollarSign, color: "text-success" },
  { title: "This Month", value: "$9,200", icon: TrendingUp, color: "text-accent" },
  { title: "Transactions", value: "342", icon: CreditCard, color: "text-info" },
  { title: "Available Balance", value: "$3,450", icon: Wallet, color: "text-accent" },
];

export default function SalesEarnings() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Earnings</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {metrics.map((m) => (
            <Card key={m.title} className="card-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                  <span className="text-xs text-muted-foreground">{m.title}</span>
                </div>
                <p className="text-xl font-bold">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
