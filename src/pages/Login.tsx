import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, ArrowRight, UserPlus, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;

// supabase.functions.invoke() only gives a generic "non-2xx status code"
// message on error; the actual reason is in the response body served by the
// edge function itself, reachable via error.context (a Response object).
async function extractFunctionErrorMessage(error: any, fallback: string): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json();
      if (body?.error) return body.error;
    }
  } catch {
    // ignore parse failures, fall through to fallback
  }
  return error?.message || fallback;
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP login state
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-login-otp", {
        body: { email: otpEmail },
      });
      if (error) throw new Error(await extractFunctionErrorMessage(error, "Could not send code"));
      if (data?.error) throw new Error(data.error);
      toast({ title: "Code sent", description: `Check ${otpEmail} for your login code.` });
      setOtpStep("verify");
      setOtpCode("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      toast({ title: "Could not send code", description: err.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-login-otp", {
        body: { email: otpEmail, code: otpCode },
      });
      if (error) throw new Error(await extractFunctionErrorMessage(error, "Verification failed"));
      if (data?.error) throw new Error(data.error);

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token_hash: data.hashed_token,
        type: "magiclink",
      });
      if (verifyError) throw verifyError;

      navigate("/feed");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-login-otp", {
        body: { email: otpEmail },
      });
      if (error) throw new Error(await extractFunctionErrorMessage(error, "Could not resend code"));
      if (data?.error) throw new Error(data.error);
      toast({ title: "Code resent", description: `Check ${otpEmail} for your new code.` });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      toast({ title: "Could not resend code", description: err.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
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
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Sign in to your academy" : "Join the academy"}
          </p>
        </div>

        <Card className="card-shadow border-border">
          <CardContent className="pt-6">
            {mode === "login" ? (
              <Tabs defaultValue="password">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="otp">OTP</TabsTrigger>
                </TabsList>

                <TabsContent value="password">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-sm">Email address</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-sm">Password</Label>
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                      {loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="otp">
                  {otpStep === "request" ? (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div>
                        <Label htmlFor="otp-email" className="text-sm">Email address</Label>
                        <Input id="otp-email" type="email" placeholder="you@example.com" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} className="mt-1" required />
                        <p className="text-xs text-muted-foreground mt-1.5">We'll email you a 6-digit code to sign in.</p>
                      </div>
                      <Button type="submit" disabled={otpLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                        {otpLoading ? "Sending..." : "Send Code"} <Mail className="h-4 w-4 ml-1" />
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div>
                        <Label className="text-sm">Enter the 6-digit code</Label>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">Sent to {otpEmail}</p>
                        <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button type="submit" disabled={otpLoading || otpCode.length !== 6} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                        {otpLoading ? "Verifying..." : "Verify & Sign In"} <KeyRound className="h-4 w-4 ml-1" />
                      </Button>
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => { setOtpStep("request"); setOtpCode(""); }}
                          className="text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Change email
                        </button>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || otpLoading}
                          onClick={handleResend}
                          className="text-accent font-medium hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                        </button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
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
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-accent font-medium hover:underline">
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
