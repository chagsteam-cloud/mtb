"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";

import { equipmentCardAbsoluteUrl } from "@/lib/equipment-url";

export function EquipmentQr({ equipmentId, size = 160 }: { equipmentId: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = equipmentCardAbsoluteUrl(equipmentId);
    QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    }).catch(() => {});
  }, [equipmentId, size]);

  return <canvas ref={canvasRef} className="rounded-md border bg-white p-1" />;
}
