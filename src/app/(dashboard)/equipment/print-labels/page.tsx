"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { equipmentCardAbsoluteUrl } from "@/lib/equipment-url";
import { cn } from "@/lib/utils";

type LabelItem = {
  id: string;
  inventoryNumber: string;
  name: string;
};

export default function PrintLabelsPage() {
  const sp = useSearchParams();
  const ids = (sp.get("ids") ?? "").split(",").filter(Boolean);
  const [items, setItems] = useState<LabelItem[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ids.length === 0) return;
    fetch(`/api/equipment/labels?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((data: { items?: LabelItem[] }) => {
        const list = data.items ?? [];
        setItems(list);
        void Promise.all(
          list.map(async (it) => {
            const dataUrl = await QRCode.toDataURL(equipmentCardAbsoluteUrl(it.id), {
              width: 180,
              margin: 1,
            });
            return [it.id, dataUrl] as const;
          }),
        ).then((pairs) => setQrs(Object.fromEntries(pairs)));
      })
      .catch(() => {});
  }, [ids]);

  return (
    <div className="grid gap-6 p-6 print:p-0">
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" className={cn(buttonVariants())} onClick={() => window.print()}>
          Печать
        </button>
        <Link href="/equipment" className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}>
          Назад
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 break-inside-avoid"
          >
            {qrs[it.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrs[it.id]} alt="" width={180} height={180} />
            ) : null}
            <div className="text-center font-mono text-sm">{it.inventoryNumber}</div>
            <div className="text-center text-xs text-muted-foreground line-clamp-2">{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
