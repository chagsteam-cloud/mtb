import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth-server";
import { canManageAuditSessions } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function AuditListPage() {
  const session = await requireSession();

  const sessions = await prisma.auditSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      auditorium: true,
      responsibleUser: { select: { fullName: true } },
      _count: { select: { items: true, surplusItems: true } },
    },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Инвентаризация</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Сессии проверки по аудиториям с фиксацией среза оборудования.
          </p>
        </div>
        {canManageAuditSessions(session.user.role) ? (
          <Link href="/audit/new" className={cn(buttonVariants(), "no-underline")}>
            Запустить проверку
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сессии</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Аудитория</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Единиц в срезе</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.auditorium.number}</TableCell>
                  <TableCell>{s.responsibleUser.fullName}</TableCell>
                  <TableCell>
                    {s.status === "IN_PROGRESS" ? (
                      <Badge variant="secondary">В процессе</Badge>
                    ) : (
                      <Badge>Завершена</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{s._count.items}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.startedAt.toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={s.status === "IN_PROGRESS" ? `/audit/${s.id}/work` : `/audit/${s.id}`}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "no-underline")}
                    >
                      Открыть
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
