import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SocketProvider } from "@/providers/socket-provider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <SocketProvider autoConnect>
      <main className="min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <DashboardHeader />
          <Separator className="mb-6" />
          {children}
        </div>
      </main>
    </SocketProvider>
  );
}
