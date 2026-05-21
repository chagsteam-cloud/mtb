import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { equipmentVisibilityFilter, getAssignedAuditoriumIds } from "@/lib/inventory-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const assigned = await getAssignedAuditoriumIds(session.user.id);
  const scope = equipmentVisibilityFilter({
    role: session.user.role,
    userId: session.user.id,
    assignedAuditoriumIds: assigned,
  });

  const items = await prisma.equipment.findMany({
    where: { id: { in: ids }, ...scope },
    select: { id: true, inventoryNumber: true, name: true },
    orderBy: { inventoryNumber: "asc" },
  });

  return NextResponse.json({ items });
}
