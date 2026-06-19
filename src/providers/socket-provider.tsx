"use client";

import { ReactNode, useEffect } from "react";
import { socket } from "@/lib/socket";

interface SocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export function SocketProvider({
  children,
  autoConnect = false,
}: SocketProviderProps) {
  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [autoConnect]);

  return children;
}
