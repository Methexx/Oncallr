import { UserRole } from "@prisma/client";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
