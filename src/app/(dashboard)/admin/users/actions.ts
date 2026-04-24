"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function formString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function assertAdmin(role: UserRole) {
  if (role !== "SYSTEM_ADMIN") throw new Error("FORBIDDEN");
}

export async function createUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  assertAdmin(session.user.role);

  const login = formString(formData, "login");
  const password = formString(formData, "password");
  const fullName = formString(formData, "fullName");
  const role = formString(formData, "role") as UserRole;
  const isActive = formString(formData, "isActive") !== "false";

  if (!login || !password || !fullName || !role) throw new Error("INVALID_FORM");

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { login, passwordHash, fullName, role, isActive },
  });

  revalidatePath("/admin/users");
}

export async function updateUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  assertAdmin(session.user.role);

  const userId = formString(formData, "userId");
  if (!userId) throw new Error("INVALID_FORM");

  const fullName = formString(formData, "fullName");
  const role = formString(formData, "role") as UserRole;
  const isActive = formString(formData, "isActive") === "true";
  const password = formString(formData, "password");

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: fullName || undefined,
      role: role || undefined,
      isActive,
      ...(password
        ? { passwordHash: await bcrypt.hash(password, 12) }
        : {}),
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  assertAdmin(session.user.role);

  const userId = formString(formData, "userId");
  if (!userId) throw new Error("INVALID_FORM");
  if (userId === session.user.id) throw new Error("SELF_DELETE");

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
}

export async function setUserAuditoriumsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  assertAdmin(session.user.role);

  const userId = formString(formData, "userId");
  const auditoriumNumbersRaw = formString(formData, "auditoriumNumbers"); // comma-separated

  if (!userId) throw new Error("INVALID_FORM");

  const auditoriumNumbers = auditoriumNumbersRaw
    ? auditoriumNumbersRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.userAuditoriumAssignment.deleteMany({ where: { userId } });
    if (auditoriumNumbers.length === 0) return;

    const auditoriums = await tx.auditorium.findMany({
      where: { number: { in: auditoriumNumbers } },
      select: { id: true, number: true },
    });

    if (auditoriums.length !== auditoriumNumbers.length) {
      const found = new Set(auditoriums.map((a) => a.number));
      const missing = auditoriumNumbers.filter((n) => !found.has(n));
      throw new Error(`UNKNOWN_AUDITORIUM:${missing.join(",")}`);
    }

    for (const a of auditoriums) {
      await tx.userAuditoriumAssignment.create({ data: { userId, auditoriumId: a.id } });
    }
  });

  revalidatePath("/admin/users");
}
