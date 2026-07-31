import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, ArrowRight, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't send reset link", description: error.message, variant: "destructive" });
      return;
    }
    setResetSent(true);
    toast({ title: "Reset link sent", description: "Check your inbox for the password reset email." });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/feed");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      toast({ title: "Account created!", description: "You can now sign in." });
      setMode("login");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-primary-foreground text-2xl font-bold font-display">L</span>
          </div>
          <h1 className="text-2xl font-bold font-display">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Forgot password"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Sign in to your academy" : mode === "signup" ? "Join the academy" : "We'll email you a reset link"}
          </p>
        </div>

        <Card className="card-shadow border-border">
          <CardContent className="pt-6">
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <button type="button" onClick={() => { setResetSent(false); setMode("forgot"); }} className="text-xs text-accent font-medium hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  {loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </form>
            ) : mode === "signup" ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm">Full name</Label>
                  <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  {loading ? "Creating..." : "Sign Up"} <UserPlus className="h-4 w-4 ml-1" />
                </Button>
              </form>
            ) : resetSent ? (
              <div className="text-center space-y-4">
                <Mail className="h-8 w-8 mx-auto text-accent" />
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on its way. Check your inbox and spam folder.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setMode("login")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-sm">Email address</Label>
                  <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  {loading ? "Sending..." : "Send reset link"} <Mail className="h-4 w-4 ml-1" />
                </Button>
                <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-muted-foreground hover:underline">
                  Back to sign in
                </button>
              </form>
            )}

            {mode !== "forgot" && (
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-accent font-medium hover:underline">
                    {mode === "login" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
