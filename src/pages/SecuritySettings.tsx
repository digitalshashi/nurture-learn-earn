import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginSessionsTab } from "@/components/security/LoginSessionsTab";
import { ReportedContentTab } from "@/components/security/ReportedContentTab";
import { BlockedUsersTab } from "@/components/security/BlockedUsersTab";

export default function SecuritySettings() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Security Settings</h1>
        <Tabs defaultValue="sessions">
          <TabsList className="mb-6">
            <TabsTrigger value="sessions">Manage Login Sessions</TabsTrigger>
            <TabsTrigger value="reports">Reported Content</TabsTrigger>
            <TabsTrigger value="blocked">Blocked Users</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions"><LoginSessionsTab /></TabsContent>
          <TabsContent value="reports"><ReportedContentTab /></TabsContent>
          <TabsContent value="blocked"><BlockedUsersTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
