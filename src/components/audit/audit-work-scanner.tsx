"use client";

import { useRouter } from "next/navigation";

import { QrScanner } from "@/components/qr/qr-scanner";

export function AuditWorkScanner({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  return (
    <QrScanner
      redirect={false}
      onDetected={async (equipmentId) => {
        const res = await fetch("/api/audit/mark-found", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, equipmentId }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error ?? "Не удалось отметить");
          return;
        }
        router.refresh();
      }}
    />
  );
}
