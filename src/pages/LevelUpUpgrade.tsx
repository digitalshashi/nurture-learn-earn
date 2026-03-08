import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Trophy, Star, Award, Target, Zap } from "lucide-react";

export default function LevelUpUpgrade() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [user, roles]);

  const checkAccess = async () => {
    if (!user) { setChecking(false); return; }
    const isCoachOrAdmin = roles.includes("coach") || roles.includes("admin");
    if (isCoachOrAdmin) { setHasAccess(true); setChecking(false); return; }
    const { data } = await supabase.rpc("user_has_levelup_access", { _user_id: user.id });
    setHasAccess(!!data);
    setChecking(false);
  };

  // If has access, redirect to actual LevelUp
  useEffect(() => {
    if (!checking && hasAccess) navigate("/levelup", { replace: true });
  }, [checking, hasAccess]);

  if (checking) return null;

  const features = [
    { icon: Trophy, label: "Leaderboards", desc: "Compete with fellow learners" },
    { icon: Target, label: "Challenges", desc: "Complete daily and weekly challenges" },
    { icon: Star, label: "Rewards", desc: "Earn badges and certificates" },
    { icon: Award, label: "Certificates", desc: "Get recognized for achievements" },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold font-display mb-3">Upgrade Required</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          LevelUp is available only for Premium Programs. Upgrade to a Diamond or Elite membership to unlock the full LevelUp experience.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {features.map((f) => (
            <Card key={f.label} className="card-shadow">
              <CardContent className="pt-5 pb-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10 shrink-0">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          size="lg"
          className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
          onClick={() => navigate("/services")}
        >
          <Zap className="h-4 w-4 mr-2" /> Upgrade Now
        </Button>
      </div>
    </AppLayout>
  );
}
