"use client";

import { useMemo, useState } from "react";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/dashboard",
    [searchParams],
  );

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      login,
      password,
      callbackUrl,
    });

    setIsLoading(false);

    if (!result || result.error) {
      setError("Неверный логин или пароль.");
      return;
    }

    const nextUrl = result.url ?? callbackUrl;
    // Hard navigation makes switching accounts reliable
    // even if the SPA router is in a weird state.
    window.location.href = nextUrl;
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>
          Используйте учётную запись, выданную администратором.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="login">Логин</Label>
            <Input
              id="login"
              name="login"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Входим…" : "Войти"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
