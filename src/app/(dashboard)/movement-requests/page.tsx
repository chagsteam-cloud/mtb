import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { MovementRequestStatus } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth-server";
import { canApproveMovementRequests, canSeeAllEquipment } from "@/lib/authz";
import { getAssignedAuditoriumIds } from "@/lib/inventory-service";
import { prisma } from "@/lib/prisma";

import { decideMovementRequestAction } from "@/app/(dashboard)/movement-requests/actions";

function statusBadge(status: MovementRequestStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Ожидает</Badge>;
    case "APPROVED":
      return <Badge className="bg-chart-3 text-primary-foreground">Подтверждено</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Отклонено</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">Отменено</Badge>;
  }
}

export default async function MovementRequestsPage() {
  const session = await requireSession();
  const assigned = await getAssignedAuditoriumIds(session.user.id);

  const where = canSeeAllEquipment(session.user.role)
    ? {}
    : {
        OR: [
          { requestedById: session.user.id },
          { fromAuditoriumId: { in: assigned } },
          { toAuditoriumId: { in: assigned } },
        ],
      };

  const requests = await prisma.movementRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      equipment: { select: { id: true, name: true, inventoryNumber: true } },
      requestedBy: { select: { fullName: true, login: true } },
      fromAuditorium: true,
      toAuditorium: true,
      decidedBy: { select: { fullName: true, login: true } },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Перемещения</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Запросы фиксируются в журнале операций и проходят согласование у бухгалтерии/администратора.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Очередь</CardTitle>
          <div className="text-sm text-muted-foreground tabular-nums">
            Всего: {requests.length}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Статус</TableHead>
                <TableHead>Оборудование</TableHead>
                <TableHead>Откуда</TableHead>
                <TableHead>Куда</TableHead>
                <TableHead>Инициатор</TableHead>
                <TableHead>Создано</TableHead>
                <TableHead className="text-right">Решение</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    Запросов пока нет.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.equipment.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {r.equipment.inventoryNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.fromAuditorium.number}
                      {r.fromAuditorium.building ? ` · ${r.fromAuditorium.building}` : ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.toAuditorium.number}
                      {r.toAuditorium.building ? ` · ${r.toAuditorium.building}` : ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.requestedBy.fullName}
                      <div className="text-xs text-muted-foreground">{r.requestedBy.login}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.createdAt.toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "PENDING" && canApproveMovementRequests(session.user.role) ? (
                        <div className="grid gap-2">
                          <form action={decideMovementRequestAction} className="grid gap-2">
                            <input type="hidden" name="requestId" value={r.id} />
                            <input type="hidden" name="decision" value="APPROVED" />
                            <div className="grid gap-1">
                              <Label className="sr-only" htmlFor={`appr-${r.id}`}>
                                Комментарий
                              </Label>
                              <Input
                                id={`appr-${r.id}`}
                                name="comment"
                                placeholder="Комментарий (необязательно)"
                              />
                            </div>
                            <Button size="sm" type="submit">
                              Подтвердить
                            </Button>
                          </form>

                          <form action={decideMovementRequestAction} className="grid gap-2">
                            <input type="hidden" name="requestId" value={r.id} />
                            <input type="hidden" name="decision" value="REJECTED" />
                            <div className="grid gap-1">
                              <Label className="sr-only" htmlFor={`rej-${r.id}`}>
                                Причина отказа
                              </Label>
                              <Textarea
                                id={`rej-${r.id}`}
                                name="comment"
                                placeholder="Причина отказа"
                              />
                            </div>
                            <Button size="sm" type="submit" variant="destructive">
                              Отклонить
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {r.decidedAt ? r.decidedAt.toLocaleString("ru-RU") : "—"}
                          {r.decidedBy ? (
                            <div className="mt-1">
                              {r.decidedBy.fullName}{" "}
                              <span className="text-muted-foreground">({r.decidedBy.login})</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
