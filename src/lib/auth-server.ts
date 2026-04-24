import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowed: UserRole[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}
