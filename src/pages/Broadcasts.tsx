import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell, Mail, MessageCircle, Send, Plus, RefreshCw, ChevronDown, Eye, MousePointerClick,
  Trash2, Clock, Users, Upload, FileText, BarChart3,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BroadcastRow {
  id: string;
  title: string;
  subject: string;
  content: string | null;
  broadcast_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  emails_unsubscribed: number;
  recipient_source: string | null;
  created_at: string;
}

interface EmailAccount {
  id: string;
  sender_name: string;
  sender_email: string;
  is_default: boolean;
}

interface CourseOption {
  id: string;
  title: string;
}

const defaultForm = {
  broadcast_type: "email",
  title: "",
  subject: "",
  content: "",
  sender_account_id: "",
  recipient_source: "courses",
  selected_courses: [] as string[],
  manual_emails: "",
  schedule_type: "now",
  scheduled_at: "",
};

export default function Broadcasts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [step, setStep] = useState(1); // 1: type, 2: compose, 3: recipients, 4: review

  const loadData = async () => {
    if (!user) return;
    const [bRes, aRes, cRes] = await Promise.all([
      supabase.from("email_broadcasts").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
      supabase.from("email_accounts").select("id, sender_name, sender_email, is_default").eq("coach_id", user.id),
      supabase.from("courses").select("id, title").eq("coach_id", user.id),
    ]);
    setBroadcasts((bRes.data as BroadcastRow[]) || []);
    setAccounts((aRes.data as EmailAccount[]) || []);
    setCourses((cRes.data as CourseOption[]) || []);
  };

  useEffect(() => { loadData(); }, [user]);

  const totals = broadcasts.reduce(
    (acc, b) => ({
      sent: acc.sent + b.emails_sent,
      opened: acc.opened + b.emails_opened,
      clicked: acc.clicked + b.emails_clicked,
    }),
    { sent: 0, opened: 0, clicked: 0 }
  );

  const openRate = totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : "0";
  const clickRate = totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(1) : "0";

  const handleCreate = async () => {
    if (!user || !form.title || !form.subject) {
      toast({ title: "Please fill title and subject", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Collect recipients
    let recipientEmails: Array<{ email: string; name: string | null }> = [];

    if (form.recipient_source === "manual" && form.manual_emails) {
      recipientEmails = form.manual_emails
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes("@"))
        .map((e) => ({ email: e, name: null }));
    } else if (form.recipient_source === "courses" && form.selected_courses.length > 0) {
      // Get enrolled students
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .in("course_id", form.selected_courses);
      if (enrollments && enrollments.length > 0) {
        const uids = [...new Set(enrollments.map((e: any) => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", uids);
        recipientEmails = (profiles || []).map((p: any) => ({ email: p.email, name: p.full_name }));
      }
    } else if (form.recipient_source === "community") {
      const { data: members } = await supabase.from("profiles").select("id, email, full_name");
      recipientEmails = (members || []).map((p: any) => ({ email: p.email, name: p.full_name }));
    }

    // Remove unsubscribed
    const { data: unsubs } = await supabase
      .from("email_unsubscribed")
      .select("email")
      .eq("coach_id", user.id);
    const unsubEmails = new Set((unsubs || []).map((u: any) => u.email.toLowerCase()));
    recipientEmails = recipientEmails.filter((r) => !unsubEmails.has(r.email.toLowerCase()));

    // Insert broadcast
    const { data: broadcast, error } = await supabase
      .from("email_broadcasts")
      .insert({
        coach_id: user.id,
        title: form.title,
        subject: form.subject,
        content: form.content || null,
        sender_account_id: form.sender_account_id || null,
        broadcast_type: form.broadcast_type,
        status: form.schedule_type === "later" ? "scheduled" : "draft",
        scheduled_at: form.schedule_type === "later" ? form.scheduled_at : null,
        total_recipients: recipientEmails.length,
        recipient_source: form.recipient_source,
      } as any)
      .select()
      .single();

    if (error || !broadcast) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Insert recipients
    if (recipientEmails.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < recipientEmails.length; i += batchSize) {
        const batch = recipientEmails.slice(i, i + batchSize).map((r) => ({
          broadcast_id: (broadcast as any).id,
          email: r.email,
          name: r.name,
        }));
        await supabase.from("email_recipients").insert(batch as any);
      }
    }

    toast({ title: "Broadcast created!", description: `${recipientEmails.length} recipient(s) added.` });
    setOpen(false);
    setForm({ ...defaultForm });
    setStep(1);
    loadData();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("email_broadcasts").delete().eq("id", id);
    toast({ title: "Broadcast deleted" });
    loadData();
  };

  const toggleCourse = (courseId: string) => {
    setForm((prev) => ({
      ...prev,
      selected_courses: prev.selected_courses.includes(courseId)
        ? prev.selected_courses.filter((c) => c !== courseId)
        : [...prev.selected_courses, courseId],
    }));
  };

  const openCreateModal = (type: string) => {
    setForm({ ...defaultForm, broadcast_type: type });
    setStep(1);
    setOpen(true);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold font-display">Broadcasts Overview</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Create Broadcast <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openCreateModal("email")}><Mail className="h-4 w-4 mr-2" />Email Broadcast</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateModal("push")}><Bell className="h-4 w-4 mr-2" />Push Notification</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateModal("whatsapp")}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp Broadcast</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Create and manage marketing broadcasts</p>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Broadcasts</p>
                  <p className="text-3xl font-bold mt-1">{broadcasts.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted"><Send className="h-5 w-5 text-muted-foreground" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-info">Emails Sent</p>
                  <p className="text-3xl font-bold mt-1">{totals.sent}</p>
                </div>
                <div className="p-2 rounded-lg bg-info/10"><Mail className="h-5 w-5 text-info" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-success">Open Rate</p>
                  <p className="text-3xl font-bold mt-1">{openRate}%</p>
                </div>
                <div className="p-2 rounded-lg bg-success/10"><Eye className="h-5 w-5 text-success" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-accent">Click Rate</p>
                  <p className="text-3xl font-bold mt-1">{clickRate}%</p>
                </div>
                <div className="p-2 rounded-lg bg-accent/10"><MousePointerClick className="h-5 w-5 text-accent" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Broadcasts Table */}
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Broadcasts</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({broadcasts.length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({broadcasts.filter(b => b.status === "sent").length})</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled ({broadcasts.filter(b => b.status === "scheduled").length})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({broadcasts.filter(b => b.status === "draft").length})</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 mb-4">
                <Input placeholder="Search broadcasts..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button>
              </div>

              {["all", "sent", "scheduled", "draft"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Broadcast</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {broadcasts
                        .filter((b) => tab === "all" || b.status === tab)
                        .filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
                        .length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                            <p className="font-semibold text-sm">No broadcasts found</p>
                            <p className="text-xs text-muted-foreground mt-1">Create your first broadcast to get started</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        broadcasts
                          .filter((b) => tab === "all" || b.status === tab)
                          .filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
                          .map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{b.title}</p>
                                  <p className="text-xs text-muted-foreground">{b.subject}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize text-xs">{b.broadcast_type}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{b.total_recipients}</TableCell>
                              <TableCell className="text-sm">{b.emails_sent}</TableCell>
                              <TableCell className="text-sm">{b.emails_opened}</TableCell>
                              <TableCell className="text-sm">
                                {b.sent_at ? format(new Date(b.sent_at), "MMM d, yyyy") : b.scheduled_at ? format(new Date(b.scheduled_at), "MMM d, yyyy") : format(new Date(b.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  b.status === "sent" ? "bg-success text-success-foreground" :
                                  b.status === "scheduled" ? "bg-info text-info-foreground" :
                                  b.status === "sending" ? "bg-accent text-accent-foreground" :
                                  "bg-secondary text-secondary-foreground"
                                }>
                                  {b.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Create Broadcast Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Create {form.broadcast_type === "email" ? "Email" : form.broadcast_type === "push" ? "Push Notification" : "WhatsApp"} Broadcast
              </DialogTitle>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {["Compose", "Recipients", "Schedule & Send"].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i + 1)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    step === i + 1
                      ? "bg-accent text-accent-foreground"
                      : step > i + 1
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                    {step > i + 1 ? "✓" : i + 1}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            {/* Step 1: Compose */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Broadcast Title</Label>
                  <Input placeholder="e.g. AI Workshop Announcement" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                {form.broadcast_type === "email" && (
                  <>
                    <div>
                      <Label>Email Subject</Label>
                      <Input placeholder="e.g. Join Tomorrow's AI Workshop" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                    </div>
                    <div>
                      <Label>Sender Account</Label>
                      <Select value={form.sender_account_id || "none"} onValueChange={(v) => setForm({ ...form, sender_account_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select sender account" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Default</SelectItem>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.sender_name} &lt;{a.sender_email}&gt;</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {accounts.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">No sender accounts configured. <a href="/settings" className="text-accent underline">Add one in Settings</a></p>
                      )}
                    </div>
                    <div>
                      <Label>Email Content</Label>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 border-b border-border">
                          <button className="p-1 hover:bg-muted rounded text-xs font-bold">B</button>
                          <button className="p-1 hover:bg-muted rounded text-xs italic">I</button>
                          <button className="p-1 hover:bg-muted rounded text-xs underline">U</button>
                          <span className="w-px h-4 bg-border mx-1" />
                          <button className="p-1 hover:bg-muted rounded text-xs">H1</button>
                          <button className="p-1 hover:bg-muted rounded text-xs">H2</button>
                          <span className="w-px h-4 bg-border mx-1" />
                          <button className="p-1 hover:bg-muted rounded text-xs">🔗 Link</button>
                          <button className="p-1 hover:bg-muted rounded text-xs">🖼️ Image</button>
                          <button className="p-1 hover:bg-muted rounded text-xs">📹 Video</button>
                          <button className="p-1 hover:bg-muted rounded text-xs">🔘 Button</button>
                        </div>
                        <Textarea
                          placeholder="Write your email content here... (HTML supported)"
                          className="border-0 rounded-none min-h-[200px] focus-visible:ring-0"
                          value={form.content}
                          onChange={(e) => setForm({ ...form, content: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
                {form.broadcast_type !== "email" && (
                  <div>
                    <Label>Message Content</Label>
                    <Textarea
                      placeholder="Write your message..."
                      rows={5}
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                    />
                  </div>
                )}
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(2)}>
                  Next: Select Recipients →
                </Button>
              </div>
            )}

            {/* Step 2: Recipients */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="font-semibold">Import Recipients</Label>
                  <Select value={form.recipient_source} onValueChange={(v) => setForm({ ...form, recipient_source: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courses">From Courses</SelectItem>
                      <SelectItem value="community">From Community Members</SelectItem>
                      <SelectItem value="manual">Manual Email Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.recipient_source === "courses" && (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Select courses to import students from:</Label>
                    {courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No courses found.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                        {courses.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={form.selected_courses.includes(c.id)}
                              onCheckedChange={() => toggleCourse(c.id)}
                            />
                            <span className="text-sm">{c.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {form.recipient_source === "community" && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">All Community Members</p>
                    <p className="text-xs text-muted-foreground">Will import all user profiles as recipients</p>
                  </div>
                )}

                {form.recipient_source === "manual" && (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Enter email addresses (one per line or comma-separated):</Label>
                    <Textarea
                      placeholder={"rahul@gmail.com\nanita@gmail.com\npriya@gmail.com"}
                      rows={6}
                      value={form.manual_emails}
                      onChange={(e) => setForm({ ...form, manual_emails: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.manual_emails.split(/[\n,;]+/).filter(e => e.trim().includes("@")).length} email(s) entered
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                  <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(3)}>
                    Next: Schedule →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Schedule & Send */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="font-semibold">When to send?</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                      <input type="radio" name="schedule" checked={form.schedule_type === "now"} onChange={() => setForm({ ...form, schedule_type: "now" })} className="accent-[hsl(var(--accent))]" />
                      <div>
                        <p className="text-sm font-medium">Send Immediately</p>
                        <p className="text-xs text-muted-foreground">Broadcast will be queued for sending right away</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                      <input type="radio" name="schedule" checked={form.schedule_type === "later"} onChange={() => setForm({ ...form, schedule_type: "later" })} className="accent-[hsl(var(--accent))]" />
                      <div>
                        <p className="text-sm font-medium">Schedule for Later</p>
                        <p className="text-xs text-muted-foreground">Choose date and time to send</p>
                      </div>
                    </label>
                  </div>
                  {form.schedule_type === "later" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Schedule Date & Time</Label>
                      <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                    </div>
                  )}
                </div>

                {/* Review summary */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Review Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{form.broadcast_type}</span></div>
                    <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{form.title || "—"}</span></div>
                    <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{form.subject || "—"}</span></div>
                    <div><span className="text-muted-foreground">Source:</span> <span className="font-medium capitalize">{form.recipient_source}</span></div>
                    <div><span className="text-muted-foreground">Schedule:</span> <span className="font-medium">{form.schedule_type === "now" ? "Immediately" : form.scheduled_at || "—"}</span></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleCreate}
                    disabled={loading}
                  >
                    {loading ? "Creating..." : form.schedule_type === "later" ? "Schedule Broadcast" : "Create & Send"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
