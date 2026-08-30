import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { checkDomainAccess } from "@/hooks/useTenantDomain";
import { clearPendingReferral, pendingReferralCode } from "@/lib/referral";

type AppRole = "super_admin" | "admin" | "coach" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  /** Set when a sign-in was refused because this is another tenant white-label domain. */
  domainError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainError, setDomainError] = useState<string | null>(null);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles(data ? data.map((r: any) => r.role as AppRole) : []);
  };

  useEffect(() => {
    let active = true;

    // `loading` must stay true until roles are in, not just until the session
    // resolves. Consumers gate permission checks on it, and a logged-in user
    // with roles still unread looks identical to one with no permissions.
    const applySession = async (session: Session | null) => {
      if (!active) return;
      if (session?.user) {
        // A live white-label domain is that academy's front door, so a session
        // belonging to someone else has no business on it. Checked here rather
        // than in the login form because OTP, magic links and token refreshes
        // all arrive through this same path.
        const allowed = await checkDomainAccess(session.user.id, window.location.hostname);
        if (!allowed) {
          setDomainError(
            `This sign-in is for ${window.location.hostname} only. Use the account you were given for this academy.`,
          );
          setSession(null);
          setUser(null);
          setRoles([]);
          if (active) setLoading(false);
          await supabase.auth.signOut();
          return;
        }
        setDomainError(null);
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchRoles(session.user.id);
      else setRoles([]);
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    // A code left over from the link this person arrived on. It rides in the
    // signup metadata because that is the only payload that reaches
    // handle_new_user(), which is what attributes the referral — the browser
    // never gets to write the referrals table itself.
    const referralCode = pendingReferralCode();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: referralCode
          ? { full_name: fullName, referral_code: referralCode }
          : { full_name: fullName },
      },
    });
    if (error) throw error;
    // Only once the account exists, so a failed attempt can be retried and
    // still carry the referral.
    if (referralCode) clearPendingReferral();
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signUp, signIn, signOut, hasRole, domainError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
