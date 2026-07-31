import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Wand2, Sparkles } from "lucide-react";

const TYPES = [
  { key: "ads", label: "Ad Script", placeholder: "Paste your offer, audience, and any proof points..." },
  { key: "webinar", label: "Webinar Scorer", placeholder: "Paste your webinar transcript or outline..." },
  { key: "showcase", label: "Client Showcase", placeholder: "Paste the client's situation, results, and any quotes..." },
];

export default function GrowthBoosters() {
  const { user } = useAuth();
  const [type, setType] = useState("ads");
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadSessions(); }, [user]);

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await supabase.from("booster_sessions" as any).select("*")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
    setSessions((data as any[]) || []);
    setLoading(false);
  };

  const generate = async () => {
    if (!input.trim()) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("growth-booster", {
      body: { type, input_text: input },
    });
    setGenerating(false);
    if (error || data?.error) {
      toast({ title: "Error", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    const { error: saveError } = await supabase.from("booster_sessions" as any).insert({
      user_id: user!.id,
      type,
      input_text: input,
      ai_output: data,
      score: data?.score ?? null,
    });
    if (saveError) toast({ title: "Saved output but failed to log session", description: saveError.message, variant: "destructive" });
    toast({ title: "Generated" });
    setInput("");
    loadSessions();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold font-display">Boosters</h1>
        </div>

        <Tabs value={type} onValueChange={setType}>
          <TabsList>
            {TYPES.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
          {TYPES.map(t => (
            <TabsContent key={t.key} value={t.key}>
              <Card className="card-shadow mt-4">
                <CardContent className="pt-4 space-y-3">
                  <Textarea rows={6} placeholder={t.placeholder} value={input} onChange={e => setInput(e.target.value)} />
                  <Button onClick={generate} disabled={generating || !input.trim()}>
                    <Sparkles className="h-4 w-4 mr-1" /> {generating ? "Generating..." : "Generate"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No sessions yet.</p>
            ) : sessions.map(s => (
              <div key={s.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{s.type}</Badge>
                  {s.score != null && <span className="text-xs font-medium">Score: {s.score}</span>}
                </div>
                <p className="text-sm whitespace-pre-wrap">{s.ai_output?.output || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
