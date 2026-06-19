"use client";

import { socket } from "@/lib/socket";

export function useSocket() {
  return socket;
}
