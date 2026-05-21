"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { parseEquipmentIdFromScan } from "@/lib/equipment-url";

export function QrScanner(props: {
  onDetected?: (equipmentId: string) => void;
  redirect?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "qr-reader-region";

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          const id = parseEquipmentIdFromScan(decoded);
          if (!id) {
            setError("QR-код не распознан как карточка оборудования.");
            return;
          }
          setError(null);
          void scanner.stop().then(() => {
            setRunning(false);
            if (props.onDetected) props.onDetected(id);
            else if (props.redirect !== false) router.push(`/equipment/${id}`);
          });
        },
        () => {},
      )
      .then(() => {
        if (!cancelled) setRunning(true);
      })
      .catch(() => {
        setError("Не удалось открыть камеру. Разрешите доступ в браузере.");
      });

    return () => {
      cancelled = true;
      void scanner.stop().catch(() => {});
      try {
        scanner.clear();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [props, router]);

  return (
    <div className="grid gap-3">
      <div id={regionId} className="overflow-hidden rounded-lg border bg-black/5" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {running ? (
        <p className="text-xs text-muted-foreground">Наведите камеру на QR-код карточки оборудования.</p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          void scannerRef.current?.stop();
          setRunning(false);
        }}
      >
        Остановить камеру
      </Button>
    </div>
  );
}
