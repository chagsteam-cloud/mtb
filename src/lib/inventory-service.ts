import type {
  EquipmentStatus,
  MovementRequestStatus,
  OperationType,
  UserRole,
} from "@/generated/prisma/enums";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { canSeeAllEquipment } from "@/lib/authz";

type Db = PrismaClient | Prisma.TransactionClient;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getAssignedAuditoriumIds(userId: string) {
  const rows = await prisma.userAuditoriumAssignment.findMany({
    where: { userId },
    select: { auditoriumId: true },
  });
  return rows.map((r) => r.auditoriumId);
}

export function equipmentVisibilityFilter(args: {
  role: UserRole;
  userId: string;
  assignedAuditoriumIds: string[];
}): Prisma.EquipmentWhereInput {
  if (canSeeAllEquipment(args.role)) return {};

  if (args.assignedAuditoriumIds.length === 0) {
    // No assignments => no inventory visibility (admin should assign auditoriums)
    return { id: { in: [] } };
  }

  return { auditoriumId: { in: args.assignedAuditoriumIds } };
}

async function assertEquipmentVisible(db: Db, args: {
  equipmentId: string;
  role: UserRole;
  userId: string;
  assignedAuditoriumIds: string[];
}) {
  const equipment = await db.equipment.findUnique({
    where: { id: args.equipmentId },
    select: { id: true, auditoriumId: true },
  });
  if (!equipment) throw new AuthError("Оборудование не найдено.");

  if (canSeeAllEquipment(args.role)) return equipment;

  if (!args.assignedAuditoriumIds.includes(equipment.auditoriumId)) {
    throw new AuthError("Недостаточно прав для операции с этим объектом.");
  }

  return equipment;
}

export async function changeEquipmentStatus(args: {
  actorUserId: string;
  actorRole: UserRole;
  assignedAuditoriumIds: string[];
  equipmentId: string;
  nextStatus: EquipmentStatus;
  comment?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const equipment = await assertEquipmentVisible(tx, {
      equipmentId: args.equipmentId,
      role: args.actorRole,
      userId: args.actorUserId,
      assignedAuditoriumIds: args.assignedAuditoriumIds,
    });

    const current = await tx.equipment.findUnique({
      where: { id: equipment.id },
      select: { status: true },
    });
    if (!current) throw new AuthError("Оборудование не найдено.");

    await tx.equipment.update({
      where: { id: equipment.id },
      data: { status: args.nextStatus },
    });

    await tx.operationLog.create({
      data: {
        operationType: "STATUS_CHANGED" satisfies OperationType as OperationType,
        equipmentId: equipment.id,
        authorId: args.actorUserId,
        previousStatus: current.status,
        newStatus: args.nextStatus,
        comment: args.comment,
      },
    });
  });
}

export async function createMovementRequest(args: {
  actorUserId: string;
  actorRole: UserRole;
  assignedAuditoriumIds: string[];
  equipmentId: string;
  toAuditoriumId: string;
  comment?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const equipment = await assertEquipmentVisible(tx, {
      equipmentId: args.equipmentId,
      role: args.actorRole,
      userId: args.actorUserId,
      assignedAuditoriumIds: args.assignedAuditoriumIds,
    });

    const toAuditorium = await tx.auditorium.findUnique({
      where: { id: args.toAuditoriumId },
      select: { id: true },
    });
    if (!toAuditorium) throw new AuthError("Целевая аудитория не найдена.");

    if (equipment.auditoriumId === args.toAuditoriumId) {
      throw new AuthError("Оборудование уже находится в выбранной аудитории.");
    }

    const pending = await tx.movementRequest.findFirst({
      where: { equipmentId: equipment.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      throw new AuthError("Уже есть активный запрос на перемещение по этому объекту.");
    }

    const request = await tx.movementRequest.create({
      data: {
        equipmentId: equipment.id,
        requestedById: args.actorUserId,
        fromAuditoriumId: equipment.auditoriumId,
        toAuditoriumId: args.toAuditoriumId,
        status: "PENDING" satisfies MovementRequestStatus as MovementRequestStatus,
        comment: args.comment,
      },
    });

    await tx.operationLog.create({
      data: {
        operationType: "MOVEMENT_REQUESTED" satisfies OperationType as OperationType,
        equipmentId: equipment.id,
        authorId: args.actorUserId,
        fromAuditoriumId: equipment.auditoriumId,
        toAuditoriumId: args.toAuditoriumId,
        comment: args.comment ?? `Запрос на перемещение: ${request.id}`,
      },
    });
  });
}

export async function decideMovementRequest(args: {
  actorUserId: string;
  actorRole: UserRole;
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const request = await tx.movementRequest.findUnique({
      where: { id: args.requestId },
      include: { equipment: true },
    });
    if (!request) throw new AuthError("Запрос не найден.");
    if (request.status !== "PENDING") throw new AuthError("Запрос уже обработан.");

    if (args.decision === "REJECTED") {
      await tx.movementRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          decisionComment: args.comment,
          decidedById: args.actorUserId,
          decidedAt: new Date(),
        },
      });

      await tx.operationLog.create({
        data: {
          operationType: "MOVEMENT_REJECTED" satisfies OperationType as OperationType,
          equipmentId: request.equipmentId,
          authorId: args.actorUserId,
          fromAuditoriumId: request.fromAuditoriumId,
          toAuditoriumId: request.toAuditoriumId,
          comment: args.comment ?? "Отклонено",
        },
      });
      return;
    }

    // APPROVED
    const equipment = await tx.equipment.findUnique({
      where: { id: request.equipmentId },
      select: { id: true, auditoriumId: true, status: true },
    });
    if (!equipment) throw new AuthError("Оборудование не найдено.");

    if (equipment.auditoriumId !== request.fromAuditoriumId) {
      throw new AuthError(
        "Состояние инвентаря изменилось с момента запроса. Отмените запрос и создайте новый.",
      );
    }

    await tx.equipment.update({
      where: { id: equipment.id },
      data: { auditoriumId: request.toAuditoriumId },
    });

    await tx.movementRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        decisionComment: args.comment,
        decidedById: args.actorUserId,
        decidedAt: new Date(),
      },
    });

    await tx.operationLog.create({
      data: {
        operationType: "MOVEMENT_APPROVED" satisfies OperationType as OperationType,
        equipmentId: equipment.id,
        authorId: args.actorUserId,
        fromAuditoriumId: request.fromAuditoriumId,
        toAuditoriumId: request.toAuditoriumId,
        comment: args.comment ?? "Перемещение подтверждено",
      },
    });

    await tx.operationLog.create({
      data: {
        operationType: "MOVED" satisfies OperationType as OperationType,
        equipmentId: equipment.id,
        authorId: args.actorUserId,
        fromAuditoriumId: request.fromAuditoriumId,
        toAuditoriumId: request.toAuditoriumId,
        previousStatus: equipment.status,
        newStatus: equipment.status,
      },
    });
  });
}

