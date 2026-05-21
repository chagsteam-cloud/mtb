"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PreviewRow = {
  rowNumber: number;
  inventoryNumber: string;
  name: string;
  isDuplicate: boolean;
  isValid: boolean;
};

export function ImportDataDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/equipment/import/parse", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка загрузки");
      return;
    }
    setRows(data.rows ?? []);
  }

  async function onCommit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/equipment/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, skipDuplicates: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка импорта");
      return;
    }
    setOpen(false);
    setRows([]);
    router.refresh();
    alert(`Импорт завершён: создано ${data.created}, пропущено ${data.skipped}.`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary">Импорт данных</Button>} />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт данных</DialogTitle>
          <DialogDescription>
            Загрузите CSV или Excel. Перед сохранением проверьте колонки и дубликаты по инвентарному номеру.
          </DialogDescription>
        </DialogHeader>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {rows.length > 0 ? (
          <div className="grid gap-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Строка</TableHead>
                  <TableHead>Инв. №</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.inventoryNumber}
                      {r.isDuplicate ? (
                        <span className="ml-2 text-destructive">дубликат</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className={r.isValid ? "" : "text-destructive"}>
                      {r.isValid ? "OK" : "ошибка"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="button" disabled={loading} onClick={() => void onCommit()}>
              {loading ? "Сохранение…" : "Импортировать"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
