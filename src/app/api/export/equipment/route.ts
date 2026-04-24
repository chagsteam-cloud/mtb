import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { canExportInventory } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { equipmentStatusLabel, userRoleShortLabel } from "@/lib/ru-labels";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canExportInventory(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const rows = await prisma.equipment.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: true,
      auditorium: true,
      responsiblePerson: { select: { fullName: true, login: true, role: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Учёт МТБ";
  const sheet = workbook.addWorksheet("Инвентарь");

  sheet.columns = [
    { header: "Инв. №", key: "inventoryNumber", width: 16 },
    { header: "Название", key: "name", width: 36 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Стоимость", key: "cost", width: 14 },
    { header: "Категория", key: "category", width: 26 },
    { header: "Аудитория", key: "auditorium", width: 12 },
    { header: "Корпус", key: "building", width: 14 },
    { header: "МОЛ", key: "mol", width: 28 },
    { header: "Логин МОЛ", key: "molLogin", width: 16 },
    { header: "Роль МОЛ", key: "molRole", width: 16 },
    { header: "Обновлено", key: "updatedAt", width: 20 },
  ];

  for (const r of rows) {
    sheet.addRow({
      inventoryNumber: r.inventoryNumber,
      name: r.name,
      status: equipmentStatusLabel(r.status),
      cost: Number(r.cost),
      category: r.category.name,
      auditorium: r.auditorium.number,
      building: r.auditorium.building ?? "",
      mol: r.responsiblePerson.fullName,
      molLogin: r.responsiblePerson.login,
      molRole: userRoleShortLabel(r.responsiblePerson.role),
      updatedAt: r.updatedAt.toLocaleString("ru-RU"),
    });
  }

  const buf = await workbook.xlsx.writeBuffer();

  const dateStr = new Date().toISOString().slice(0, 10);
  const filenameAscii = `inventarizacija-mtb_${dateStr}.xlsx`;
  const filenameUtf = `Инвентаризация_МТБ_${dateStr}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filenameUtf)}`,
    },
  });
}
