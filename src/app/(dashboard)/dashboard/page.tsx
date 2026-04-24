import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-server";
import { equipmentVisibilityFilter, getAssignedAuditoriumIds } from "@/lib/inventory-service";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

function formatInt(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const assigned = await getAssignedAuditoriumIds(session.user.id);
  const scope = equipmentVisibilityFilter({
    role: session.user.role,
    userId: session.user.id,
    assignedAuditoriumIds: assigned,
  });

  const [total, broken, maintenance, activeUsers] = await Promise.all([
    prisma.equipment.count({ where: scope }),
    prisma.equipment.count({ where: { ...scope, status: "BROKEN" } }),
    prisma.equipment.count({ where: { ...scope, status: "MAINTENANCE" } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const working = Math.max(0, total - broken - maintenance);

  const maxBar = Math.max(total, activeUsers, 1);
  const bars = [
    { label: "Всего единиц", value: total, className: "bg-chart-2" },
    { label: "Исправно (оценочно)", value: working, className: "bg-chart-3" },
    { label: "Неисправно", value: broken, className: "bg-destructive/80" },
    { label: "На обслуживании", value: maintenance, className: "bg-chart-1" },
    { label: "Активные пользователи", value: activeUsers, className: "bg-chart-4" },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Аналитическая панель</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ключевые показатели по инвентарю и активности пользователей.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/equipment"
            className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}
          >
            Открыть инвентарь
          </Link>
          <Link href="/movement-requests" className={cn(buttonVariants(), "no-underline")}>
            Запросы на перемещение
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего единиц техники
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatInt(total)}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              В пределах вашей зоны видимости.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Неисправно
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatInt(broken)}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary">Требует внимания</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активные пользователи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatInt(activeUsers)}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              По всей системе (не только ваша зона видимости).
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Сводная диаграмма (упрощённая)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {bars.map((b) => (
            <div key={b.label} className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">{b.label}</div>
                <div className="tabular-nums font-medium">{formatInt(b.value)}</div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${b.className}`}
                  style={{ width: `${Math.round((b.value / maxBar) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
