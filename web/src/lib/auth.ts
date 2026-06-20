import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { AuthUser } from "@/types/auth";

interface AuthResponse {
  user: AuthUser | null;
}

interface LoginInput {
  email: string;
  password: string;
}

interface MagicLinkInput {
  email: string;
}

interface RegisterInput {
  name: string;
  email: string;
}

export async function loginUser(input: LoginInput) {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", input);
  return data.user;
}

function getMagicLinkRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

export async function requestLoginMagicLink(input: MagicLinkInput) {
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getMagicLinkRedirectUrl(),
      data: {
        intended: "login",
      },
    },
  });

  if (error) {
    throw error;
  }
}

export async function requestRegisterMagicLink(input: RegisterInput) {
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getMagicLinkRedirectUrl(),
      data: {
        intended: "register",
        name: input.name,
      },
    },
  });

  if (error) {
    throw error;
  }
}

export async function exchangeSupabaseSession(accessToken: string) {
  const { data } = await apiClient.post<AuthResponse>("/auth/exchange", {
    accessToken,
  });

  return data.user;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");
  return data.user;
}

export async function logoutUser() {
  await apiClient.post("/auth/logout");
  await supabase.auth.signOut();
}
