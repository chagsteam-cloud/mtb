import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { canManageAuditSessions } from "@/lib/authz";
import { AuthError } from "@/lib/inventory-service";

export async function createAuditSession(args: {
  actorUserId: string;
  actorRole: UserRole;
  auditoriumId: string;
  responsibleUserId: string;
}) {
  if (!canManageAuditSessions(args.actorRole)) {
    throw new AuthError("Недостаточно прав для запуска инвентаризации.");
  }

  const equipment = await prisma.equipment.findMany({
    where: { auditoriumId: args.auditoriumId },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const session = await tx.auditSession.create({
      data: {
        auditoriumId: args.auditoriumId,
        responsibleUserId: args.responsibleUserId,
        createdById: args.actorUserId,
      },
    });

    if (equipment.length > 0) {
      await tx.auditSessionItem.createMany({
        data: equipment.map((e) => ({
          sessionId: session.id,
          equipmentId: e.id,
        })),
      });
    }

    return session;
  });
}

export async function markAuditItemFound(args: {
  sessionId: string;
  equipmentId: string;
  actorUserId: string;
}) {
  const session = await prisma.auditSession.findUnique({
    where: { id: args.sessionId },
    include: { items: { select: { equipmentId: true } } },
  });
  if (!session) throw new AuthError("Сессия инвентаризации не найдена.");
  if (session.status !== "IN_PROGRESS") {
    throw new AuthError("Сессия уже завершена.");
  }

  const inSnapshot = session.items.some((i) => i.equipmentId === args.equipmentId);
  if (inSnapshot) {
    await prisma.auditSessionItem.updateMany({
      where: { sessionId: args.sessionId, equipmentId: args.equipmentId },
      data: { result: "FOUND", foundAt: new Date() },
    });
    return { kind: "matched" as const };
  }

  await prisma.auditSessionSurplus.upsert({
    where: {
      sessionId_equipmentId: {
        sessionId: args.sessionId,
        equipmentId: args.equipmentId,
      },
    },
    update: { scannedAt: new Date() },
    create: {
      sessionId: args.sessionId,
      equipmentId: args.equipmentId,
    },
  });
  return { kind: "surplus" as const };
}

export async function completeAuditSession(args: { sessionId: string; actorRole: UserRole }) {
  if (!canManageAuditSessions(args.actorRole)) {
    throw new AuthError("Недостаточно прав для завершения инвентаризации.");
  }

  const session = await prisma.auditSession.findUnique({
    where: { id: args.sessionId },
    include: {
      items: true,
      surplusItems: true,
    },
  });
  if (!session) throw new AuthError("Сессия не найдена.");
  if (session.status === "COMPLETED") throw new AuthError("Сессия уже завершена.");

  const matched = session.items.filter((i) => i.result === "FOUND").length;
  const shortage = session.items.filter((i) => i.result === "PENDING").length;

  await prisma.auditSessionItem.updateMany({
    where: { sessionId: args.sessionId, result: "PENDING" },
    data: { result: "MISSING" },
  });

  await prisma.auditSession.update({
    where: { id: args.sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  const surplus = session.surplusItems.length;

  return {
    matched,
    shortage,
    surplus,
    totalExpected: session.items.length,
  };
}
