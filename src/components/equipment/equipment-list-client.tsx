"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { QuickEquipmentActions } from "@/app/(dashboard)/equipment/quick-actions";
import { ImportDataDialog } from "@/components/equipment/import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EquipmentStatus, UserRole } from "@/generated/prisma/enums";
import { equipmentStatusLabel } from "@/lib/ru-labels";
import { cn } from "@/lib/utils";

export type EquipmentRow = {
  id: string;
  inventoryNumber: string;
  name: string;
  status: EquipmentStatus;
  cost: string;
  categoryName: string;
  auditoriumNumber: string;
  auditoriumBuilding: string | null;
  molName: string;
};

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

function moneyRu(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function EquipmentListClient(props: {
  items: EquipmentRow[];
  auditoriums: { id: string; number: string; building: string | null }[];
  role: UserRole;
  canImport: boolean;
  canWriteOff: boolean;
  showCost: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<EquipmentStatus>("BROKEN");
  const [bulkAuditorium, setBulkAuditorium] = useState("");

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const allSelected = props.items.length > 0 && selected.size === props.items.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(props.items.map((i) => i.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkRequest(action: "status" | "movement" | "write_off", extra?: object) {
    if (selectedIds.length === 0) return;
    setBusy(true);
    const body =
      action === "status"
        ? { action, ids: selectedIds, nextStatus: bulkStatus, ...extra }
        : action === "movement"
          ? { action, ids: selectedIds, toAuditoriumId: bulkAuditorium, ...extra }
          : { action, ids: selectedIds, ...extra };

    const res = await fetch("/api/equipment/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      alert(data.error ?? "Ошибка массовой операции");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  const colCount = props.showCost ? 9 : 8;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {props.canImport ? <ImportDataDialog /> : null}
        <Link
          href="/equipment/scan"
          className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}
        >
          Сканировать QR
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Результаты</CardTitle>
          <div className="text-sm text-muted-foreground tabular-nums">
            Показано: {props.items.length}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-16">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Выбрать все"
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead>Инв. №</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Аудитория</TableHead>
                {props.showCost ? <TableHead className="text-right">Стоимость</TableHead> : null}
                <TableHead>МОЛ</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-sm text-muted-foreground">
                    Ничего не найдено.
                  </TableCell>
                </TableRow>
              ) : (
                props.items.map((e) => (
                  <TableRow key={e.id} data-selected={selected.has(e.id)}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        aria-label={`Выбрать ${e.inventoryNumber}`}
                        onChange={(ev) => toggleOne(e.id, ev.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.inventoryNumber}</TableCell>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={`/equipment/${e.id}`}>
                        {e.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.categoryName}</TableCell>
                    <TableCell>{statusBadge(e.status)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{e.auditoriumNumber}</span>
                      {e.auditoriumBuilding ? (
                        <span className="text-muted-foreground"> · {e.auditoriumBuilding}</span>
                      ) : null}
                    </TableCell>
                    {props.showCost ? (
                      <TableCell className="text-right tabular-nums">{moneyRu(e.cost)}</TableCell>
                    ) : null}
                    <TableCell className="text-sm">{e.molName}</TableCell>
                    <TableCell className="text-right">
                      <QuickEquipmentActions
                        equipmentId={e.id}
                        currentStatus={e.status}
                        auditoriums={props.auditoriums}
                        role={props.role}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
          <div className="text-sm font-medium">Выбрано: {selected.size}</div>
          <div className="flex flex-wrap items-end gap-2">
            <Dialog>
              <DialogTrigger render={<Button size="sm" variant="secondary">Изменить статус</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Массовое изменение статуса</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label htmlFor="bulk-status">Статус</Label>
                  <select
                    id="bulk-status"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as EquipmentStatus)}
                  >
                    <option value="WORKING">{equipmentStatusLabel("WORKING")}</option>
                    <option value="MAINTENANCE">{equipmentStatusLabel("MAINTENANCE")}</option>
                    <option value="BROKEN">{equipmentStatusLabel("BROKEN")}</option>
                    <option value="WRITTEN_OFF">{equipmentStatusLabel("WRITTEN_OFF")}</option>
                  </select>
                  <Button disabled={busy} onClick={() => void bulkRequest("status")}>
                    Применить
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger render={<Button size="sm" variant="secondary">Запросить перемещение</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Массовый запрос на перемещение</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label htmlFor="bulk-aud">Целевая аудитория</Label>
                  <select
                    id="bulk-aud"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={bulkAuditorium}
                    onChange={(e) => setBulkAuditorium(e.target.value)}
                  >
                    <option value="">Выберите</option>
                    {props.auditoriums.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.number}
                        {a.building ? ` · ${a.building}` : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={busy || !bulkAuditorium}
                    onClick={() => void bulkRequest("movement")}
                  >
                    Отправить
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {props.canWriteOff ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (confirm("Списать выбранные позиции?")) void bulkRequest("write_off");
                }}
              >
                Списать
              </Button>
            ) : null}

            <Link
              href={`/equipment/print-labels?ids=${selectedIds.join(",")}`}
              className={cn(buttonVariants({ size: "sm" }), "no-underline")}
              target="_blank"
            >
              Печать QR-кодов
            </Link>

            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Сбросить
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
