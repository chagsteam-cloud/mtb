import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      fullName: string;
      login: string;
    };
  }

  interface User {
    id: string;
    role: UserRole;
    fullName: string;
    login: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    fullName: string;
    login: string;
  }
}
