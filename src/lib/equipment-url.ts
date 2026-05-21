export function equipmentCardPath(equipmentId: string) {
  return `/equipment/${equipmentId}`;
}

export function equipmentCardAbsoluteUrl(equipmentId: string, origin?: string) {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : process.env.AUTH_URL ?? "");
  return `${base.replace(/\/$/, "")}${equipmentCardPath(equipmentId)}`;
}

export function parseEquipmentIdFromScan(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed, "http://local");
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("equipment");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // not a URL
  }

  if (/^[a-z0-9]{20,}$/i.test(trimmed)) return trimmed;
  return null;
}
