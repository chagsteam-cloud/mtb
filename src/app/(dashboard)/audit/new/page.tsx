import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requireSession } from "@/lib/auth-server";
import { canManageAuditSessions } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

import { createAuditSessionAction } from "@/app/(dashboard)/audit/actions";

export default async function NewAuditPage() {
  const session = await requireSession();
  if (!canManageAuditSessions(session.user.role)) redirect("/audit");

  const [auditoriums, users] = await Promise.all([
    prisma.auditorium.findMany({ orderBy: { number: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, login: true, role: true },
    }),
  ]);

  return (
    <div className="grid gap-6 max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Новая инвентаризация</h1>
        <Link href="/audit" className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}>
          Назад
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Параметры сессии</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAuditSessionAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="auditoriumId">Аудитория</Label>
              <select
                id="auditoriumId"
                name="auditoriumId"
                required
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Выберите</option>
                {auditoriums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.number}
                    {a.building ? ` · ${a.building}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsibleUserId">Ответственный</Label>
              <select
                id="responsibleUserId"
                name="responsibleUserId"
                required
                defaultValue={session.user.id}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.login})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Создать и начать</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
