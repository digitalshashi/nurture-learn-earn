import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Key, ExternalLink } from "lucide-react";

const integrations = [
  { name: "Zapier", description: "Connect 5000+ apps to automate workflows", connected: false, icon: "⚡" },
  { name: "Pabbly", description: "Automate tasks between your favorite apps", connected: false, icon: "🔗" },
  { name: "Google Tag Manager", description: "Manage marketing tags without editing code", connected: true, icon: "📊" },
  { name: "Meta Conversions API", description: "Track conversions from Meta ads", connected: false, icon: "📱" },
];

export default function Integrations() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Platform Integrations</h1>

        <div className="space-y-4">
          {integrations.map((intg, i) => (
            <Card key={i} className="card-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{intg.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{intg.name}</h3>
                        {intg.connected && <Badge className="bg-success text-success-foreground text-[10px]">Connected</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{intg.description}</p>
                      {intg.connected ? (
                        <div className="mt-3 space-y-2">
                          <div><Label className="text-xs">API Key</Label><Input className="h-8 text-xs font-mono" value="gtm-XXXX-XXXX" readOnly /></div>
                          <Button variant="outline" size="sm">Disconnect</Button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div><Label className="text-xs">API Key / Integration ID</Label><Input className="h-8 text-xs" placeholder="Enter your API key..." /></div>
                          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Connect</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
