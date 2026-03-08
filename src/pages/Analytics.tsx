import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, DollarSign, TrendingUp, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const visitData = [
  { name: "Mon", visits: 120, purchases: 12 },
  { name: "Tue", visits: 180, purchases: 18 },
  { name: "Wed", visits: 150, purchases: 22 },
  { name: "Thu", visits: 220, purchases: 30 },
  { name: "Fri", visits: 280, purchases: 35 },
  { name: "Sat", visits: 200, purchases: 25 },
  { name: "Sun", visits: 160, purchases: 20 },
];

const conversionData = [
  { name: "Week 1", rate: 8.2 },
  { name: "Week 2", rate: 10.5 },
  { name: "Week 3", rate: 9.8 },
  { name: "Week 4", rate: 12.1 },
];

const metrics = [
  { title: "Total Visits", value: "12,485", icon: Eye, color: "text-info" },
  { title: "Conversion Rate", value: "8.4%", icon: TrendingUp, color: "text-success" },
  { title: "Total Purchases", value: "1,049", icon: BarChart3, color: "text-accent" },
  { title: "Revenue", value: "$24,580", icon: DollarSign, color: "text-accent" },
  { title: "Active Users", value: "3,241", icon: Users, color: "text-info" },
];

export default function Analytics() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Analytics</h1>
          <div className="flex gap-2">
            <Select defaultValue="7d">
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="courses">Courses</SelectItem>
                <SelectItem value="workshops">Workshops</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
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

        <Tabs defaultValue="checkout">
          <TabsList className="mb-4">
            <TabsTrigger value="checkout">Checkout Page</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="checkout">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="card-shadow">
                <CardHeader><CardTitle className="text-sm">Visits vs Purchases</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={visitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="visits" fill="hsl(var(--info))" radius={[4,4,0,0]} />
                      <Bar dataKey="purchases" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardHeader><CardTitle className="text-sm">Conversion Rate</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={conversionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="rate" fill="hsl(var(--accent) / 0.15)" stroke="hsl(var(--accent))" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="card-shadow"><CardContent className="py-12 text-center text-muted-foreground text-sm">Transaction analytics coming soon</CardContent></Card>
          </TabsContent>
          <TabsContent value="users">
            <Card className="card-shadow"><CardContent className="py-12 text-center text-muted-foreground text-sm">User analytics coming soon</CardContent></Card>
          </TabsContent>
          <TabsContent value="courses">
            <Card className="card-shadow"><CardContent className="py-12 text-center text-muted-foreground text-sm">Course analytics coming soon</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
