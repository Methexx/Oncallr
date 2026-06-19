import { apiClient } from "@/lib/api-client";
import { AuthUser } from "@/types/auth";

interface AuthResponse {
  user: AuthUser | null;
}

interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", input);
  return data.user;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");
  return data.user;
}

export async function logoutUser() {
  await apiClient.post("/auth/logout");
}
