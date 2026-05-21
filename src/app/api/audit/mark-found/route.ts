import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { markAuditItemFound } from "@/lib/audit-service";
import { AuthError } from "@/lib/inventory-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as { sessionId?: string; equipmentId?: string };
  if (!body.sessionId || !body.equipmentId) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const result = await markAuditItemFound({
      sessionId: body.sessionId,
      equipmentId: body.equipmentId,
      actorUserId: session.user.id,
    });
    return NextResponse.json({ ok: true, kind: result.kind });
  } catch (e) {
    const message = e instanceof AuthError ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
