import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Rendered in place of a redirect when a permission check fails. Redirecting
// instead would bounce between two gated routes forever (/ -> /feed -> / ...),
// which React kills with "Maximum update depth exceeded" — a blank white page.
export function NoAccess({ feature }: { feature?: string }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <ShieldOff className="h-12 w-12 text-muted-foreground mx-auto" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold font-display">No access</h1>
          <p className="text-muted-foreground text-sm">
            Your role doesn't have permission to view
            {feature ? ` the "${feature}" area` : " this page"}. Ask an admin to
            enable it under Settings &rarr; Roles &amp; Permissions.
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
