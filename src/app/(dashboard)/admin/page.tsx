import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  // Anything below this line is guaranteed to run for an
  // institution_admin (or super_admin). requireAdmin() redirects
  // everyone else to /dashboard?error=forbidden.
  const session = await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-1 text-sm">{session.active.institution_name}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="bg-primary/10 text-primary inline-flex h-10 w-10 items-center justify-center rounded-lg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Restricted area</CardTitle>
            <CardDescription>
              Role: <Badge>{session.role}</Badge>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Subscription management, member invitations, and audit log access will land here. The
          route is gated by{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">requireAdmin()</code> from{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">@/lib/auth</code>.
        </CardContent>
      </Card>
    </div>
  );
}
