import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformSettingsPanel } from "@/components/admin/PlatformSettingsPanel";

/** Standalone route; the Admin panel hosts the same panel. */
export default function PlatformSettings() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Platform Settings</h1>
        <PlatformSettingsPanel param="tab" />
      </div>
    </AppLayout>
  );
}
