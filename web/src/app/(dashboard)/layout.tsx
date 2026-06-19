import { ReactNode } from "react";
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
          {children}
        </div>
      </main>
    </SocketProvider>
  );
}
