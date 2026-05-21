import Link from "next/link";

import { QrScanner } from "@/components/qr/qr-scanner";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function EquipmentScanPage() {
  return (
    <div className="mx-auto grid max-w-lg gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Сканер QR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Откройте камеру и наведите на QR-код карточки оборудования.
          </p>
        </div>
        <Link href="/equipment" className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}>
          Назад
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Камера</CardTitle>
        </CardHeader>
        <CardContent>
          <QrScanner />
        </CardContent>
      </Card>
    </div>
  );
}
