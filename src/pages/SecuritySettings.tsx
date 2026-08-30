import { AppLayout } from "@/components/layout/AppLayout";
import { SecuritySettingsPanel } from "@/components/admin/SecuritySettingsPanel";

/** Standalone route; the Admin panel hosts the same panel. */
export default function SecuritySettings() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Security Settings</h1>
        <SecuritySettingsPanel param="tab" />
      </div>
    </AppLayout>
  );
}
