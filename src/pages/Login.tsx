import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, ArrowRight, UserPlus, KeyRound, ShieldAlert, Gift, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/lib/brand";
import { useTabParam } from "@/hooks/useTabParam";
import { pendingReferralCode } from "@/lib/referral";
import { AuthShowcase, AuthShowcaseCompact } from "@/components/auth/AuthShowcase";
import { OtpField } from "@/components/auth/OtpField";
import { AuthField, AuthPasswordField } from "@/components/auth/AuthField";

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
  // Section lives in the URL so links, refreshes and analytics all point
  // at the section actually being viewed.
  const [activeTab, setActiveTab] = useTabParam(["password", "otp"] as const);
  const navigate = useNavigate();
  const { signIn, signUp, domainError } = useAuth();
  const { toast } = useToast();
  // An invite link points straight at the signup form: someone arriving from
  // a friend's referral has no account to sign in to, and landing on the login
  // form is how that click gets lost.
  const [mode, setMode] = useState<"login" | "signup">(() =>
    new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login",
  );
  const invitedBy = pendingReferralCode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // OTP login state
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpInvalid, setOtpInvalid] = useState(false);

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
      // "/" (HomeRedirect) picks a landing this user actually has permission
      // for; hardcoding /feed strands anyone without community_feed.
      navigate("/");
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

  /**
   * Sends the Supabase recovery email. `/reset-password` renders the page that
   * link lands on — until now it had no route and no entry point, so anyone who
   * forgot their password had no way back in except an OTP login.
   */
  const handleForgotPassword = async () => {
    const target = email.trim();
    if (!target) {
      toast({
        title: "Enter your email first",
        description: "We'll send the reset link there.",
        variant: "destructive",
      });
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      // Deliberately the same message whether or not the address has an
      // account: a differing response turns this form into a way to find out
      // who is registered.
      toast({
        title: "Check your inbox",
        description: `If ${target} has an account, a reset link is on its way.`,
      });
    } catch (err: any) {
      toast({ title: "Could not send reset link", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  /**
   * Verifies the code. Called by the field itself on the sixth digit rather
   * than by a button, so `e` is optional — a paste completes the code without
   * a form submit ever happening.
   */
  const handleVerifyOtp = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (otpCode.length !== 6 || otpLoading) return;

      setOtpLoading(true);
      setOtpInvalid(false);
      try {
        const { data, error } = await supabase.functions.invoke("verify-login-otp", {
          body: { email: otpEmail, code: otpCode },
        });
        if (error) throw new Error(await extractFunctionErrorMessage(error, "Verification failed"));
        if (data?.error) throw new Error(data.error);

        // Only token_hash + type may be sent when verifying a hashed token.
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: "email",
        });
        if (verifyError) throw verifyError;

        navigate("/");
      } catch (err: any) {
        // The field shakes and empties itself: a rejected code is always
        // retyped, and clearing it is one less thing to do by hand.
        setOtpInvalid(true);
        setTimeout(() => {
          setOtpCode("");
          setOtpInvalid(false);
        }, 600);
        toast({ title: "That code did not work", description: err.message, variant: "destructive" });
      } finally {
        setOtpLoading(false);
      }
    },
    [otpCode, otpEmail, otpLoading, navigate, toast],
  );

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
    // Two columns from lg: the product on the left, the form on the right.
    // Below that the panel drops away entirely and the form is the page.
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_minmax(29rem,0.9fr)]">
      <AuthShowcase />

      <div className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        {/* The panel is gone below lg, so the same washes are carried here at
            phone scale. Without them the page opens on flat grey, which is
            not what the product looks like anywhere else.

            Deliberately not -z-10: the grid above paints the page background
            and establishes no stacking context, so a negative layer would sit
            behind it and never be seen. Ordinary flow order does the job —
            this comes first, the card comes after and paints on top. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-accent/30 blur-[70px]" />
          <div className="absolute -right-28 top-1/4 h-72 w-72 rounded-full bg-info/25 blur-[70px]" />
          <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-success/22 blur-[70px]" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <BrandMark size={64} className="mb-4 justify-center" />
          <h1 className="text-2xl font-bold font-display">
            {mode === "login" ? "Welcome back" : `Create your ${BRAND.name} account`}
          </h1>
          {/* Learners and coaches sign in here, and the page has no way to
              tell which until they are through it. "Sign in to your academy"
              named only one of them. */}
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login"
              ? "Sign in to keep learning, or to run your business"
              : "One account for learning and for coaching"}
          </p>
          {/* Confirms the invite survived the trip from the link, so someone
              who was promised a referral can see it is still attached. */}
          {invitedBy && mode === "signup" && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Gift className="h-3.5 w-3.5" /> Invited with code {invitedBy}
            </p>
          )}
        </div>

        <AuthShowcaseCompact />

        <Card className="card-shadow rounded-2xl border-border">
          <CardContent className="p-6">
            {/* A refusal here is a wrong-door problem, not a wrong-password
                one, so it is stated plainly rather than as a failed login. */}
            {domainError && (
              <div className="mb-4 flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{domainError}</p>
              </div>
            )}
            {mode === "login" ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* A segmented control rather than the default grey bar: the active
                      half is the raised one, which is how a two-way switch reads. */}
                  <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-secondary/70 p-1">
                    <TabsTrigger
                      value="password"
                      className="rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-accent"
                    >
                      Password
                    </TabsTrigger>
                    <TabsTrigger
                      value="otp"
                      className="rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-accent"
                    >
                      Email code
                    </TabsTrigger>
                  </TabsList>

                <TabsContent value="password">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <AuthField
                      id="email"
                      type="email"
                      label="Email address"
                      icon={Mail}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                    <AuthPasswordField
                      id="password"
                      label="Password"
                      icon={Lock}
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      action={
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={resetting}
                          className="text-xs font-medium text-accent hover:underline disabled:text-muted-foreground disabled:no-underline"
                        >
                          {resetting ? "Sending..." : "Forgot password?"}
                        </button>
                      }
                    />
                    <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
                      {loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="otp">
                  {otpStep === "request" ? (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div>
                        <AuthField
                          id="otp-email"
                          type="email"
                          label="Email address"
                          icon={Mail}
                          placeholder="you@example.com"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          We&apos;ll email you a six-digit code. No password needed.
                        </p>
                      </div>
                      <Button type="submit" disabled={otpLoading} className="h-11 w-full rounded-xl bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
                        {otpLoading ? "Sending..." : "Email me a code"} <Mail className="h-4 w-4 ml-1" />
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      {/* Where the code went, with the way back on the same
                          line — a wrong address is the usual reason a code
                          never arrives. */}
                      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 p-3">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">Code sent to</p>
                          <p className="truncate text-sm font-medium">{otpEmail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOtpStep("request"); setOtpCode(""); setOtpInvalid(false); }}
                          className="shrink-0 text-xs font-medium text-accent hover:underline"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <Label className="text-sm">Enter the code</Label>
                        <div className="mt-2">
                          <OtpField
                            value={otpCode}
                            onChange={setOtpCode}
                            onComplete={handleVerifyOtp}
                            disabled={otpLoading}
                            invalid={otpInvalid}
                          />
                        </div>
                        {/* The field submits itself, so this replaces the
                            button rather than sitting next to a dead one. */}
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {otpLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Checking your code…
                            </>
                          ) : (
                            <>
                              <KeyRound className="h-3 w-3" /> Signs you in as soon as the last digit
                              lands.
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                        <span className="text-muted-foreground">Didn&apos;t get it?</span>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || otpLoading}
                          onClick={handleResend}
                          className="font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Send a new code"}
                        </button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <AuthField
                  id="fullName"
                  label="Full name"
                  icon={User}
                  placeholder="Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <AuthField
                  id="email"
                  type="email"
                  label="Email address"
                  icon={Mail}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <AuthPasswordField
                  id="password"
                  label="Password"
                  icon={Lock}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
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
    </div>
  );
}
