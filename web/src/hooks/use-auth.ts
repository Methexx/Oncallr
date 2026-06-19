"use client";

import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getCurrentUser } from "@/lib/auth";

export function useAuth() {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  const error = query.error as AxiosError | null;
  const isUnauthorized = error?.response?.status === 401;

  return {
    ...query,
    isAuthenticated: Boolean(query.data),
    isLoading: query.isLoading,
    isUnauthorized,
    user: query.data ?? null,
  };
}
