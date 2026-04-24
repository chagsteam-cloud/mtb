"use client";

import { signOut } from "next-auth/react";

import type { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { userRoleFullLabel } from "@/lib/ru-labels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu(props: {
  fullName: string;
  login: string;
  role: UserRole;
}) {
  async function onLogout() {
    // signOut should redirect, but we keep a hard redirect fallback
    // to avoid any client-state "sticking" between accounts.
    await signOut({ redirect: true, callbackUrl: "/login" });
    window.location.href = "/login";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="justify-between gap-2">
            <span className="max-w-[220px] truncate text-left font-medium">
              {props.fullName}
            </span>
            <span className="text-xs text-muted-foreground">▼</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="grid gap-1">
              <div className="text-sm font-medium text-foreground">{props.fullName}</div>
              <div className="text-xs text-muted-foreground">
                {props.login} · {userRoleFullLabel(props.role)}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void onLogout()}
            className="text-destructive focus:text-destructive"
            variant="destructive"
          >
            Выйти
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
