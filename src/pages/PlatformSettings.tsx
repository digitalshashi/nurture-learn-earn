import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { BrandingTab } from "@/components/settings/BrandingTab";
import { CustomiseMenuTab } from "@/components/settings/CustomiseMenuTab";
import { HelpSupportTab } from "@/components/settings/HelpSupportTab";
import { DomainTab } from "@/components/settings/DomainTab";

export default function PlatformSettings() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Platform Settings</h1>
        <Tabs defaultValue="branding">
          <TabsList className="mb-6">
            <TabsTrigger value="branding">Branding & Customisation</TabsTrigger>
            <TabsTrigger value="menu">Customise Menu</TabsTrigger>
            <TabsTrigger value="support">Help & Support</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
          </TabsList>

          <TabsContent value="branding"><BrandingTab /></TabsContent>
          <TabsContent value="menu"><CustomiseMenuTab /></TabsContent>
          <TabsContent value="support"><HelpSupportTab /></TabsContent>
          <TabsContent value="domain"><DomainTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
