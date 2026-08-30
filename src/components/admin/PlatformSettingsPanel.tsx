import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingTab } from "@/components/settings/BrandingTab";
import { HelpSupportTab } from "@/components/settings/HelpSupportTab";
import { DomainTab } from "@/components/settings/DomainTab";
import { useTabParam } from "@/hooks/useTabParam";

/**
 * Branding, help links and custom domain.
 *
 * A panel rather than a page so the Admin panel can host it: these are
 * platform-wide settings an admin owns, and they were previously reachable
 * only from Settings. /settings/platform still renders it unchanged.
 */
export function PlatformSettingsPanel({ param = "section" }: { param?: string }) {
  // A distinct param so this can sit inside another tabbed screen without the
  // two tab strips fighting over the same slot in the URL.
  const [activeTab, setActiveTab] = useTabParam(
    ["branding", "support", "domain"] as const,
    { param },
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="branding">Branding & Customisation</TabsTrigger>
        <TabsTrigger value="support">Help & Support</TabsTrigger>
        <TabsTrigger value="domain">Domain</TabsTrigger>
      </TabsList>

      <TabsContent value="branding"><BrandingTab /></TabsContent>
      <TabsContent value="support"><HelpSupportTab /></TabsContent>
      <TabsContent value="domain"><DomainTab /></TabsContent>
    </Tabs>
  );
}
