import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginSessionsTab } from "@/components/security/LoginSessionsTab";
import { ReportedContentTab } from "@/components/security/ReportedContentTab";
import { BlockedUsersTab } from "@/components/security/BlockedUsersTab";
import { useTabParam } from "@/hooks/useTabParam";

/**
 * Sessions, reported content and blocked users.
 *
 * A panel rather than a page so the Admin panel can host it: moderation is
 * admin work, and it sat behind Settings. /settings/security still renders it
 * unchanged.
 */
export function SecuritySettingsPanel({ param = "section" }: { param?: string }) {
  // A distinct param so this can sit inside another tabbed screen without the
  // two tab strips fighting over the same slot in the URL.
  const [activeTab, setActiveTab] = useTabParam(
    ["sessions", "reports", "blocked"] as const,
    { param },
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="sessions">Manage Login Sessions</TabsTrigger>
        <TabsTrigger value="reports">Reported Content</TabsTrigger>
        <TabsTrigger value="blocked">Blocked Users</TabsTrigger>
      </TabsList>

      <TabsContent value="sessions"><LoginSessionsTab /></TabsContent>
      <TabsContent value="reports"><ReportedContentTab /></TabsContent>
      <TabsContent value="blocked"><BlockedUsersTab /></TabsContent>
    </Tabs>
  );
}
