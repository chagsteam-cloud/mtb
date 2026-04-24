import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { auth } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold tracking-wide text-primary">
            Учебное заведение
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Учёт материально-технической базы
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Корпоративный кабинет для инвентаризации и контроля состояния
            оборудования.
          </p>
        </div>

        <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
