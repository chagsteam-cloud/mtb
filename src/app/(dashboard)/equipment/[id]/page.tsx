import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth-server";
import { canManageReferenceData, canSeeFinancials } from "@/lib/authz";
import { equipmentVisibilityFilter, getAssignedAuditoriumIds } from "@/lib/inventory-service";
import {
  equipmentStatusLabel,
  operationTypeLabel,
  userRoleShortLabel,
} from "@/lib/ru-labels";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function moneyRu(amount: unknown) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function EquipmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const assigned = await getAssignedAuditoriumIds(session.user.id);
  const scope = equipmentVisibilityFilter({
    role: session.user.role,
    userId: session.user.id,
    assignedAuditoriumIds: assigned,
  });

  const equipment = await prisma.equipment.findFirst({
    where: { id, ...scope },
    include: {
      category: true,
      auditorium: true,
      responsiblePerson: { select: { id: true, fullName: true, login: true, role: true } },
    },
  });

  if (!equipment) {
    redirect("/equipment");
  }

  const logs = await prisma.operationLog.findMany({
    where: { equipmentId: equipment.id },
    orderBy: { occurredAt: "desc" },
    take: 50,
    include: { author: { select: { fullName: true, login: true } } },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{equipment.name}</h1>
            <Badge variant="secondary">{equipmentStatusLabel(equipment.status)}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Инв. № <span className="font-mono">{equipment.inventoryNumber}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/equipment"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "inline-flex items-center justify-center no-underline",
            )}
          >
            Назад к списку
          </Link>
          {canManageReferenceData(session.user.role) ? (
            <Link
              href={`/equipment/${equipment.id}/edit`}
              className={cn(buttonVariants(), "inline-flex items-center justify-center no-underline")}
            >
              Редактировать
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Карточка</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="grid gap-1">
              <div className="text-muted-foreground">Категория</div>
              <div className="font-medium">{equipment.category.name}</div>
            </div>
            <Separator />
            <div className="grid gap-1">
              <div className="text-muted-foreground">Аудитория</div>
              <div className="font-medium">
                {equipment.auditorium.number}
                {equipment.auditorium.building ? ` · ${equipment.auditorium.building}` : ""}
              </div>
            </div>
            <Separator />
            <div className="grid gap-1">
              <div className="text-muted-foreground">МОЛ</div>
              <div className="font-medium">{equipment.responsiblePerson.fullName}</div>
              <div className="text-xs text-muted-foreground">
                {equipment.responsiblePerson.login} ·{" "}
                {userRoleShortLabel(equipment.responsiblePerson.role)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Финансы</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {canSeeFinancials(session.user.role) ? (
              <div className="grid gap-1">
                <div className="text-muted-foreground">Стоимость</div>
                <div className="text-2xl font-semibold tabular-nums">
                  {moneyRu(equipment.cost)}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                Стоимость доступна только ролям бухгалтерии и администратора.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Журнал операций</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Операция</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead>Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {l.occurredAt.toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="text-sm">{operationTypeLabel(l.operationType)}</TableCell>
                  <TableCell className="text-sm">
                    {l.author.fullName}{" "}
                    <span className="text-muted-foreground">({l.author.login})</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.comment ??
                      [
                        l.previousStatus
                          ? `было: ${equipmentStatusLabel(l.previousStatus)}`
                          : null,
                        l.newStatus ? `стало: ${equipmentStatusLabel(l.newStatus)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
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
