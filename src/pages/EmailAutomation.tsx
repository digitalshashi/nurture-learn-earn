import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Mail, Pencil } from "lucide-react";

const templates = [
  { name: "Confirmation Email on Service Purchase", enabled: true },
  { name: "Reminder Email on Purchase Drop-off", enabled: true },
  { name: "Reminder Email on Failed Purchase", enabled: false },
  { name: "Notification Email on New Post Creation", enabled: true },
  { name: "Notification Email on Post Comment", enabled: true },
  { name: "Notification Email on Comment Like", enabled: true },
  { name: "Notification Email on Comment Reply", enabled: true },
  { name: "Notification Email on Tagging Someone in A Comment", enabled: true },
  { name: "Promotional Email on Service Creation", enabled: false },
  { name: "Notification Email on Single Workshop Creation", enabled: true },
  { name: "Notification Email on Recurring Workshop Creation", enabled: true },
  { name: "Notification Email on Rescheduling a Workshop", enabled: true },
  { name: "Notification Email on Workshop Cancellation", enabled: true },
  { name: "Reminder Email 24 hours before Workshop", enabled: true },
  { name: "Reminder Email 30 mins before Workshop", enabled: true },
  { name: "Reminder Email 15 mins before Workshop", enabled: true },
  { name: "Post Workshop Email 15 mins after Workshop", enabled: true },
  { name: "Notification Email after Subscription Expired", enabled: false },
  { name: "Notification Email for 10% Course Completion", enabled: false },
  { name: "Notification Email for 50% Course Completion", enabled: false },
  { name: "Notification Email for 100% Course Completion", enabled: true },
  { name: "Confirmation Email on 1-1 Consultation Booking", enabled: true },
  { name: "Reminder Email 30 mins before 1-1 Consultation", enabled: true },
  { name: "Cancellation Email on 1-1 Consultation Booking Cancel", enabled: true },
];

export default function EmailAutomation() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Email Automation</h1>

        <Card className="card-shadow mb-6">
          <CardHeader><CardTitle className="text-sm">Email Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>From Name *</Label>
              <Input defaultValue="My Creator Brand" />
              <p className="text-[10px] text-muted-foreground mt-0.5">This is the sender name your recipients shall see in the custom mails and broadcast mails</p>
            </div>
            <div>
              <Label>Reply to Email Address *</Label>
              <Input defaultValue="hello@mybrand.com" />
              <p className="text-[10px] text-muted-foreground mt-0.5">This is the email id to which your subscribers' replies shall be routed</p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Templates</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_80px_60px] gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
              <span>Template Type</span>
              <span className="text-center">Enabled</span>
              <span className="text-center">Actions</span>
            </div>
            {templates.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_60px] gap-2 items-center px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">+</span>
                  <span className="text-sm">{t.name}</span>
                </div>
                <div className="flex justify-center">
                  <Switch defaultChecked={t.enabled} />
                </div>
                <div className="flex justify-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
