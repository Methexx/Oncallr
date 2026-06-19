import Link from "next/link";
import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SocketProvider } from "@/providers/socket-provider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <SocketProvider autoConnect>
      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-border bg-background px-4 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  OnCallr
                </p>
                <h1 className="text-lg font-semibold">Engineer Console</h1>
              </div>

              <nav className="flex flex-wrap gap-3 text-sm">
                <Link
                  className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href="/dashboard"
                >
                  Dashboard
                </Link>
                <Link
                  className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href="/my-incidents"
                >
                  My Incidents
                </Link>
                <Link
                  className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href="/incidents"
                >
                  Incidents
                </Link>
                <Link
                  className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href="/services"
                >
                  Services
                </Link>
              </nav>
            </div>
          </header>
          <Separator className="mb-6" />
          {children}
        </div>
      </main>
    </SocketProvider>
  );
}
