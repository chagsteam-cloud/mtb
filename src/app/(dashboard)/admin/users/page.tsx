import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { userRoleShortLabel } from "@/lib/ru-labels";

import {
  createUserAction,
  deleteUserAction,
  setUserAuditoriumsAction,
  updateUserAction,
} from "@/app/(dashboard)/admin/users/actions";

export default async function AdminUsersPage() {
  const session = await requireRole(["SYSTEM_ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      auditoriumAssignments: { include: { auditorium: true } },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Пользователи</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление ролями, статусом активности и закреплением за аудиториями.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Создать пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="login">Логин</Label>
              <Input id="login" name="login" autoComplete="off" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="fullName">ФИО</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Роль</Label>
              <select
                id="role"
                name="role"
                defaultValue="TEACHER"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                required
              >
                <option value="SYSTEM_ADMIN">Системный администратор</option>
                <option value="ACCOUNTING">Бухгалтерия</option>
                <option value="LABORATORY">Лаборант</option>
                <option value="TEACHER">Преподаватель</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="isActive">Активен</Label>
              <select
                id="isActive"
                name="isActive"
                defaultValue="true"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
              >
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Создать</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Список</CardTitle>
          <div className="text-sm text-muted-foreground tabular-nums">
            Всего: {users.length}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Аудитории</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{u.login}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{userRoleShortLabel(u.role)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.isActive ? (
                      <span className="text-emerald-700">Активен</span>
                    ) : (
                      <span className="text-muted-foreground">Отключён</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[360px] text-xs text-muted-foreground">
                    {u.auditoriumAssignments.length === 0 ? (
                      "—"
                    ) : (
                      <span className="line-clamp-3">
                        {u.auditoriumAssignments
                          .map((a) => a.auditorium.number)
                          .join(", ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="grid gap-3">
                      <form action={updateUserAction} className="grid gap-2 rounded-md border p-3 text-left">
                        <input type="hidden" name="userId" value={u.id} />
                        <div className="grid gap-2">
                          <Label className="sr-only" htmlFor={`fn-${u.id}`}>
                            ФИО
                          </Label>
                          <Input id={`fn-${u.id}`} name="fullName" defaultValue={u.fullName} />
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label className="sr-only" htmlFor={`role-${u.id}`}>
                              Роль
                            </Label>
                            <select
                              id={`role-${u.id}`}
                              name="role"
                              defaultValue={u.role}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                            >
                              <option value="SYSTEM_ADMIN">Системный администратор</option>
                              <option value="ACCOUNTING">Бухгалтерия</option>
                              <option value="LABORATORY">Лаборант</option>
                              <option value="TEACHER">Преподаватель</option>
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <Label className="sr-only" htmlFor={`act-${u.id}`}>
                              Активен
                            </Label>
                            <select
                              id={`act-${u.id}`}
                              name="isActive"
                              defaultValue={u.isActive ? "true" : "false"}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                            >
                              <option value="true">Активен</option>
                              <option value="false">Отключён</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label className="sr-only" htmlFor={`pw-${u.id}`}>
                            Новый пароль
                          </Label>
                          <Input
                            id={`pw-${u.id}`}
                            name="password"
                            type="password"
                            placeholder="Новый пароль (необязательно)"
                          />
                        </div>
                        <Button size="sm" type="submit" variant="secondary">
                          Сохранить
                        </Button>
                      </form>

                      <Separator />

                      <form action={setUserAuditoriumsAction} className="grid gap-2 rounded-md border p-3 text-left">
                        <input type="hidden" name="userId" value={u.id} />
                        <div className="text-sm font-medium">Закрепление за аудиториями</div>
                        <div className="grid gap-2">
                          <Label className="sr-only" htmlFor={`aud-${u.id}`}>
                            Номера аудиторий
                          </Label>
                          <Input
                            id={`aud-${u.id}`}
                            name="auditoriumNumbers"
                            defaultValue={u.auditoriumAssignments
                              .map((a) => a.auditorium.number)
                              .join(", ")}
                            placeholder="Например: 101, 202"
                          />
                        </div>
                        <Button size="sm" type="submit" variant="outline">
                          Обновить закрепления
                        </Button>
                      </form>

                      <form action={deleteUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button
                          size="sm"
                          type="submit"
                          variant="destructive"
                          disabled={u.id === session.user.id}
                        >
                          Удалить
                        </Button>
                      </form>
                    </div>
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
