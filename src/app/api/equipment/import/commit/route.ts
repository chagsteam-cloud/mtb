import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { EquipmentStatus } from "@/generated/prisma/enums";
import { canImportData } from "@/lib/authz";
import { createEquipmentRecord } from "@/lib/inventory-service";
import type { ImportRow } from "@/lib/import-parser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUS_MAP: Record<string, EquipmentStatus> = {
  WORKING: "WORKING",
  ИСПРАВНО: "WORKING",
  MAINTENANCE: "MAINTENANCE",
  "НА ОБСЛУЖИВАНИИ": "MAINTENANCE",
  BROKEN: "BROKEN",
  НЕИСПРАВНО: "BROKEN",
  WRITTEN_OFF: "WRITTEN_OFF",
  СПИСАНО: "WRITTEN_OFF",
};

function mapStatus(raw: string): EquipmentStatus {
  const key = raw.trim().toUpperCase();
  return STATUS_MAP[key] ?? "WORKING";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canImportData(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json()) as { rows?: ImportRow[]; skipDuplicates?: boolean };
  const rows = body.rows ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "EMPTY_ROWS" }, { status: 400 });
  }

  const [categories, auditoriums, users] = await Promise.all([
    prisma.equipmentCategory.findMany(),
    prisma.auditorium.findMany(),
    prisma.user.findMany({ where: { isActive: true } }),
  ]);

  let created = 0;
  let skipped = 0;
  const errors: { rowNumber: number; message: string }[] = [];

  for (const row of rows) {
    if (!row.inventoryNumber || !row.name) {
      errors.push({ rowNumber: row.rowNumber, message: "Нет инв. номера или названия" });
      continue;
    }

    const dup = await prisma.equipment.findUnique({
      where: { inventoryNumber: row.inventoryNumber },
      select: { id: true },
    });
    if (dup) {
      if (body.skipDuplicates) {
        skipped++;
        continue;
      }
      errors.push({ rowNumber: row.rowNumber, message: "Дубликат инв. номера" });
      continue;
    }

    const category = categories.find(
      (c) => c.name.toLowerCase() === row.categoryName.trim().toLowerCase(),
    );
    const auditorium = auditoriums.find(
      (a) => a.number.toLowerCase() === row.auditoriumNumber.trim().toLowerCase(),
    );
    const responsible = users.find(
      (u) => u.login.toLowerCase() === row.responsibleLogin.trim().toLowerCase(),
    );

    if (!category || !auditorium || !responsible) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Не найдена категория, аудитория или пользователь (МОЛ)",
      });
      continue;
    }

    try {
      await createEquipmentRecord({
        actorUserId: session.user.id,
        actorRole: session.user.role,
        data: {
          inventoryNumber: row.inventoryNumber,
          name: row.name,
          status: mapStatus(row.status),
          cost: row.cost || "0",
          categoryId: category.id,
          auditoriumId: auditorium.id,
          responsiblePersonId: responsible.id,
        },
      });
      created++;
    } catch (e) {
      errors.push({
        rowNumber: row.rowNumber,
        message: e instanceof Error ? e.message : "Ошибка создания",
      });
    }
  }

  return NextResponse.json({ created, skipped, errors });
}
