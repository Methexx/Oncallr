"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { getHealthStatus } from "@/services/health";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function statusVariant(
  value: string
): "default" | "secondary" | "destructive" | "outline" {
  if (value === "ok" || value === "configured") {
    return "secondary";
  }

  if (value === "error" || value === "degraded") {
    return "destructive";
  }

  return "outline";
}

export function SettingsView() {
  const router = useRouter();
  const auth = useAuth();
  const healthQuery = useQuery({
    queryKey: ["system", "health"],
    queryFn: getHealthStatus,
    retry: false,
    refetchInterval: 30_000,
  });

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

      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>
            Live dependency health from the Fastify backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Overall</span>
            <Badge variant={statusVariant(healthQuery.data?.status ?? "unknown")}>
              {statusLabel(healthQuery.data?.status ?? "unknown")}
            </Badge>
          </div>

          {healthQuery.data ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(healthQuery.data.services).map(([name, value]) => (
                  <div
                    key={name}
                    className="rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <p className="text-sm font-medium capitalize">{name}</p>
                    <Badge className="mt-2" variant={statusVariant(value)}>
                      {statusLabel(value)}
                    </Badge>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Last checked {new Date(healthQuery.data.timestamp).toLocaleString()}
              </p>
            </>
          ) : healthQuery.isError ? (
            <p className="text-sm text-destructive">
              The dashboard could not reach the backend health endpoint.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Checking backend dependencies...
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
