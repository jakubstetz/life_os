const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function d(ts: number): Date | null {
  const x = new Date(ts * 1000);
  return Number.isNaN(x.getTime()) ? null : x;
}

export function unixLabel(ts: number | null | undefined): string {
  const x = ts == null ? null : d(ts);
  return x ? x.toLocaleString() : "";
}

export function unixDate(ts: number | null | undefined): string {
  const x = ts == null ? null : d(ts);
  if (!x) return "";
  const day = x.getDate();
  const yy = String(x.getFullYear()).slice(2);
  return `${day} ${MONTHS[x.getMonth()]} ${yy}`;
}

export function unixHm(ts: number | null | undefined): string {
  const x = ts == null ? null : d(ts);
  if (!x) return "";
  return x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function money(n: number | null | undefined, ccy?: string | null): string {
  if (n == null) return "";
  const s = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return ccy ? `${ccy} ${s}` : s;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PLN: "zł",
};

/** Remaining/value display: `$150.00` rather than `USD 150.00`. */
export function moneySymbol(n: number | null | undefined, ccy?: string | null): string {
  if (n == null) return "";
  const s = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!ccy) return s;
  const sym = CURRENCY_SYMBOLS[ccy.toUpperCase()] ?? ccy;
  return `${sym}${s}`;
}

export function pts(n: number | null | undefined): string {
  if (n == null) return "";
  return Math.round(n).toLocaleString();
}

export function cpp(n: number | null | undefined): string {
  if (n == null) return "";
  return n.toFixed(4);
}

export function unixInputTime(ts: number | null | undefined): string {
  const x = ts == null ? null : d(ts);
  if (!x) return "";
  return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}

export function unixInputDate(ts: number | null | undefined): string {
  const x = ts == null ? null : d(ts);
  if (!x) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseInputDate(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00").getTime();
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

/** `date` is `YYYY-MM-DD`; `time` is `HH:MM` (optional → midnight). */
export function parseInputDateTime(date: string, time = ""): number | null {
  if (!date) return null;
  const hm = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  const t = new Date(`${date}T${hm}:00`).getTime();
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

export function layoverLabel(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h}h ${mm}m`;
  if (h) return `${h}h`;
  return `${mm}m`;
}

/** Clock-style duration `HH:MM` for map labels (`L 01:25`). */
export function durationHm(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "";
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
