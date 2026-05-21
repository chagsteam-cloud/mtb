import { Suspense } from "react";

export default function PrintLabelsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Загрузка…</div>}>{children}</Suspense>;
}
