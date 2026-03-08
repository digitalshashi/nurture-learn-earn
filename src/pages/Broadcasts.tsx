import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageCircle, Send, Plus, RefreshCw, ChevronDown, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const overviewCards = [
  { title: "Total Broadcasts", value: "0", sub: null, icon: Send, color: "bg-muted" },
  { title: "Notifications", value: "0", sub: "Click rate (%): 0", icon: Bell, color: "bg-destructive/10" },
  { title: "Emails", value: "0", sub: "Open rate (%): 0", icon: Mail, color: "bg-info/10", badge: "200" },
  { title: "WhatsApps", value: "0", sub: "Seen rate (%): 0", icon: MessageCircle, color: "bg-success/10" },
];

const mockBroadcasts = [
  { name: "Course Launch Announcement", services: "All Services", time: "Mar 6, 2026 10:00 AM", status: "sent" },
  { name: "Weekly Newsletter #12", services: "Growth Masterclass", time: "Mar 3, 2026 9:00 AM", status: "sent" },
  { name: "Flash Sale Promo", services: "All Services", time: "Mar 10, 2026 12:00 PM", status: "scheduled" },
];

export default function Broadcasts() {
  const [search, setSearch] = useState("");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-1">Broadcasts Overview</h1>
        <p className="text-sm text-muted-foreground mb-6">Create and manage marketing broadcasts</p>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {overviewCards.map((card) => (
            <Card key={card.title} className="card-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{card.title === "Total Broadcasts" ? "" : card.title === "Total Broadcasts" ? "" : ""}</p>
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                {card.title === "Total Broadcasts" ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Broadcasts</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold" style={{ color: card.title === "Notifications" ? "hsl(var(--destructive))" : card.title === "Emails" ? "hsl(var(--info))" : "hsl(var(--success))" }}>
                        {card.title}
                      </p>
                      {card.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-info text-info">{card.badge}</Badge>
                      )}
                    </div>
                    <div className="flex gap-6 mt-1">
                      <div>
                        <p className="text-xs text-muted-foreground">{card.title === "Notifications" ? "Click rate (%)" : card.title === "Emails" ? "Open rate (%)" : "Seen rate (%)"}</p>
                        <p className="text-lg font-bold">0</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">&nbsp;</p>
                        <p className="text-lg font-bold">0</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Broadcasts Section */}
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Broadcasts</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                      Create Broadcast <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Mail className="h-4 w-4 mr-2" />Email Broadcast</DropdownMenuItem>
                    <DropdownMenuItem><Bell className="h-4 w-4 mr-2" />Push Notification</DropdownMenuItem>
                    <DropdownMenuItem><MessageCircle className="h-4 w-4 mr-2" />WhatsApp Broadcast</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DialogTrigger>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="published">
              <TabsList className="mb-4">
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="published">
                <div className="flex items-center gap-3 mb-4">
                  <Input
                    placeholder="Search by broadcast name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button variant="outline" size="icon" className="h-9 w-9"><RefreshCw className="h-4 w-4" /></Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Input type="date" className="h-9 w-[140px] text-sm" placeholder="Start date" />
                    <span className="text-muted-foreground text-xs">→</span>
                    <Input type="date" className="h-9 w-[140px] text-sm" placeholder="End date" />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Broadcast</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockBroadcasts.filter(b => b.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <p className="font-semibold text-sm">No broadcasts found</p>
                          <p className="text-xs text-muted-foreground mt-1">Sorry, we didn't find any matching results</p>
                          <p className="text-xs text-muted-foreground">Find by broadcast name or selecting a date range</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mockBroadcasts.filter(b => b.name.toLowerCase().includes(search.toLowerCase())).map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{b.name}</TableCell>
                          <TableCell className="text-sm">{b.services}</TableCell>
                          <TableCell className="text-sm">{b.time}</TableCell>
                          <TableCell>
                            <Badge className={b.status === "sent" ? "bg-success text-success-foreground" : "bg-info text-info-foreground"}>
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="templates">
                <div className="text-center py-12">
                  <p className="font-semibold text-sm">No templates yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Save a broadcast as a template to reuse it later</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
