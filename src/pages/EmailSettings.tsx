import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Mail, Trash2, Settings, Check, X, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplatesTab } from "@/components/settings/EmailTemplatesTab";

interface EmailAccount {
  id: string;
  coach_id: string;
  sender_name: string;
  sender_email: string;
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_encryption: string | null;
  smtp_username: string | null;
  api_key: string | null;
  api_domain: string | null;
  api_region: string | null;
  reply_to_name: string | null;
  reply_to_email: string | null;
  is_default: boolean;
  is_platform_default: boolean;
  is_verified: boolean;
  created_at: string;
}

const defaultForm = {
  sender_name: "",
  sender_email: "",
  provider: "smtp",
  smtp_host: "",
  smtp_port: 587,
  smtp_encryption: "tls",
  smtp_username: "",
  smtp_password: "",
  api_key: "",
  api_domain: "",
  api_region: "",
  reply_to_name: "",
  reply_to_email: "",
  is_default: false,
};

const PROVIDERS = [
  { value: "smtp", label: "SMTP" },
  { value: "resend", label: "Resend" },
  { value: "mailersend", label: "MailerSend" },
  { value: "ses", label: "Amazon SES" },
  { value: "sendgrid", label: "SendGrid" },
  { value: "mailgun", label: "Mailgun" },
  { value: "postmark", label: "Postmark" },
  { value: "brevo", label: "Brevo (Sendinblue)" },
];

const SMTP_STYLE_PROVIDERS = ["smtp", "ses"];

