"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { logoutUser } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";

export function SettingsView() {
  const router = useRouter();
  const auth = useAuth();

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["auth", "me"],
      });
      toast.success("Signed out.");
      router.push("/login");
    },
    onError: () => {
      toast.error("Unable to sign out right now.");
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Environment details and account controls for this dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your current authenticated session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{auth.user?.role ?? "Unknown role"}</Badge>
          </div>
          <div className="text-sm">
            <p className="font-medium">{auth.user?.name ?? "Unknown user"}</p>
            <p className="text-muted-foreground">{auth.user?.email ?? "Unknown email"}</p>
          </div>
          <Button
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
            type="button"
            variant="outline"
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frontend configuration</CardTitle>
          <CardDescription>
            Useful client-side environment values for this local setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">API URL</p>
            <p className="text-muted-foreground">
              {process.env.NEXT_PUBLIC_API_URL ?? "Not configured"}
            </p>
          </div>
          <div>
            <p className="font-medium">Socket URL</p>
            <p className="text-muted-foreground">
              {process.env.NEXT_PUBLIC_SOCKET_URL ?? "Not configured"}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
