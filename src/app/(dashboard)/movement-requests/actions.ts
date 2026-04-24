"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canApproveMovementRequests } from "@/lib/authz";
import { AuthError, decideMovementRequest } from "@/lib/inventory-service";

function formString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function decideMovementRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  if (!canApproveMovementRequests(session.user.role)) {
    throw new Error("FORBIDDEN");
  }

  const requestId = formString(formData, "requestId");
  const decision = formString(formData, "decision");
  const comment = formString(formData, "comment");

  if (!requestId || (decision !== "APPROVED" && decision !== "REJECTED")) {
    throw new Error("INVALID_FORM");
  }

  try {
    await decideMovementRequest({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      requestId,
      decision,
      comment: comment || undefined,
    });
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }

  revalidatePath("/movement-requests");
  revalidatePath("/equipment");
  revalidatePath("/dashboard");
}
