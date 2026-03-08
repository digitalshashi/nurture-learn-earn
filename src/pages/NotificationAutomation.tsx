import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Bell, Pencil } from "lucide-react";
import { useState } from "react";

const notificationTemplates = [
  { name: "New Lesson Available", description: "When a new lesson is published in enrolled course", trigger: "lesson_published", enabled: true },
  { name: "Community Post Mention", description: "When someone mentions or tags the user", trigger: "community_mention", enabled: true },
  { name: "XP Reward Earned", description: "When user earns XP from completing an action", trigger: "xp_earned", enabled: false },
  { name: "Leaderboard Rank Change", description: "When user moves up or down the leaderboard", trigger: "leaderboard_change", enabled: false },
  { name: "Assignment Graded", description: "When coach grades a submitted assignment", trigger: "assignment_graded", enabled: true },
  { name: "Course Certificate Ready", description: "When user completes course and certificate is generated", trigger: "certificate_ready", enabled: true },
  { name: "New Workshop Scheduled", description: "When coach schedules a new workshop", trigger: "workshop_scheduled", enabled: true },
  { name: "Workshop Starting Soon", description: "15 minutes before a registered workshop", trigger: "workshop_starting", enabled: true },
  { name: "New Badge Earned", description: "When user unlocks a new achievement badge", trigger: "badge_earned", enabled: false },
  { name: "Challenge Completed", description: "When user completes a gamification challenge", trigger: "challenge_completed", enabled: true },
  { name: "Subscription Expiring", description: "3 days before subscription expires", trigger: "subscription_expiring", enabled: false },
  { name: "Comment Reply", description: "When someone replies to user's comment", trigger: "comment_reply", enabled: true },
];

export default function NotificationAutomation() {
  const [templates, setTemplates] = useState(notificationTemplates);

  const toggleTemplate = (index: number) => {
    const updated = [...templates];
    updated[index].enabled = !updated[index].enabled;
    setTemplates(updated);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Notification Automation</h1>
            <p className="text-sm text-muted-foreground">Configure in-app push notifications for students</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Notifications</p><p className="text-2xl font-bold">{templates.filter(t => t.enabled).length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Templates</p><p className="text-2xl font-bold">{templates.length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Disabled</p><p className="text-2xl font-bold">{templates.filter(t => !t.enabled).length}</p></CardContent></Card>
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Notification Templates</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {templates.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-accent/10"><Bell className="h-4 w-4 text-accent" /></div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={t.enabled} onCheckedChange={() => toggleTemplate(i)} />
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
