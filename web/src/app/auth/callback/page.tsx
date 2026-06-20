import { Suspense } from "react";
import { AuthCallbackView } from "@/features/auth/auth-callback-view";

function AuthCallbackFallback() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">
        Preparing your secure sign-in callback...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<AuthCallbackFallback />}>
          <AuthCallbackView />
        </Suspense>
      </div>
    </main>
  );
}
