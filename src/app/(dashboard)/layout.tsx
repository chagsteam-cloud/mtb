import Link from "next/link";

import { UserMenu } from "@/components/app/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth-server";
import {
  canApproveMovementRequests,
  canManageUsers,
  canSeeFinancials,
} from "@/lib/authz";
import type { UserRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

function navForRole(role: UserRole) {
  const items: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Панель" },
    { href: "/equipment", label: "Инвентарь" },
    { href: "/movement-requests", label: "Перемещения" },
  ];

  if (canSeeFinancials(role)) {
    items.push({ href: "/finance", label: "Финансы и отчёты" });
  }

  if (canApproveMovementRequests(role)) {
    // already have movement-requests; finance covers reports/acts later
  }

  if (canManageUsers(role)) {
    items.push({ href: "/admin/users", label: "Пользователи" });
  }

  return items;
}

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const nav = navForRole(session.user.role);

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid leading-tight">
              <div className="text-sm font-semibold text-primary">
                МТБ / Инвентаризация
              </div>
              <div className="text-xs text-muted-foreground">
                Контроль состояния и перемещений
              </div>
            </div>
            <Separator orientation="vertical" className="hidden h-8 sm:block" />
            <nav className="hidden flex-wrap items-center gap-2 lg:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "no-underline")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <nav className="flex flex-wrap items-center gap-2 lg:hidden">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "no-underline",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <UserMenu
              fullName={session.user.fullName}
              login={session.user.login}
              role={session.user.role}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
