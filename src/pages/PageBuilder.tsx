import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layout, FileText, ShoppingCart, Magnet } from "lucide-react";

const pageTypes = [
  { title: "Landing Page", description: "Create a beautiful landing page for your course", icon: Layout, color: "bg-info/10 text-info" },
  { title: "Checkout Page", description: "Customize your checkout experience", icon: ShoppingCart, color: "bg-accent/10 text-accent" },
  { title: "Sales Funnel", description: "Build a multi-step sales funnel", icon: FileText, color: "bg-success/10 text-success" },
  { title: "Lead Capture", description: "Capture leads with forms and CTAs", icon: Magnet, color: "bg-destructive/10 text-destructive" },
];

const mockPages = [
  { title: "Growth Masterclass Landing", type: "Landing Page", views: 1240, conversions: 89, updated: "Mar 7, 2026" },
  { title: "Course Checkout", type: "Checkout Page", views: 890, conversions: 124, updated: "Mar 5, 2026" },
];

export default function PageBuilder() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Page Builder</h1>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" />Create Page</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {pageTypes.map((p) => (
            <Card key={p.title} className="card-shadow cursor-pointer hover:card-shadow-hover transition-shadow">
              <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-xl ${p.color}`}><p.icon className="h-6 w-6" /></div>
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-sm font-semibold mb-3">My Pages</h2>
        <div className="space-y-3">
          {mockPages.map((p, i) => (
            <Card key={i} className="card-shadow">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.type} · Updated {p.updated}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{p.views} views</span>
                  <span>{p.conversions} conversions</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
