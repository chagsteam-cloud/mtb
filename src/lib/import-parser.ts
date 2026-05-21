import ExcelJS from "exceljs";
import Papa from "papaparse";

export type ImportRow = {
  rowNumber: number;
  inventoryNumber: string;
  name: string;
  status: string;
  cost: string;
  categoryName: string;
  auditoriumNumber: string;
  responsibleLogin: string;
};

const HEADER_ALIASES: Record<keyof Omit<ImportRow, "rowNumber">, string[]> = {
  inventoryNumber: ["инв", "инвентарный", "inventory", "inventorynumber", "номер"],
  name: ["название", "наименование", "name"],
  status: ["статус", "status"],
  cost: ["стоимость", "cost", "цена"],
  categoryName: ["категория", "category"],
  auditoriumNumber: ["аудитория", "auditorium", "кабинет"],
  responsibleLogin: ["мол", "логин", "login", "ответственный"],
};

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function mapHeaders(headers: string[]) {
  const map: Partial<Record<keyof Omit<ImportRow, "rowNumber">, number>> = {};
  headers.forEach((raw, idx) => {
    const h = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => h.includes(a.replace(/\s+/g, "")))) {
        map[field as keyof Omit<ImportRow, "rowNumber">] = idx;
      }
    }
  });
  return map;
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text?: string }).text ?? "");
  }
  return String(v).trim();
}

function rowFromValues(values: string[], rowNumber: number, headerMap: ReturnType<typeof mapHeaders>): ImportRow | null {
  const pick = (key: keyof Omit<ImportRow, "rowNumber">) => {
    const idx = headerMap[key];
    return idx === undefined ? "" : (values[idx] ?? "").trim();
  };

  const inventoryNumber = pick("inventoryNumber");
  const name = pick("name");
  if (!inventoryNumber && !name) return null;

  return {
    rowNumber,
    inventoryNumber,
    name,
    status: pick("status") || "WORKING",
    cost: pick("cost") || "0",
    categoryName: pick("categoryName"),
    auditoriumNumber: pick("auditoriumNumber"),
    responsibleLogin: pick("responsibleLogin"),
  };
}

export async function parseImportFile(buffer: Buffer, filename: string): Promise<ImportRow[]> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (parsed.errors.length) {
      throw new Error(parsed.errors[0]?.message ?? "Ошибка чтения CSV");
    }
    const rows = parsed.data as string[][];
    if (rows.length < 2) return [];
    const headerMap = mapHeaders(rows[0] ?? []);
    return rows
      .slice(1)
      .map((r, i) => rowFromValues(r.map(cellToString), i + 2, headerMap))
      .filter((r): r is ImportRow => r !== null);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellToString(cell.value);
    });
    matrix.push(values);
  });

  if (matrix.length < 2) return [];
  const headerMap = mapHeaders(matrix[0] ?? []);
  return matrix
    .slice(1)
    .map((r, i) => rowFromValues(r, i + 2, headerMap))
    .filter((r): r is ImportRow => r !== null);
}
