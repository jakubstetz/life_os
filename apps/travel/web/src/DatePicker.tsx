import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeFloat } from "./float";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayIso() {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth(), n.getDate());
}

function cellsFor(y: number, m: number) {
  const firstDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const prevDim = new Date(y, m, 0).getDate();
  const out: { iso: string; d: number; inMonth: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) {
    const d = prevDim - firstDow + 1 + i;
    const dt = new Date(y, m - 1, d);
    out.push({ iso: toIso(dt.getFullYear(), dt.getMonth(), d), d, inMonth: false });
  }
  for (let d = 1; d <= dim; d++) out.push({ iso: toIso(y, m, d), d, inMonth: true });
  while (out.length % 7) {
    const d = out.length - firstDow - dim + 1;
    const dt = new Date(y, m + 1, d);
    out.push({ iso: toIso(dt.getFullYear(), dt.getMonth(), dt.getDate()), d: dt.getDate(), inMonth: false });
  }
  return out;
}

export function DatePicker({
  value,
  onChange,
  label,
  className,
  variant = "field",
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  className?: string;
  variant?: "plain" | "field";
}) {
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const p = parseIso(value);
    const n = new Date();
    return { y: p?.y ?? n.getFullYear(), m: p?.m ?? n.getMonth() };
  });
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    if (!open) return;
    const p = parseIso(value);
    const n = new Date();
    setView({ y: p?.y ?? n.getFullYear(), m: p?.m ?? n.getMonth() });
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = box.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a) return;
      const size = { width: p?.offsetWidth || 248, height: p?.offsetHeight || 280 };
      setPos(placeFloat(a, size));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || panel.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shift = (delta: number) => {
    setView((v) => {
      const dt = new Date(v.y, v.m + delta, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });
  };

  const today = todayIso();
  const cells = cellsFor(view.y, view.m);

  return (
    <div ref={box} className={["date-picker", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className={`date-picker-trig ${variant}${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label || value || "—"}
      </button>
      {open
        ? createPortal(
            <div
              ref={panel}
              className="date-cal"
              style={{ top: pos.top, left: pos.left }}
              role="dialog"
              aria-label="Choose date"
            >
              <div className="date-cal-head">
                <button type="button" className="icon" onClick={() => shift(-1)} aria-label="Previous month">
                  <ChevronLeft size={14} />
                </button>
                <span className="date-cal-title">
                  {MONTHS[view.m]} {view.y}
                </span>
                <button type="button" className="icon" onClick={() => shift(1)} aria-label="Next month">
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="date-cal-dow">
                {DOW.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="date-cal-grid">
                {cells.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    className={[
                      "date-cal-day",
                      c.inMonth ? "" : "out",
                      c.iso === value ? "sel" : "",
                      c.iso === today ? "today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onChange(c.iso);
                      setOpen(false);
                    }}
                  >
                    {c.d}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
