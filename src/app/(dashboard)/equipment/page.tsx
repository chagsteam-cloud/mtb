import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EquipmentStatus } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth-server";
import { canManageReferenceData, canSeeFinancials } from "@/lib/authz";
import { equipmentVisibilityFilter, getAssignedAuditoriumIds } from "@/lib/inventory-service";
import { equipmentStatusLabel } from "@/lib/ru-labels";
import { prisma } from "@/lib/prisma";

import { QuickEquipmentActions } from "@/app/(dashboard)/equipment/quick-actions";

function statusBadge(status: EquipmentStatus) {
  const label = equipmentStatusLabel(status);
  switch (status) {
    case "WORKING":
      return <Badge variant="secondary">{label}</Badge>;
    case "MAINTENANCE":
      return <Badge className="bg-chart-1 text-foreground">{label}</Badge>;
    case "BROKEN":
      return <Badge variant="destructive">{label}</Badge>;
    case "WRITTEN_OFF":
      return <Badge variant="outline">{label}</Badge>;
  }
}

function moneyRu(amount: unknown) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const sp = (await searchParams) ?? {};
  const colCount = canSeeFinancials(session.user.role) ? 8 : 7;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status.trim() : "";
  const status =
    statusRaw && statusRaw !== "ALL" ? (statusRaw as EquipmentStatus) : undefined;
  const auditoriumNumber =
    typeof sp.auditorium === "string" ? sp.auditorium.trim() : "";

  const assigned = await getAssignedAuditoriumIds(session.user.id);
  const scope = equipmentVisibilityFilter({
    role: session.user.role,
    userId: session.user.id,
    assignedAuditoriumIds: assigned,
  });

  const where = {
    ...scope,
    ...(status ? { status } : null),
    ...(auditoriumNumber
      ? { auditorium: { number: { contains: auditoriumNumber } } }
      : null),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { inventoryNumber: { contains: q } },
            { category: { name: { contains: q } } },
          ],
        }
      : null),
  };

  const items = await prisma.equipment.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: true,
      auditorium: true,
      responsiblePerson: { select: { id: true, fullName: true, login: true } },
    },
    take: 200,
  });

  const auditoriums = await prisma.auditorium.findMany({
    orderBy: [{ number: "asc" }],
    select: { id: true, number: true, building: true },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Инвентарь</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поиск и фильтрация по статусу и аудитории. Доступ к строкам зависит от роли и закреплений.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageReferenceData(session.user.role) ? (
            <Link href="/equipment/new" className={cn(buttonVariants(), "no-underline")}>
              Добавить
            </Link>
          ) : null}
          {canSeeFinancials(session.user.role) ? (
            <Link
              href="/api/export/equipment"
              className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}
            >
              Выгрузить в Excel
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="q">Поиск</Label>
              <Input
                id="q"
                name="q"
                placeholder="Название, инв. номер, категория…"
                defaultValue={q}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Статус</Label>
              <select
                id="status"
                name="status"
                defaultValue={status ?? "ALL"}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                <option value="ALL">Все</option>
                <option value="WORKING">{equipmentStatusLabel("WORKING")}</option>
                <option value="MAINTENANCE">{equipmentStatusLabel("MAINTENANCE")}</option>
                <option value="BROKEN">{equipmentStatusLabel("BROKEN")}</option>
                <option value="WRITTEN_OFF">{equipmentStatusLabel("WRITTEN_OFF")}</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="auditorium">Аудитория (номер)</Label>
              <Input
                id="auditorium"
                name="auditorium"
                placeholder="например, 101"
                defaultValue={auditoriumNumber}
              />
            </div>

            <div className="md:col-span-4 flex flex-wrap gap-2">
              <Button type="submit">Применить</Button>
              <Link
                href="/equipment"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "inline-flex items-center justify-center no-underline",
                )}
              >
                Сбросить
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Результаты</CardTitle>
          <div className="text-sm text-muted-foreground tabular-nums">
            Показано: {items.length}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Инв. №</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Аудитория</TableHead>
                {canSeeFinancials(session.user.role) ? (
                  <TableHead className="text-right">Стоимость</TableHead>
                ) : null}
                <TableHead>МОЛ</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-sm text-muted-foreground">
                    Ничего не найдено.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.inventoryNumber}</TableCell>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={`/equipment/${e.id}`}>
                        {e.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.category.name}
                    </TableCell>
                    <TableCell>{statusBadge(e.status)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{e.auditorium.number}</span>
                      {e.auditorium.building ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {e.auditorium.building}
                        </span>
                      ) : null}
                    </TableCell>
                    {canSeeFinancials(session.user.role) ? (
                      <TableCell className="text-right tabular-nums">
                        {moneyRu(e.cost)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-sm">{e.responsiblePerson.fullName}</TableCell>
                    <TableCell className="text-right">
                      <QuickEquipmentActions
                        equipmentId={e.id}
                        currentStatus={e.status}
                        auditoriums={auditoriums}
                        role={session.user.role}
                      />
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
