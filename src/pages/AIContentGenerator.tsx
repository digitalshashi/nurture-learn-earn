import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Lightbulb, Video, MessageCircle, Loader2 } from "lucide-react";

export default function AIContentGenerator() {
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState("ideas");
  const [form, setForm] = useState({ niche: "", audience: "", platform: "Instagram", goal: "", language: "English" });
  const [results, setResults] = useState<any[]>([]);

  const generate = async () => {
    if (!form.niche) { toast({ title: "Enter your niche", variant: "destructive" }); return; }
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { ...form, content_type: contentType },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: data.error, variant: "destructive" }); return; }
      setResults(data?.items || []);
      if ((data?.items || []).length === 0) toast({ title: "No results generated, try different inputs" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-display">AI Content Generator</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Input Panel */}
          <Card className="card-shadow">
            <CardHeader><CardTitle className="text-sm">Generate Content</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Tabs value={contentType} onValueChange={setContentType}>
                <TabsList className="w-full">
                  <TabsTrigger value="ideas" className="flex-1"><Lightbulb className="h-3.5 w-3.5 mr-1" />Ideas</TabsTrigger>
                  <TabsTrigger value="script" className="flex-1"><Video className="h-3.5 w-3.5 mr-1" />Script</TabsTrigger>
                  <TabsTrigger value="whatsapp" className="flex-1"><MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input placeholder="Niche *" value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} />
              <Input placeholder="Target Audience" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} />
              <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Twitter">Twitter</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Goal (e.g. engagement, sales)" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
              <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Telugu">Telugu</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generate} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-1" />Generate</>}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="md:col-span-2 space-y-3">
            {results.length === 0 && !loading && (
              <Card className="card-shadow">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Enter your details and click Generate to get AI-powered content ideas</p>
                </CardContent>
              </Card>
            )}
            {loading && (
              <Card className="card-shadow">
                <CardContent className="py-16 text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">AI is generating your content...</p>
                </CardContent>
              </Card>
            )}
            {results.map((item, i) => (
              <Card key={i} className="card-shadow hover:shadow-md transition-shadow">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">#{i + 1}</Badge>
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                      </div>
                      {item.hook && <p className="text-xs text-primary font-medium">🎣 Hook: {item.hook}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      {item.platform_tip && <p className="text-xs text-muted-foreground mt-1">💡 {item.platform_tip}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(`${item.title}\n\n${item.hook || ""}\n\n${item.description}`)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
