"use server";

import { revalidatePath } from "next/cache";

import type { EquipmentStatus } from "@/generated/prisma/enums";
import { auth } from "@/auth";
import {
  AuthError,
  changeEquipmentStatus,
  createEquipmentRecord,
  createMovementRequest,
  deleteEquipmentRecord,
  getAssignedAuditoriumIds,
  updateEquipmentRecord,
} from "@/lib/inventory-service";

function formString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function setEquipmentStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const equipmentId = formString(formData, "equipmentId");
  const nextStatus = formString(formData, "nextStatus") as EquipmentStatus;
  const comment = formString(formData, "comment");

  if (!equipmentId || !nextStatus) throw new Error("INVALID_FORM");

  const assigned = await getAssignedAuditoriumIds(session.user.id);

  try {
    await changeEquipmentStatus({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      assignedAuditoriumIds: assigned,
      equipmentId,
      nextStatus,
      comment: comment || undefined,
    });
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }

  revalidatePath("/equipment");
  revalidatePath("/dashboard");
}

export async function createMovementRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const equipmentId = formString(formData, "equipmentId");
  const toAuditoriumId = formString(formData, "toAuditoriumId");
  const comment = formString(formData, "comment");

  if (!equipmentId || !toAuditoriumId) throw new Error("INVALID_FORM");

  const assigned = await getAssignedAuditoriumIds(session.user.id);

  try {
    await createMovementRequest({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      assignedAuditoriumIds: assigned,
      equipmentId,
      toAuditoriumId,
      comment: comment || undefined,
    });
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }

  revalidatePath("/equipment");
  revalidatePath("/movement-requests");
}

export async function createEquipmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const inventoryNumber = formString(formData, "inventoryNumber");
  const name = formString(formData, "name");
  const status = formString(formData, "status") as EquipmentStatus;
  const cost = formString(formData, "cost");
  const categoryId = formString(formData, "categoryId");
  const auditoriumId = formString(formData, "auditoriumId");
  const responsiblePersonId = formString(formData, "responsiblePersonId");

  if (!inventoryNumber || !name || !status || !cost || !categoryId || !auditoriumId || !responsiblePersonId) {
    throw new Error("INVALID_FORM");
  }

  try {
    await createEquipmentRecord({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      data: {
        inventoryNumber,
        name,
        status,
        cost,
        categoryId,
        auditoriumId,
        responsiblePersonId,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }

  revalidatePath("/equipment");
  revalidatePath("/dashboard");
}

export async function updateEquipmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const equipmentId = formString(formData, "equipmentId");
  if (!equipmentId) throw new Error("INVALID_FORM");

  const inventoryNumber = formString(formData, "inventoryNumber");
  const name = formString(formData, "name");
  const status = formString(formData, "status") as EquipmentStatus;
  const cost = formString(formData, "cost");
  const categoryId = formString(formData, "categoryId");
  const auditoriumId = formString(formData, "auditoriumId");
  const responsiblePersonId = formString(formData, "responsiblePersonId");

  try {
    await updateEquipmentRecord({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      equipmentId,
      data: {
        inventoryNumber: inventoryNumber || undefined,
        name: name || undefined,
        status: status || undefined,
        cost: cost || undefined,
        categoryId: categoryId || undefined,
        auditoriumId: auditoriumId || undefined,
        responsiblePersonId: responsiblePersonId || undefined,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/dashboard");
}

export async function deleteEquipmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const equipmentId = formString(formData, "equipmentId");
  if (!equipmentId) throw new Error("INVALID_FORM");

  try {
    await deleteEquipmentRecord({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      equipmentId,
    });
  } catch (e) {
    if (e instanceof AuthError) throw new Error(e.message);
    throw e;
  }

  revalidatePath("/equipment");
  revalidatePath("/dashboard");
}
