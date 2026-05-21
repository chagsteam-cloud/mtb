"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  completeAuditSession,
  createAuditSession,
  markAuditItemFound,
} from "@/lib/audit-service";
import { AuthError } from "@/lib/inventory-service";

export async function createAuditSessionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const auditoriumId = String(formData.get("auditoriumId") ?? "");
  const responsibleUserId = String(formData.get("responsibleUserId") ?? "");
  if (!auditoriumId || !responsibleUserId) throw new Error("INVALID_FORM");

  try {
    const created = await createAuditSession({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      auditoriumId,
      responsibleUserId,
    });
    revalidatePath("/audit");
    redirect(`/audit/${created.id}/work`);
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }
}

export async function markAuditFoundAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const sessionId = String(formData.get("sessionId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "");
  if (!sessionId || !equipmentId) throw new Error("INVALID_FORM");

  try {
    await markAuditItemFound({
      sessionId,
      equipmentId,
      actorUserId: session.user.id,
    });
    revalidatePath(`/audit/${sessionId}/work`);
    revalidatePath(`/audit/${sessionId}`);
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }
}

export async function completeAuditSessionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) throw new Error("INVALID_FORM");

  try {
    await completeAuditSession({
      sessionId,
      actorRole: session.user.role,
    });
    revalidatePath("/audit");
    revalidatePath(`/audit/${sessionId}`);
    redirect(`/audit/${sessionId}`);
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }
}
