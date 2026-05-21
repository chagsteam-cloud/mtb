import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { canImportData } from "@/lib/authz";
import { parseImportFile } from "@/lib/import-parser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canImportData(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows;
  try {
    rows = await parseImportFile(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось прочитать файл" },
      { status: 400 },
    );
  }

  const inventoryNumbers = rows.map((r) => r.inventoryNumber).filter(Boolean);
  const existing = await prisma.equipment.findMany({
    where: { inventoryNumber: { in: inventoryNumbers } },
    select: { inventoryNumber: true },
  });
  const existingSet = new Set(existing.map((e) => e.inventoryNumber));

  const preview = rows.map((r) => ({
    ...r,
    isDuplicate: existingSet.has(r.inventoryNumber),
    isValid: Boolean(r.inventoryNumber && r.name),
  }));

  return NextResponse.json({ rows: preview, total: preview.length });
}
