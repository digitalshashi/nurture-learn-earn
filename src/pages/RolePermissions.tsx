import { AppLayout } from "@/components/layout/AppLayout";
import { RolePermissionsPanel } from "@/components/admin/RolePermissionsPanel";

/** Standalone route for the matrix; the Admin panel hosts the same panel. */
export default function RolePermissions() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <RolePermissionsPanel />
      </div>
    </AppLayout>
  );
}
