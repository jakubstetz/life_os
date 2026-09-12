import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { placeFloat } from "./float";

export function SearchSelect({
  value,
  label,
  onChange,
  options,
  placeholder = "—",
  allowCreate,
  className,
  compact,
}: {
  value: string | null;
  /** Display name for the current code, if known. */
  label?: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; name: string; detail?: string }[];
  placeholder?: string;
  allowCreate?: (query: string) => string | null;
  className?: string;
  /** Code stays put; search happens in a menu underneath. */
  compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  const shown = useMemo(() => {
    const n = query.trim().toLowerCase();
    if (!n) return [];
    const scored: { value: string; name: string; detail?: string; s: number }[] = [];
    for (const o of options) {
      const code = o.value.toLowerCase();
      const name = o.name.toLowerCase();
      const place = (o.detail ?? "").toLowerCase();
      let s = -1;
      if (code === n) s = 0;
      else if (code.startsWith(n)) s = 1;
      else if (name.startsWith(n)) s = 2;
      else if (name.includes(n) || code.includes(n)) s = 3;
      else if (place.includes(n)) s = 4;
      if (s >= 0) scored.push({ ...o, s });
    }
    scored.sort((a, b) => a.s - b.s || a.value.localeCompare(b.value));
    if (value) {
      const i = scored.findIndex((o) => o.value === value);
      if (i > 0) {
        const [hit] = scored.splice(i, 1);
        scored.unshift(hit);
      }
    }
    return scored.slice(0, 12);
  }, [options, query, value]);

  const created = allowCreate?.(query.trim()) ?? null;
  const rows: { value: string; name: string; detail?: string; create: boolean }[] = shown.map(
    (o) => ({
      value: o.value,
      name: o.name,
      detail: o.detail,
      create: false,
    }),
  );
  if (created && !rows.some((o) => o.value.toUpperCase() === created.toUpperCase())) {
    rows.push({ value: created, name: `Use “${created}”`, create: true });
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setHi(0);
  }, [query]);

  useEffect(() => {
    if (open && compact) searchRef.current?.focus();
  }, [open, compact]);

  const floatMenu = compact && open;
  useLayoutEffect(() => {
    if (!floatMenu) return;
    const place = () => {
      const a = box.current?.getBoundingClientRect();
      const m = menuRef.current;
      if (!a) return;
      setPos(placeFloat(a, { width: m?.offsetWidth || 256, height: m?.offsetHeight || 240 }));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [floatMenu, query, rows.length]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = rows[hi];
      if (hit) pick(hit.value);
    }
  };

  const closedLabel = label || value || "";
  const menuInner = (
    <>
      {compact ? (
        <li className="ss-search">
          <input
            ref={searchRef}
            value={query}
            placeholder="Search airports"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
          />
        </li>
      ) : null}
      {rows.map((r, i) => (
        <li key={r.value}>
          <button
            type="button"
            className={`${i === hi ? "on" : ""} ${r.create ? "create" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setHi(i)}
            onClick={() => pick(r.value)}
          >
            {r.create ? (
              r.name
            ) : (
              <>
                <span className="ss-main">
                  <span className="ss-code">{r.value}</span>
                  <span className="ss-name">{r.name}</span>
                </span>
                {r.detail ? <span className="ss-detail">{r.detail}</span> : null}
              </>
            )}
          </button>
        </li>
      ))}
    </>
  );

  const menu = open && (compact || rows.length > 0) ? (
    compact ? (
      createPortal(
        <ul
          ref={menuRef}
          className="search-select-menu compact-menu"
          style={{ top: pos.top, left: pos.left }}
        >
          {menuInner}
        </ul>,
        document.body,
      )
    ) : (
      <ul ref={menuRef} className="search-select-menu">
        {menuInner}
      </ul>
    )
  ) : null;

  if (compact) {
    return (
      <div
        className={["search-select", className].filter(Boolean).join(" ")}
        data-iata={value || undefined}
        ref={box}
      >
        <button
          type="button"
          className={`iata-code${open ? " open" : ""}`}
          onClick={() => {
            setOpen((v) => !v);
            setQuery("");
          }}
        >
          {value || "—"}
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div
      className={["search-select", className].filter(Boolean).join(" ")}
      data-iata={value || undefined}
      ref={box}
    >
      <input
        value={open ? query : closedLabel}
        placeholder={placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onSearchKey}
      />
      {menu}
    </div>
  );
}
