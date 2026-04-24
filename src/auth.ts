import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (credentials) => {
        const loginRaw = credentials?.login;
        const passwordRaw = credentials?.password;

        const login = typeof loginRaw === "string" ? loginRaw.trim() : "";
        const password = typeof passwordRaw === "string" ? passwordRaw : "";

        if (!login || !password) return null;

        const user = await prisma.user.findUnique({ where: { login } });
        if (!user?.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: `${user.login}@local`,
          login: user.login,
          fullName: user.fullName,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.fullName = user.fullName;
        token.login = user.login;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const t = token as JWT;
      session.user.id = t.id;
      session.user.role = t.role;
      session.user.fullName = t.fullName;
      session.user.login = t.login;
      return session;
    },
  },
});
