"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exchangeSupabaseSession } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";

export function AuthCallbackView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isActive = true;

    async function completeSignIn() {
      try {
        assertSupabaseEnv();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Supabase environment variables are missing."
        );
        router.replace("/login");
        return;
      }

      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");

      if (errorDescription) {
        toast.error(errorDescription);
        router.replace("/login");
        return;
      }

      if (!code) {
        toast.error("Missing Supabase auth code.");
        router.replace("/login");
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session?.access_token) {
          throw error ?? new Error("Supabase session exchange failed.");
        }

        const user = await exchangeSupabaseSession(data.session.access_token);

        await queryClient.invalidateQueries({
          queryKey: ["auth", "me"],
        });

        if (!isActive) {
          return;
        }

        toast.success(`Signed in as ${user?.name ?? "your account"}.`);
        router.replace("/dashboard");
      } catch (error) {
        await supabase.auth.signOut();

        if (!isActive) {
          return;
        }

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to finish sign-in with Supabase."
        );
        router.replace("/login");
      }
    }

    void completeSignIn();

    return () => {
      isActive = false;
    };
  }, [router, searchParams]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finishing sign-in</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          We are verifying your magic link and creating your dashboard session.
        </p>
      </CardContent>
    </Card>
  );
}
