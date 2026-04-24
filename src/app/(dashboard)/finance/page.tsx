import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/auth-server";
import { equipmentStatusLabel } from "@/lib/ru-labels";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

function moneyRu(amount: unknown) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function FinancePage() {
  await requireRole(["ACCOUNTING", "SYSTEM_ADMIN"]);

  const [totals, byStatus, brokenValue] = await Promise.all([
    prisma.equipment.aggregate({
      _sum: { cost: true },
      _count: { _all: true },
    }),
    prisma.equipment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.equipment.aggregate({
      where: { status: "BROKEN" },
      _sum: { cost: true },
      _count: { _all: true },
    }),
  ]);

  const statusLines = byStatus
    .map((r) => `${equipmentStatusLabel(r.status)}: ${r._count._all}`)
    .join("\n");

  const actText = [
    "АКТ",
    "об учёте материально-технической базы (сводный, автоматический черновик)",
    "",
    `Дата формирования: ${new Date().toLocaleString("ru-RU")}`,
    "",
    `Всего единиц: ${totals._count._all}`,
    `Суммарная балансовая стоимость: ${moneyRu(totals._sum.cost)}`,
    `Неисправно: ${brokenValue._count._all} на сумму ${moneyRu(brokenValue._sum.cost)}`,
    "",
    "Распределение по статусам:",
    statusLines,
    "",
    "Ответственное лицо: ____________________ /ФИО/",
    "Бухгалтерия: ____________________ /ФИО/",
  ].join("\n");

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Финансы и отчёты</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Сводные показатели по стоимости и базовые формы для бухгалтерского контура.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api/export/equipment"
            className={cn(buttonVariants(), "no-underline")}
          >
            Выгрузить в Excel
          </Link>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(actText)}`}
            download={`akt-mtb-chernovik-${new Date().toISOString().slice(0, 10)}.txt`}
            className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}
          >
            Скачать черновик акта (текст)
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Суммарная стоимость
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {moneyRu(totals._sum.cost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего единиц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{totals._count._all}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Неисправно (оценка риска)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{brokenValue._count._all}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              На сумму {moneyRu(brokenValue._sum.cost)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Статусы</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {byStatus.length === 0 ? (
            <div className="text-muted-foreground">Нет данных.</div>
          ) : (
            byStatus.map((r) => (
              <div key={r.status} className="flex items-center justify-between gap-3">
                <div className="text-sm">{equipmentStatusLabel(r.status)}</div>
                <Separator className="flex-1" />
                <div className="tabular-nums">{r._count._all}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
