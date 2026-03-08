import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Mail, Pencil } from "lucide-react";

const templates = [
  { name: "Purchase Confirmation", description: "Sent after successful purchase", enabled: true },
  { name: "Purchase Drop-off Reminder", description: "Sent when user abandons checkout", enabled: true },
  { name: "Failed Purchase Reminder", description: "Sent after payment failure", enabled: false },
  { name: "New Post Notification", description: "Sent when you publish a new post", enabled: false },
  { name: "Comment Notification", description: "Sent when someone comments", enabled: true },
  { name: "Workshop Reminder", description: "Sent 1 hour before workshop", enabled: true },
  { name: "Course Completion", description: "Sent when student completes a course", enabled: true },
  { name: "Subscription Expiry", description: "Sent before subscription expires", enabled: false },
];

export default function EmailAutomation() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Email Automation</h1>

        <Card className="card-shadow mb-6">
          <CardHeader><CardTitle className="text-sm">Email Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>From Name</Label><Input defaultValue="My Creator Brand" /></div>
            <div><Label>Reply-To Email</Label><Input defaultValue="hello@mybrand.com" /></div>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Settings</Button>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Email Templates</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {templates.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-accent/10"><Mail className="h-4 w-4 text-accent" /></div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch defaultChecked={t.enabled} />
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
