import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, ShoppingBag, CreditCard, Mail, LogOut, Trash2, UserCircle, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function MyAccount() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (data) {
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setEmail(data.email || user?.email || "");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, bio }).eq("id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDeleteAccount = () => {
    toast({ title: "Contact support", description: "Please contact support to delete your account." });
  };

  const initials = fullName ? fullName.charAt(0).toUpperCase() : "U";

  const menuItems = [
    { icon: UserCircle, label: "View Profile", desc: "See your public profile", action: () => navigate(`/profile/${user?.id}`) },
    { icon: User, label: "Personal Information", desc: "Update your name and bio", action: null },
    { icon: ShoppingBag, label: "Purchase History", desc: "View purchases and invoices", action: () => toast({ title: "Coming soon" }) },
    { icon: CreditCard, label: "Payment Details", desc: "Manage payment methods", action: () => toast({ title: "Coming soon" }) },
    { icon: Mail, label: "Update Email", desc: "Change your email address", action: () => toast({ title: "Coming soon" }) },
    { icon: Share2, label: "Affiliate Dashboard", desc: "View your referral earnings", action: () => navigate("/affiliate") },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold mb-6">My Account</h1>

        {/* Avatar + Name */}
        <Card className="mb-6">
          <CardContent className="p-6 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-accent/20 text-accent text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{fullName || "User"}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Menu */}
        <div className="grid gap-3 mb-6">
          {menuItems.map((item) => (
            <Card
              key={item.label}
              className={item.action ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}
              onClick={item.action || undefined}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Profile Section */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">Personal Information</h2>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="justify-start text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
          <Button variant="outline" className="justify-start text-destructive" onClick={handleDeleteAccount}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete Account
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
