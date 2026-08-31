// ── Philippines Time (PHT, UTC+8) — pinned regardless of the device timezone ─
// Docufy PSMS is a Philippine printing-shop system, so every product-facing
// date/time must read as Philippines time even when the browser is somewhere
// else. Storage keeps real UTC instants; only display offsets by +8h.

export const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

// Shift a UTC instant to the PHT wall-clock Date.
export const toPHT = (d: Date): Date => new Date(d.getTime() + PHT_OFFSET_MS);

// A Date carrying the current PHT wall-clock (for .getHours()/.getDate()/...).
export const nowPHT = (): Date => new Date(Date.now() + PHT_OFFSET_MS);

// Philippines date key (YYYY-MM-DD) for the current moment.
export const todayPHTKey = (): string => {
  const p = nowPHT();
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}`;
};

// Philippines date key (YYYY-MM-DD) for any UTC instant.
export const toPHTKey = (d: Date | string | number): string => {
  const date = toDate(d);
  if (!date) return "";
  const p = toPHT(date);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}`;
};

const pad = (n: number): string => String(n).padStart(2, "0");

const toDate = (d: Date | string | number | null | undefined): Date | null => {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

export interface PHTimeOptions {
  hour12?: boolean;
  includeSeconds?: boolean;
}

// Format a UTC instant as Philippines time, e.g. "09:42" / "09:42:30 AM".
export const formatPHTime = (
  d: Date | string | number | null | undefined,
  opts: PHTimeOptions = {},
): string => {
  const date = toDate(d);
  if (!date) return "—";
  const pht = toPHT(date);
  const h24 = pht.getHours();
  const hour12 = opts.hour12 !== false;
  const h = hour12 ? h24 % 12 || 12 : h24;
  const sec = opts.includeSeconds ? `:${pad(pht.getSeconds())}` : "";
  const ampm = hour12 ? (h24 < 12 ? " AM" : " PM") : "";
  return `${pad(h)}:${pad(pht.getMinutes())}${sec}${ampm}`;
};

export type PHRange =
  | { year: "numeric"; month: "long"; day: "numeric" }
  | { weekday: "long"; year: "numeric"; month: "long"; day: "numeric" }
  | { month: "long"; day: "numeric"; year: "numeric" }
  | Intl.DateTimeFormatOptions;

// Format a UTC instant as a Philippines date.
export const formatPHDate = (
  d: Date | string | number | null | undefined,
  style: "short" | "long" | "full" = "long",
): string => {
  const date = toDate(d);
  if (!date) return "—";
  const pht = toPHT(date);
  const opts: Intl.DateTimeFormatOptions =
    style === "full"
      ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      : style === "short"
        ? { month: "short", day: "numeric", year: "numeric" }
        : { year: "numeric", month: "long", day: "numeric" };
  return pht.toLocaleDateString("en-PH", opts);
};

// Full PH date + time in one string.
export const formatPHDateTime = (
  d: Date | string | number | null | undefined,
): string => {
  const date = toDate(d);
  if (!date) return "—";
  return `${formatPHDate(date, "short")} · ${formatPHTime(date, { includeSeconds: false })}`;
};
