import Link from "next/link";

import { EquipmentListClient } from "@/components/equipment/equipment-list-client";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EquipmentStatus } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth-server";
import {
  canBulkWriteOff,
  canImportData,
  canManageReferenceData,
  canSeeFinancials,
} from "@/lib/authz";
import { equipmentVisibilityFilter, getAssignedAuditoriumIds } from "@/lib/inventory-service";
import { equipmentStatusLabel } from "@/lib/ru-labels";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const sp = (await searchParams) ?? {};

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

  const rows = items.map((e) => ({
    id: e.id,
    inventoryNumber: e.inventoryNumber,
    name: e.name,
    status: e.status,
    cost: e.cost.toString(),
    categoryName: e.category.name,
    auditoriumNumber: e.auditorium.number,
    auditoriumBuilding: e.auditorium.building,
    molName: e.responsiblePerson.fullName,
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Инвентарь</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поиск, массовые действия, импорт и QR-метки.
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
              <button
                type="submit"
                className={cn(buttonVariants())}
              >
                Применить
              </button>
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

      <EquipmentListClient
        items={rows}
        auditoriums={auditoriums}
        role={session.user.role}
        canImport={canImportData(session.user.role)}
        canWriteOff={canBulkWriteOff(session.user.role)}
        showCost={canSeeFinancials(session.user.role)}
      />
    </div>
  );
}