export default function EmailSettings() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const loadAccounts = async () => {
    if (!user) return;
    let query = supabase.from("email_accounts" as any).select("*").order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("coach_id", user.id);
    const { data } = await query;
    setAccounts((data as any as EmailAccount[]) || []);
  };

  useEffect(() => { loadAccounts(); }, [user, isAdmin]);

  const handleCreate = async () => {
    if (!user || !form.sender_name || !form.sender_email) {
      toast({ title: "Please fill sender name and email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const isSmtpStyle = SMTP_STYLE_PROVIDERS.includes(form.provider);

    const { error } = await supabase.from("email_accounts" as any).insert({
      coach_id: user.id,
      sender_name: form.sender_name,
      sender_email: form.sender_email,
      provider: form.provider,
      smtp_host: isSmtpStyle ? form.smtp_host : null,
      smtp_port: isSmtpStyle ? form.smtp_port : null,
      smtp_encryption: isSmtpStyle ? form.smtp_encryption : null,
      smtp_username: isSmtpStyle ? form.smtp_username : null,
      smtp_password: isSmtpStyle ? form.smtp_password : null,
      api_key: !isSmtpStyle ? form.api_key : null,
      api_domain: !isSmtpStyle ? form.api_domain : null,
      api_region: form.provider === "ses" ? form.api_region : null,
      reply_to_name: form.reply_to_name || null,
      reply_to_email: form.reply_to_email || null,
      is_default: form.is_default,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email account added!" });
      setOpen(false);
      setForm({ ...defaultForm });
      loadAccounts();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("email_accounts" as any).delete().eq("id", id);
    toast({ title: "Account deleted" });
    loadAccounts();
  };

  const handleSetDefault = async (id: string, coachId: string) => {
    if (!user) return;
    await supabase.from("email_accounts" as any).update({ is_default: false } as any).eq("coach_id", coachId);
    await supabase.from("email_accounts" as any).update({ is_default: true } as any).eq("id", id);
    toast({ title: "Default sender updated" });
    loadAccounts();
  };

  const handleSetPlatformDefault = async (id: string) => {
    setLoading(true);
    await supabase.from("email_accounts" as any).update({ is_platform_default: false } as any).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("email_accounts" as any).update({ is_platform_default: true } as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Platform-default sender updated", description: "This account will send all system emails, including login OTP codes." });
    loadAccounts();
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold font-display">Email Settings</h1>
          <p className="text-sm text-muted-foreground">Configure sender accounts, email providers, and templates</p>
        </div>

        <Tabs defaultValue="accounts">
          <TabsList className="mb-4">
            <TabsTrigger value="accounts">Sender Accounts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <div className="flex items-center justify-end mb-4">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="h-4 w-4 mr-1" /> Add Sender Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Sender Account</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Sender (From) Name</Label><Input placeholder="John Doe" value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} /></div>
                      <div><Label>Sender (From) Email</Label><Input placeholder="info@coach.com" value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} /></div>
                    </div>

                    <div>
                      <Label>Email Provider</Label>
                      <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {SMTP_STYLE_PROVIDERS.includes(form.provider) && (
                      <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5"><Settings className="h-4 w-4" /> SMTP Configuration</h4>
                        {form.provider === "ses" && (
                          <p className="text-xs text-muted-foreground">
                            Enter your Amazon SES <strong>SMTP credentials</strong> from the SES console (Simple Mail Transfer Protocol settings) — not your raw IAM access keys.
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">SMTP Host</Label><Input placeholder={form.provider === "ses" ? "email-smtp.us-east-1.amazonaws.com" : "smtp.gmail.com"} value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} /></div>
                          <div><Label className="text-xs">SMTP Port</Label><Input type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })} /></div>
                        </div>
                        <div>
                          <Label className="text-xs">Encryption</Label>
                          <Select value={form.smtp_encryption} onValueChange={(v) => setForm({ ...form, smtp_encryption: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tls">TLS</SelectItem>
                              <SelectItem value="ssl">SSL</SelectItem>
                              <SelectItem value="none_enc">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Username</Label><Input placeholder="your@email.com" value={form.smtp_username} onChange={(e) => setForm({ ...form, smtp_username: e.target.value })} /></div>
                          <div><Label className="text-xs">Password</Label><Input type="password" placeholder="••••••••" value={form.smtp_password} onChange={(e) => setForm({ ...form, smtp_password: e.target.value })} /></div>
                        </div>
                      </div>
                    )}

                    {!SMTP_STYLE_PROVIDERS.includes(form.provider) && (
                      <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5"><Settings className="h-4 w-4" /> API Configuration</h4>
                        <div><Label className="text-xs">API Key</Label><Input type="password" placeholder="Enter API key" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
                        <div><Label className="text-xs">Domain (optional)</Label><Input placeholder="mg.yourdomain.com" value={form.api_domain} onChange={(e) => setForm({ ...form, api_domain: e.target.value })} /></div>
                      </div>
                    )}

                    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                      <h4 className="text-sm font-semibold">Reply-To (optional)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Reply-To Name</Label><Input placeholder="Support Team" value={form.reply_to_name} onChange={(e) => setForm({ ...form, reply_to_name: e.target.value })} /></div>
                        <div><Label className="text-xs">Reply-To Email</Label><Input placeholder="support@coach.com" value={form.reply_to_email} onChange={(e) => setForm({ ...form, reply_to_email: e.target.value })} /></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Set as my default sender</Label>
                      <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
                    </div>

                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={loading}>
                      {loading ? "Adding..." : "Add Account"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isAdmin && (
              <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <Shield className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p>As an admin, mark exactly one verified account below as the <strong>Platform Default</strong> — it sends all system emails (like login OTP codes) for every user on the platform, regardless of which coach configured it.</p>
              </div>
            )}

            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-base">Sender Accounts</CardTitle></CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-medium">No sender accounts configured</p>
                    <p className="text-xs text-muted-foreground mt-1">Add your first email sender account to start sending broadcasts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Default</TableHead>
                        {isAdmin && <TableHead>Platform Default</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{a.sender_name}</p>
                              <p className="text-xs text-muted-foreground">{a.sender_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">{a.provider}</Badge>
                          </TableCell>
                          <TableCell>
                            {a.is_verified ? (
                              <Badge className="bg-success text-success-foreground text-xs"><Check className="h-3 w-3 mr-0.5" />Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs"><X className="h-3 w-3 mr-0.5" />Unverified</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {a.is_default ? (
                              <Badge className="bg-accent text-accent-foreground text-xs">Default</Badge>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleSetDefault(a.id, a.coach_id)}>Set default</Button>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              {a.is_platform_default ? (
                                <Badge className="bg-success text-success-foreground text-xs"><Shield className="h-3 w-3 mr-0.5" />Platform Default</Badge>
                              ) : (
                                <Button variant="ghost" size="sm" className="text-xs h-7" disabled={!a.is_verified || loading} onClick={() => handleSetPlatformDefault(a.id)}>
                                  Set as platform default
                                </Button>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplatesTab isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
