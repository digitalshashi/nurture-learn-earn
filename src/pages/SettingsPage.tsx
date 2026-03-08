import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="domain">Custom Domain</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Full Name</Label><Input defaultValue={user?.user_metadata?.full_name || ""} /></div>
                <div><Label>Email</Label><Input defaultValue={user?.email || ""} readOnly /></div>
                <div><Label>Bio</Label><Textarea placeholder="Tell us about yourself..." rows={3} /></div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Save Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Branding</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Brand Name</Label><Input placeholder="Your brand name" /></div>
                <div><Label>Brand Color</Label><Input type="color" defaultValue="#f97316" className="h-10 w-20" /></div>
                <div><Label>Logo URL</Label><Input placeholder="https://..." /></div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Save Branding</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Custom Domain</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Custom Domain</Label><Input placeholder="yourdomain.com" /></div>
                <p className="text-xs text-muted-foreground">Point your domain's CNAME to our servers to enable custom domain.</p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Verify Domain</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Payment Gateway</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div><p className="text-sm font-medium">Stripe</p><p className="text-xs text-muted-foreground">Accept card payments</p></div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div><p className="text-sm font-medium">Razorpay</p><p className="text-xs text-muted-foreground">Accept Indian payments</p></div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
