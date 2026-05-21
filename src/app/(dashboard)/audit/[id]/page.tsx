import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-server";
import { canManageAuditSessions } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

import { completeAuditSessionAction } from "@/app/(dashboard)/audit/actions";

export default async function AuditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const audit = await prisma.auditSession.findUnique({
    where: { id },
    include: {
      auditorium: true,
      responsibleUser: { select: { fullName: true } },
      items: { include: { equipment: true } },
      surplusItems: { include: { equipment: true } },
    },
  });
  if (!audit) notFound();

  const matched = audit.items.filter((i) => i.result === "FOUND").length;
  const shortage =
    audit.status === "COMPLETED"
      ? audit.items.filter((i) => i.result === "MISSING").length
      : audit.items.filter((i) => i.result === "PENDING").length;
  const surplus = audit.surplusItems.length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Инвентаризация · ауд. {audit.auditorium.number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ответственный: {audit.responsibleUser.fullName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {audit.status === "IN_PROGRESS" ? (
            <Link
              href={`/audit/${audit.id}/work`}
              className={cn(buttonVariants(), "no-underline")}
            >
              Продолжить
            </Link>
          ) : null}
          <Link href="/audit" className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}>
            К списку
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Совпало</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{matched}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Недостача</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums text-destructive">
            {shortage}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Излишки</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{surplus}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Статус сессии</CardTitle>
          <Badge variant={audit.status === "IN_PROGRESS" ? "secondary" : "default"}>
            {audit.status === "IN_PROGRESS" ? "В процессе" : "Завершена"}
          </Badge>
        </CardHeader>
        <CardContent>
          {audit.status === "IN_PROGRESS" && canManageAuditSessions(session.user.role) ? (
            <form action={completeAuditSessionAction}>
              <input type="hidden" name="sessionId" value={audit.id} />
              <Button type="submit" variant="destructive">
                Завершить инвентаризацию
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Завершена: {audit.completedAt?.toLocaleString("ru-RU") ?? "—"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
