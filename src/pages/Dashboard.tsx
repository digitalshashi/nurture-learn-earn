import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, BookOpen, TrendingUp, ShoppingCart, Eye } from "lucide-react";

const stats = [
  { title: "Total Revenue", value: "₹12,45,000", change: "+12%", icon: DollarSign, color: "text-success" },
  { title: "Active Students", value: "2,847", change: "+8%", icon: Users, color: "text-info" },
  { title: "Courses", value: "12", change: "+2", icon: BookOpen, color: "text-accent" },
  { title: "Course Sales", value: "384", change: "+15%", icon: ShoppingCart, color: "text-success" },
  { title: "Page Views", value: "18.2K", change: "+22%", icon: Eye, color: "text-info" },
  { title: "Conversion", value: "4.2%", change: "+0.5%", icon: TrendingUp, color: "text-accent" },
];

const recentSales = [
  { name: "Rahul Sharma", course: "Freedom Business Model", amount: "₹4,999", time: "2 min ago" },
  { name: "Priya Patel", course: "AI Content Mastery", amount: "₹2,999", time: "15 min ago" },
  { name: "Amit Kumar", course: "Niche Clarity Codex", amount: "₹3,499", time: "1 hr ago" },
  { name: "Sneha Gupta", course: "NalandaX", amount: "₹9,999", time: "2 hr ago" },
  { name: "Vikash Singh", course: "Freedom Hackathon 11", amount: "₹1,999", time: "3 hr ago" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-6">
        <h1 className="text-3xl font-bold font-display mb-6">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="card-shadow hover:card-shadow-hover transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className={`text-xs font-semibold mt-1 ${stat.color}`}>{stat.change}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Sales */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                      {sale.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sale.name}</p>
                      <p className="text-xs text-muted-foreground">{sale.course}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{sale.amount}</p>
                    <p className="text-xs text-muted-foreground">{sale.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
