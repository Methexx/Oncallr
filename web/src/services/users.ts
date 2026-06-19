import { apiClient } from "@/lib/api-client";
import { AuthUser } from "@/types/auth";

interface UsersResponse {
  users: AuthUser[];
}

export async function getUsers() {
  const { data } = await apiClient.get<UsersResponse>("/users");
  return data.users;
}
