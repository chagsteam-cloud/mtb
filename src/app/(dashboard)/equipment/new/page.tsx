import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSession } from "@/lib/auth-server";
import { canManageReferenceData } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { equipmentStatusLabel, userRoleShortLabel } from "@/lib/ru-labels";
import { redirect } from "next/navigation";

import { createEquipmentAction } from "@/app/(dashboard)/equipment/actions";

export default async function NewEquipmentPage() {
  const session = await requireSession();
  if (!canManageReferenceData(session.user.role)) {
    redirect("/equipment");
  }

  const [categories, auditoriums, users] = await Promise.all([
    prisma.equipmentCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.auditorium.findMany({ orderBy: { number: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, login: true, role: true },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Новая запись</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Создание карточки оборудования и первичная привязка к аудитории и МОЛ.
          </p>
        </div>
        <Link
          href="/equipment"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "inline-flex items-center justify-center no-underline",
          )}
        >
          Назад
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Параметры</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEquipmentAction} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="name">Название</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inventoryNumber">Инвентарный номер</Label>
              <Input id="inventoryNumber" name="inventoryNumber" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cost">Стоимость (RUB)</Label>
              <Input id="cost" name="cost" inputMode="decimal" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Статус</Label>
              <select
                id="status"
                name="status"
                defaultValue="WORKING"
                required
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                <option value="WORKING">{equipmentStatusLabel("WORKING")}</option>
                <option value="MAINTENANCE">{equipmentStatusLabel("MAINTENANCE")}</option>
                <option value="BROKEN">{equipmentStatusLabel("BROKEN")}</option>
                <option value="WRITTEN_OFF">{equipmentStatusLabel("WRITTEN_OFF")}</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="categoryId">Категория</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue=""
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                <option value="" disabled>
                  Выберите категорию
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="auditoriumId">Аудитория</Label>
              <select
                id="auditoriumId"
                name="auditoriumId"
                required
                defaultValue=""
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                <option value="" disabled>
                  Выберите аудиторию
                </option>
                {auditoriums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.number}
                    {a.building ? ` · ${a.building}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="responsiblePersonId">Материально ответственное лицо</Label>
              <select
                id="responsiblePersonId"
                name="responsiblePersonId"
                required
                defaultValue=""
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                <option value="" disabled>
                  Выберите пользователя
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.login}) · {userRoleShortLabel(u.role)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit">Создать</Button>
              <Link
                href="/equipment"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "inline-flex items-center justify-center no-underline",
                )}
              >
                Отмена
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