export async function createEquipmentRecord(args: {
  actorUserId: string;
  actorRole: UserRole;
  data: {
    inventoryNumber: string;
    name: string;
    status: EquipmentStatus;
    cost: string;
    categoryId: string;
    auditoriumId: string;
    responsiblePersonId: string;
  };
}) {
  if (args.actorRole !== "SYSTEM_ADMIN" && args.actorRole !== "ACCOUNTING") {
    throw new AuthError("Недостаточно прав для создания инвентарных записей.");
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.equipment.create({
      data: {
        inventoryNumber: args.data.inventoryNumber,
        name: args.data.name,
        status: args.data.status,
        cost: args.data.cost,
        categoryId: args.data.categoryId,
        auditoriumId: args.data.auditoriumId,
        responsiblePersonId: args.data.responsiblePersonId,
      },
    });

    await tx.operationLog.create({
      data: {
        operationType: "CREATED" satisfies OperationType as OperationType,
        equipmentId: created.id,
        authorId: args.actorUserId,
        newStatus: created.status,
        comment: `Создан объект: ${created.inventoryNumber}`,
      },
    });
  });
}

export async function updateEquipmentRecord(args: {
  actorUserId: string;
  actorRole: UserRole;
  equipmentId: string;
  data: Partial<{
    inventoryNumber: string;
    name: string;
    status: EquipmentStatus;
    cost: string;
    categoryId: string;
    auditoriumId: string;
    responsiblePersonId: string;
  }>;
}) {
  if (args.actorRole !== "SYSTEM_ADMIN" && args.actorRole !== "ACCOUNTING") {
    throw new AuthError("Недостаточно прав для редактирования инвентарных записей.");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.equipment.findUnique({ where: { id: args.equipmentId } });
    if (!before) throw new AuthError("Оборудование не найдено.");

    const updated = await tx.equipment.update({
      where: { id: args.equipmentId },
      data: args.data,
    });

    await tx.operationLog.create({
      data: {
        operationType: "UPDATED" satisfies OperationType as OperationType,
        equipmentId: updated.id,
        authorId: args.actorUserId,
        previousStatus: before.status,
        newStatus: updated.status,
        comment: "Обновление карточки оборудования",
      },
    });
  });
}

export async function deleteEquipmentRecord(args: {
  actorUserId: string;
  actorRole: UserRole;
  equipmentId: string;
}) {
  if (args.actorRole !== "SYSTEM_ADMIN" && args.actorRole !== "ACCOUNTING") {
    throw new AuthError("Недостаточно прав для удаления инвентарных записей.");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.equipment.findUnique({ where: { id: args.equipmentId } });
    if (!before) throw new AuthError("Оборудование не найдено.");

    await tx.equipment.delete({ where: { id: args.equipmentId } });

    await tx.operationLog.create({
      data: {
        operationType: "DELETED" satisfies OperationType as OperationType,
        equipmentId: args.equipmentId,
        authorId: args.actorUserId,
        previousStatus: before.status,
        comment: `Удалено: ${before.inventoryNumber}`,
      },
    });
  });
}
