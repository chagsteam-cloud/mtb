import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { EquipmentStatus } from "@/generated/prisma/enums";
import { canBulkWriteOff } from "@/lib/authz";
import {
  AuthError,
  bulkChangeEquipmentStatus,
  bulkCreateMovementRequests,
  bulkWriteOffEquipment,
  getAssignedAuditoriumIds,
} from "@/lib/inventory-service";

export const runtime = "nodejs";

type BulkBody =
  | { action: "status"; ids: string[]; nextStatus: EquipmentStatus; comment?: string }
  | { action: "movement"; ids: string[]; toAuditoriumId: string; comment?: string }
  | { action: "write_off"; ids: string[] };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: BulkBody;
  try {
    body = (await req.json()) as BulkBody;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "EMPTY_IDS" }, { status: 400 });
  }

  const assigned = await getAssignedAuditoriumIds(session.user.id);

  try {
    if (body.action === "status") {
      await bulkChangeEquipmentStatus({
        actorUserId: session.user.id,
        actorRole: session.user.role,
        assignedAuditoriumIds: assigned,
        equipmentIds: ids,
        nextStatus: body.nextStatus,
        comment: body.comment,
      });
    } else if (body.action === "movement") {
      if (!body.toAuditoriumId) {
        return NextResponse.json({ error: "MISSING_TO_AUDITORIUM" }, { status: 400 });
      }
      await bulkCreateMovementRequests({
        actorUserId: session.user.id,
        actorRole: session.user.role,
        assignedAuditoriumIds: assigned,
        equipmentIds: ids,
        toAuditoriumId: body.toAuditoriumId,
        comment: body.comment,
      });
    } else if (body.action === "write_off") {
      if (!canBulkWriteOff(session.user.role)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      await bulkWriteOffEquipment({
        actorUserId: session.user.id,
        actorRole: session.user.role,
        assignedAuditoriumIds: assigned,
        equipmentIds: ids,
      });
    } else {
      return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof AuthError ? e.message : "Ошибка массовой операции";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, processed: ids.length });
}
