import Link from "next/link";
import { notFound } from "next/navigation";

import { AuditWorkScanner } from "@/components/audit/audit-work-scanner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

import { markAuditFoundAction } from "@/app/(dashboard)/audit/actions";

export default async function AuditWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();

  const audit = await prisma.auditSession.findUnique({
    where: { id },
    include: {
      auditorium: true,
      items: {
        include: { equipment: true },
        orderBy: { equipment: { inventoryNumber: "asc" } },
      },
    },
  });
  if (!audit || audit.status !== "IN_PROGRESS") notFound();

  const found = audit.items.filter((i) => i.result === "FOUND").length;
  const total = audit.items.length;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;

  return (
    <div className="mx-auto grid max-w-lg gap-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Проверка · {audit.auditorium.number}</h1>
          <p className="text-sm text-muted-foreground">
            Найдено {found} из {total} ({pct}%)
          </p>
        </div>
        <Link
          href={`/audit/${audit.id}`}
          className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "no-underline")}
        >
          Итоги
        </Link>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сканирование</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditWorkScanner sessionId={audit.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Список оборудования</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {audit.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs">{item.equipment.inventoryNumber}</div>
                <div className="truncate text-sm font-medium">{item.equipment.name}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.result === "FOUND" ? (
                  <Badge className="bg-chart-3 text-primary-foreground">Найдено</Badge>
                ) : (
                  <form
                    id={`audit-mark-${item.equipmentId}`}
                    action={markAuditFoundAction}
                    className="inline"
                  >
                    <input type="hidden" name="sessionId" value={audit.id} />
                    <input type="hidden" name="equipmentId" value={item.equipmentId} />
                    <Button type="submit" size="sm" variant="outline">
                      Отметить
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
