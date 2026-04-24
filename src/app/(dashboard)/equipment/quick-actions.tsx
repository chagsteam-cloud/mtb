"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import type { EquipmentStatus, UserRole } from "@/generated/prisma/enums";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import {
  createMovementRequestAction,
  setEquipmentStatusAction,
} from "@/app/(dashboard)/equipment/actions";

export function QuickEquipmentActions(props: {
  equipmentId: string;
  currentStatus: EquipmentStatus;
  auditoriums: { id: string; number: string; building: string | null }[];
  role: UserRole;
}) {
  const [moveOpen, setMoveOpen] = useState(false);

  const canChangeStatus =
    props.role === "LABORATORY" ||
    props.role === "TEACHER" ||
    props.role === "SYSTEM_ADMIN" ||
    props.role === "ACCOUNTING";

  const canRequestMove =
    props.role === "LABORATORY" ||
    props.role === "TEACHER" ||
    props.role === "SYSTEM_ADMIN" ||
    props.role === "ACCOUNTING";

  const auditoriumOptions = useMemo(() => {
    return props.auditoriums.map((a) => ({
      id: a.id,
      label: `${a.number}${a.building ? ` · ${a.building}` : ""}`,
    }));
  }, [props.auditoriums]);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/equipment/${props.equipmentId}`}
          className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "no-underline")}
        >
          Открыть
        </Link>

        {canChangeStatus ? (
          <form action={setEquipmentStatusAction}>
            <input type="hidden" name="equipmentId" value={props.equipmentId} />
            <input type="hidden" name="nextStatus" value="BROKEN" />
            <Button size="sm" type="submit" variant="outline">
              Неисправно
            </Button>
          </form>
        ) : null}

        {canChangeStatus && props.currentStatus !== "WORKING" ? (
          <form action={setEquipmentStatusAction}>
            <input type="hidden" name="equipmentId" value={props.equipmentId} />
            <input type="hidden" name="nextStatus" value="WORKING" />
            <Button size="sm" type="submit" variant="outline">
              Исправно
            </Button>
          </form>
        ) : null}

        {canRequestMove ? (
          <Sheet open={moveOpen} onOpenChange={setMoveOpen}>
            <SheetTrigger
              render={
                <Button size="sm" variant="outline">
                  Перемещение
                </Button>
              }
            />
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Перемещение</SheetTitle>
                <SheetDescription>
                  Создаётся заявка. Фактическое перемещение выполняет бухгалтерия/администратор после
                  согласования.
                </SheetDescription>
              </SheetHeader>

              <form action={createMovementRequestAction} className="mt-6 grid gap-4">
                <input type="hidden" name="equipmentId" value={props.equipmentId} />

                <div className="grid gap-2">
                  <Label htmlFor={`move-to-${props.equipmentId}`}>Целевая аудитория</Label>
                  <select
                    id={`move-to-${props.equipmentId}`}
                    name="toAuditoriumId"
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
                    {auditoriumOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`move-comment-${props.equipmentId}`}>Комментарий</Label>
                  <Textarea
                    id={`move-comment-${props.equipmentId}`}
                    name="comment"
                    placeholder="Например: перенос в рамках перепрофилирования кабинета"
                  />
                </div>

                <Button type="submit">Отправить запрос</Button>
              </form>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </div>
  );
}
