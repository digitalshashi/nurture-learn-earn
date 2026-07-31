import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You're all set." });
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display">Set a new password</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose a strong password you'll remember</p>
        </div>
        <Card className="card-shadow border-border">
          <CardContent className="pt-6">
            {!ready ? (
              <p className="text-sm text-muted-foreground text-center">
                Open this page from the password reset link in your email.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="new-password" className="text-sm">New password</Label>
                  <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="text-sm">Confirm password</Label>
                  <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
