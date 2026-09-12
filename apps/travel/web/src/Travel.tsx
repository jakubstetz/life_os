import { ChevronDown, CircleCheck, CircleDashed, Plus, X } from "lucide-react";
import { createPortal } from "react-dom";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { api, type Flight, type FlightPayment, type LegRow, type TravelCredit, type Trip, type Valuation } from "./api";
import { Iata } from "./AirportCode";
import { useCatalog } from "./iata";
import { RouteMap } from "./RouteMap";
import { DatePicker } from "./DatePicker";
import { placeFloat } from "./float";
import { SearchSelect } from "./SearchSelect";
import {
  cpp,
  layoverLabel,
  money,
  moneySymbol,
  pts,
  parseInputDate,
  parseInputDateTime,
  unixDate,
  unixInputDate,
  unixInputTime,
} from "./fmt";

type PortionDraft = LegRow["portions"][number];

function iata3(q: string) {
  return /^[A-Za-z]{3}$/.test(q) ? q.toUpperCase() : null;
}

function applyLegDate(portions: PortionDraft[], iso: string): PortionDraft[] {
  const first = portions[0];
  if (!first) return portions;
  const oldMidnight = parseInputDate(unixInputDate(first.depart_time));
  const newMidnight = parseInputDate(iso);
  if (oldMidnight == null || newMidnight == null) return portions;
  const delta = newMidnight - oldMidnight;
  if (!delta) return portions;
  return portions.map((p) => ({
    ...p,
    depart_time: p.depart_time + delta,
    arrive_time: p.arrive_time != null ? p.arrive_time + delta : null,
  }));
}

function setPortionHm(
  ts: number | null,
  hm: string,
  fallback: number | null,
): number | null {
  if (!hm) return null;
  const src = ts ?? fallback;
  const iso = src != null ? unixInputDate(src) : "";
  if (!iso) return null;
  return parseInputDateTime(iso, hm);
}

function portionsEqual(a: PortionDraft[], b: PortionDraft[]) {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.depart_airport === b[i].depart_airport &&
      p.arrive_airport === b[i].arrive_airport &&
      p.depart_time === b[i].depart_time &&
      p.arrive_time === b[i].arrive_time &&
      (p.flight_number || "") === (b[i].flight_number || ""),
  );
}

function deriveFromPortions(
  portions: PortionDraft[],
): Pick<LegRow, "origin" | "destination" | "depart_time" | "arrive_time" | "layover"> {
  const first = portions[0];
  const last = portions[portions.length - 1];
  let layover: LegRow["layover"];
  if (portions.length <= 1) layover = { kind: "none" };
  else if (portions.length === 2) {
    const a = portions[0];
    const b = portions[1];
    let minutes: number | null = null;
    if (a.arrive_time != null && b.depart_time != null) {
      minutes = (b.depart_time - a.arrive_time) / 60;
    }
    layover = {
      kind: "one",
      airport: a.arrive_airport,
      minutes,
      until: b.depart_time,
    };
  } else layover = { kind: "multiple" };
  return {
    origin: first?.depart_airport ?? null,
    destination: last?.arrive_airport ?? null,
    depart_time: first?.depart_time ?? null,
    arrive_time: last?.arrive_time ?? last?.depart_time ?? null,
    layover,
  };
}

const TABS = ["Trips", "Flights", "Flight legs", "Rentals", "Stays"] as const;
type Tab = (typeof TABS)[number];
const LIVE_TABS: ReadonlySet<string> = new Set(["Flights", "Flight legs"]);

function sortLegs(a: LegRow, b: LegRow) {
  return (a.depart_time ?? 0) - (b.depart_time ?? 0);
}

function ticketKind(
  legs: LegRow[],
): "one_way" | "round_trip" | "multi_city" | null {
  if (legs.length <= 0) return null;
  if (legs.length === 1) return "one_way";
  const sorted = [...legs].sort(sortLegs);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (
    legs.length === 2 &&
    first.origin &&
    last.destination &&
    first.origin === last.destination
  ) {
    return "round_trip";
  }
  return "multi_city";
}

const CREDIT_KINDS = [
  { value: "flight_credit", name: "Flight credit" },
  { value: "companion_certificate", name: "Companion certificate" },
  { value: "award", name: "Award" },
  { value: "discount_code", name: "Discount code" },
];

const PAYMENT_KINDS = [
  { value: "card", name: "Card" },
  { value: "points", name: "Points" },
  { value: "travel_credit", name: "Travel credit" },
];

function kindName(kinds: { value: string; name: string }[], value: string | null) {
  return kinds.find((k) => k.value === value)?.name ?? value;
}

/** Which create-form fields a redeemable kind actually uses. */
function creditKindFields(kind: string | null) {
  const k = kind || "flight_credit";
  return {
    showValue: true,
    valueIsMax: k !== "flight_credit",
    showUses: k !== "flight_credit",
    usesRequired: k === "companion_certificate" || k === "award",
    showPercent: k === "companion_certificate" || k === "discount_code",
  };
}

type CreditDraft = {
  airline: string | null;
  kind: string;
  original_amount: number | null;
  currency: string | null;
  uses: number | null;
  percent_off: number | null;
  expires_at: number | null;
  code: string;
  remarks: string;
};

function creditDraftFrom(credit: TravelCredit): CreditDraft {
  return {
    airline: credit.airline,
    kind: credit.kind ?? "flight_credit",
    original_amount: credit.original_amount,
    currency: credit.currency,
    uses: credit.uses,
    percent_off: credit.percent_off,
    expires_at: credit.expires_at,
    code: credit.code ?? "",
    remarks: credit.remarks ?? "",
  };
}

function applyCreditKind(draft: CreditDraft, kind: string): CreditDraft {
  const next = { ...draft, kind };
  if (kind === "flight_credit") {
    next.currency = draft.currency || "USD";
    next.uses = null;
    next.percent_off = null;
  } else {
    if (
      (kind === "companion_certificate" || kind === "award") &&
      draft.uses == null
    ) {
      next.uses = 1;
    }
    if (kind === "award") next.percent_off = null;
    if (!next.currency && draft.original_amount != null) {
      next.currency = "USD";
    }
  }
  return next;
}

function creditPayloadFromDraft(draft: CreditDraft) {
  const kind = draft.kind || "flight_credit";
  const fields = creditKindFields(kind);
  const amount = draft.original_amount;
  return {
    airline: draft.airline || null,
    kind,
    original_amount: amount,
    currency: amount != null ? draft.currency || "USD" : null,
    uses:
      kind === "flight_credit"
        ? null
        : fields.usesRequired
          ? draft.uses ?? 1
          : draft.uses,
    percent_off: fields.showPercent ? draft.percent_off : null,
    expires_at: draft.expires_at,
    code: draft.code.trim() || null,
    remarks: draft.remarks.trim() || null,
  };
}

type CtxMenuItem = {
  label: string;
  danger?: boolean;
  onClick: () => void | Promise<void>;
};

/** Same rules as domain.payments._kind — not stored. */
function paymentKind(p: {
  travel_credit_id?: string | null;
  account_id?: string | null;
}): string {
  if (p.travel_credit_id) return "travel_credit";
  if (p.account_id != null) return "card";
  return "points";
}

type PayDraft = {
  id: string;
  kind: string | null;
  amount: number | null;
  travel_credit_id: string | null;
  account_id: string | null;
  remarks: string | null;
};

function asPayDraft(p: FlightPayment, i: number): PayDraft {
  return {
    id: p.id || `tmp_${i}`,
    kind: paymentKind(p),
    amount: p.amount,
    travel_credit_id: p.travel_credit_id,
    account_id: p.account_id,
    remarks: p.remarks,
  };
}

function paymentsForSave(payments: PayDraft[]) {
  return payments
    .filter((p) => p.kind !== "travel_credit" || p.travel_credit_id)
    .map(({ kind, ...rest }) => ({
      ...rest,
      account_id: kind === "card" && rest.account_id == null ? "" : rest.account_id,
    }));
}

function paymentsFromFlight(flight: Record<string, unknown>): PayDraft[] {
  const raw = (flight.payments as FlightPayment[] | undefined) ?? [];
  return raw.map(asPayDraft);
}

function paymentsEqual(a: PayDraft[], b: PayDraft[]) {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.kind === b[i].kind &&
      p.amount === b[i].amount &&
      (p.travel_credit_id || "") === (b[i].travel_credit_id || "") &&
      (p.account_id ?? "") === (b[i].account_id ?? "") &&
      (p.remarks || "") === (b[i].remarks || ""),
  );
}

function valueLabel(c: TravelCredit): string {
  const bits: string[] = [];
  if (c.percent_off != null) bits.push(`${c.percent_off}%`);
  if (c.currency) {
    // Draw-down e-credits show remaining; use-capped rows show the max.
    const amt = c.uses != null ? c.original_amount : c.remaining_amount;
    const money = moneySymbol(amt, c.currency);
    if (money) bits.push(money);
  } else if (c.remaining_uses != null) {
    bits.push(String(c.remaining_uses));
  }
  return bits.join(" · ") || "—";
}

function hasClockTimes(r: LegRow): boolean {
  return r.status !== "planned" && r.flight?.booked_time != null;
}

const MIN_BOARD = 280;
const MIN_INSPECTOR = 280;
const MIN_CREDITS = 240;
const DEFAULT_INSPECTOR = 662; // 10% narrower than 736 — more board width for purpose columns
const DEFAULT_CREDITS = 384;
const PANE_STORE = "lifeos-travel-panes";

type PaneWidths = { inspector: number; credits: number };

function defaultPanes(total: number): PaneWidths {
  return clampPanes(DEFAULT_INSPECTOR, DEFAULT_CREDITS, total);
}

function loadPanes(total: number): PaneWidths {
  try {
    const raw = localStorage.getItem(PANE_STORE);
    if (!raw) return defaultPanes(total);
    const parsed = JSON.parse(raw) as Partial<PaneWidths>;
    return clampPanes(
      Number(parsed.inspector) || DEFAULT_INSPECTOR,
      Number(parsed.credits) || DEFAULT_CREDITS,
      total,
    );
  } catch {
    return defaultPanes(total);
  }
}

function savePanes(panes: PaneWidths) {
  try {
    localStorage.setItem(PANE_STORE, JSON.stringify(panes));
  } catch {
    /* private mode / quota */
  }
}

function clampPanes(insp: number, cred: number, total: number): PaneWidths {
  if (total <= 0) return { inspector: insp, credits: cred };
  const maxPair = Math.max(MIN_INSPECTOR + MIN_CREDITS, total - MIN_BOARD);
  let i = Math.max(MIN_INSPECTOR, insp);
  let c = Math.max(MIN_CREDITS, cred);
  if (i + c > maxPair) {
    const overflow = i + c - maxPair;
    const iRoom = i - MIN_INSPECTOR;
    const cRoom = c - MIN_CREDITS;
    const room = iRoom + cRoom;
    if (room <= 0) {
      i = MIN_INSPECTOR;
      c = Math.min(MIN_CREDITS, maxPair - MIN_INSPECTOR);
    } else {
      i -= overflow * (iRoom / room);
      c -= overflow * (cRoom / room);
    }
  }
  return { inspector: Math.round(i), credits: Math.round(c) };
}

function RowContextMenu({
  at,
  onClose,
  items,
}: {
  at: { x: number; y: number } | null;
  onClose: () => void;
  items: CtxMenuItem[];
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!at) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [at, onClose]);

  if (!at || items.length === 0) return null;
  return (
    <ul ref={ref} className="context-menu" style={{ left: at.x, top: at.y }}>
      {items.map((item) => (
        <li key={item.label}>
          <button
            type="button"
            className={item.danger ? "danger" : undefined}
            onClick={() => {
              Promise.resolve(item.onClick()).finally(onClose);
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function SplitHandle({
  label,
  onDelta,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  onDelta: (dx: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const lastX = useRef(0);
  const dragging = useRef(false);
  return (
    <div
      className="split-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        dragging.current = true;
        lastX.current = e.clientX;
        onDragStart?.();
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const dx = e.clientX - lastX.current;
        lastX.current = e.clientX;
        if (dx) onDelta(dx);
      }}
      onPointerUp={() => {
        if (!dragging.current) return;
        dragging.current = false;
        onDragEnd?.();
      }}
      onPointerCancel={() => {
        dragging.current = false;
        onDragEnd?.();
      }}
    />
  );
}

export function Travel() {
  const [tab, setTab] = useState<Tab>("Flight legs");
  const [rows, setRows] = useState<LegRow[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [credits, setCredits] = useState<TravelCredit[]>([]);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [dataRev, setDataRev] = useState(0);
  const [stubOpen, setStubOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: CtxMenuItem[];
  } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [panes, setPanes] = useState<PaneWidths>(() => loadPanes(window.innerWidth));
  const [resizing, setResizing] = useState(false);

  const openRowMenu = (e: ReactMouseEvent, items: CtxMenuItem[]) => {
    e.preventDefault();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      items: items.map((item) => ({
        ...item,
        onClick: () =>
          Promise.resolve(item.onClick()).catch((err) => setErr(String(err))),
      })),
    });
  };

  const fitPanes = useCallback((insp: number, cred: number) => {
    const total = workspaceRef.current?.clientWidth ?? 0;
    return clampPanes(insp, cred, total);
  }, []);

  useLayoutEffect(() => {
    const total = workspaceRef.current?.clientWidth ?? window.innerWidth;
    setPanes(() => {
      try {
        if (!localStorage.getItem(PANE_STORE)) return defaultPanes(total);
      } catch {
        return defaultPanes(total);
      }
      return loadPanes(total);
    });
    const onResize = () => setPanes((p) => fitPanes(p.inspector, p.credits));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitPanes]);

  const reload = useCallback(async () => {
    const [board, t, c, f] = await Promise.all([
      api.legsBoard(),
      api.trips(),
      api.credits(),
      api.flights(),
    ]);
    setRows(board);
    setTrips(t);
    setCredits(c);
    setFlights(f);
    setDataRev((n) => n + 1);
  }, []);

  useEffect(() => {
    reload().catch((e) => setErr(String(e)));
  }, [reload]);

  const legsByFlight = useMemo(() => {
    const m = new Map<string, LegRow[]>();
    for (const r of rows) {
      const list = m.get(r.flight_id) ?? [];
      list.push(r);
      m.set(r.flight_id, list);
    }
    for (const list of m.values()) list.sort(sortLegs);
    return m;
  }, [rows]);

  const siblings = useMemo(
    () => (selectedFlightId ? (legsByFlight.get(selectedFlightId) ?? []) : []),
    [legsByFlight, selectedFlightId],
  );
  const selected =
    siblings.find((r) => r.id === selectedLegId) ?? siblings[0] ?? null;

  const selectLeg = useCallback((id: string, flightId?: string) => {
    setSelectedLegId(id);
    const row = rows.find((r) => r.id === id);
    setSelectedFlightId(flightId ?? row?.flight_id ?? null);
  }, [rows]);

  const selectFlight = useCallback(
    (flightId: string) => {
      setSelectedFlightId(flightId);
      const legs = legsByFlight.get(flightId) ?? [];
      setSelectedLegId((cur) =>
        legs.some((l) => l.id === cur) ? cur : (legs[0]?.id ?? null),
      );
    },
    [legsByFlight],
  );

  const catalog = useCatalog();
  const airportOpts = useMemo(
    () =>
      Object.entries(catalog?.airports ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );

  const commitPortions = useCallback(
    async (row: LegRow, next: PortionDraft[]) => {
      const derived = deriveFromPortions(next);
      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, portions: next, ...derived } : r)),
      );
      try {
        for (const p of next) {
          if (!p.id) continue;
          await api.savePortion(p.id, {
            id: p.id,
            flight_leg_id: p.flight_leg_id,
            depart_time: p.depart_time,
            arrive_time: p.arrive_time,
            depart_airport: p.depart_airport,
            arrive_airport: p.arrive_airport,
            flight_number: p.flight_number,
          });
        }
      } catch (e) {
        setErr(String(e));
        reload().catch((err) => setErr(String(err)));
      }
    },
    [reload],
  );

  return (
    <>
    <div
      className={`workspace${resizing ? " is-resizing" : ""}`}
      ref={workspaceRef}
      style={{
        gridTemplateColumns: `minmax(0, 1fr) ${panes.inspector}px ${panes.credits}px`,
      }}
    >
      <div className="board">
        <div className="board-head">
          <div className="tabs">
            {TABS.map((name) => (
              <button
                key={name}
                className={tab === name ? "on" : ""}
                disabled={!LIVE_TABS.has(name)}
                onClick={() => LIVE_TABS.has(name) && setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <button className="primary new-btn" onClick={() => setStubOpen(true)}>
            <Plus size={14} /> New
          </button>
        </div>
        {err && <p className="err">{err}</p>}
        <div className="table-wrap">
          {tab === "Flights" ? (
            <FlightsTable
              flights={flights}
              legsByFlight={legsByFlight}
              selectedFlightId={selectedFlightId}
              onSelect={selectFlight}
              onContextMenu={(e, flightId) => {
                const legs = legsByFlight.get(flightId) ?? [];
                openRowMenu(e, [
                  {
                    label: "Delete",
                    danger: true,
                    onClick: async () => {
                      for (const leg of legs) await api.deleteLeg(leg.id);
                      if (selectedFlightId === flightId) {
                        setSelectedFlightId(null);
                        setSelectedLegId(null);
                      }
                      await reload();
                    },
                  },
                ]);
              }}
            />
          ) : (
          <table className="dense legs">
            <thead>
              <tr>
                <th></th>
                <th>Date</th>
                <th>Depart</th>
                <th>Arrive</th>
                <th>Purpose</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`${selectedFlightId === r.flight_id ? "sib" : ""} ${selected?.id === r.id ? "sel" : ""} row-${r.status}`}
                  onClick={() => selectLeg(r.id, r.flight_id)}
                  onContextMenu={(e) =>
                    openRowMenu(e, [
                      {
                        label: "Delete",
                        danger: true,
                        onClick: async () => {
                          await api.deleteLeg(r.id);
                          if (selectedLegId === r.id) setSelectedLegId(null);
                          await reload();
                        },
                      },
                    ])
                  }
                >
                  <td>
                    <AirlineMark code={r.airline} />
                  </td>
                  <td className="num">
                    <DatePicker
                      variant="plain"
                      value={unixInputDate(r.depart_time)}
                      label={unixDate(r.depart_time) || "—"}
                      onChange={(iso) => commitPortions(r, applyLegDate(r.portions, iso))}
                    />
                  </td>
                  <td className="mono">
                    <BoardEnd
                      code={r.origin}
                      time={r.depart_time}
                      showTime={hasClockTimes(r)}
                      airportOpts={airportOpts}
                      onAirport={(code) => {
                        if (!r.portions[0]) return;
                        const next = r.portions.map((p) => ({ ...p }));
                        next[0] = { ...next[0], depart_airport: code };
                        commitPortions(r, next);
                      }}
                      onTime={(hm) => {
                        if (!r.portions[0]) return;
                        const next = r.portions.map((p) => ({ ...p }));
                        next[0] = {
                          ...next[0],
                          depart_time:
                            setPortionHm(next[0].depart_time, hm, next[0].depart_time) ??
                            next[0].depart_time,
                        };
                        commitPortions(r, next);
                      }}
                    />
                  </td>
                  <td className="mono">
                    <BoardEnd
                      code={r.destination}
                      time={r.arrive_time}
                      showTime={hasClockTimes(r)}
                      airportOpts={airportOpts}
                      onAirport={(code) => {
                        const i = r.portions.length - 1;
                        if (i < 0) return;
                        const next = r.portions.map((p) => ({ ...p }));
                        next[i] = { ...next[i], arrive_airport: code };
                        commitPortions(r, next);
                      }}
                      onTime={(hm) => {
                        const i = r.portions.length - 1;
                        if (i < 0) return;
                        const next = r.portions.map((p) => ({ ...p }));
                        next[i] = {
                          ...next[i],
                          arrive_time: setPortionHm(
                            next[i].arrive_time,
                            hm,
                            next[i].depart_time,
                          ),
                        };
                        commitPortions(r, next);
                      }}
                    />
                  </td>
                  <td className="clip purpose-cell">
                    {((r.flight.purpose as string) || "").trim() || "—"}
                  </td>
                  <td className="leg-state">
                    <BookedMark status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      <div className="inspector-slot">
        <SplitHandle
          label="Resize inspector"
          onDragStart={() => setResizing(true)}
          onDelta={(dx) =>
            setPanes((p) => fitPanes(p.inspector - dx, p.credits))
          }
          onDragEnd={() => {
            setResizing(false);
            setPanes((p) => {
              const next = fitPanes(p.inspector, p.credits);
              savePanes(next);
              return next;
            });
          }}
        />
        <Inspector
          row={selected}
          siblings={siblings}
          trips={trips}
          credits={credits}
          dataRev={dataRev}
          emptyHint={tab === "Flights" ? "Select a flight" : "Select a flight leg"}
          onSelectLeg={(id) => selectLeg(id)}
          onSaved={async () => {
            await reload();
          }}
        />
      </div>

      <aside className="credits-pane">
        <SplitHandle
          label="Resize credits"
          onDragStart={() => setResizing(true)}
          onDelta={(dx) =>
            setPanes((p) => fitPanes(p.inspector, p.credits - dx))
          }
          onDragEnd={() => {
            setResizing(false);
            setPanes((p) => {
              const next = fitPanes(p.inspector, p.credits);
              savePanes(next);
              return next;
            });
          }}
        />
        <div className="credits-head">
          <h2>Credits</h2>
          <button className="primary" onClick={() => setCreditOpen(true)}>
            <Plus size={14} /> New
          </button>
        </div>
        <CreditsTable
          rows={credits}
          onUpdated={reload}
          onError={(msg) => setErr(msg)}
        />
      </aside>

      <RowContextMenu
        at={ctxMenu ? { x: ctxMenu.x, y: ctxMenu.y } : null}
        onClose={() => setCtxMenu(null)}
        items={ctxMenu?.items ?? []}
      />
    </div>
      {stubOpen && (
        <CreateFlightForm
          onClose={() => setStubOpen(false)}
          onSaved={async (legId, flightId) => {
            setStubOpen(false);
            await reload();
            selectLeg(legId, flightId);
          }}
        />
      )}
      {creditOpen && (
        <CreateCreditForm
          onClose={() => setCreditOpen(false)}
          onSaved={async () => {
            setCreditOpen(false);
            await reload();
          }}
        />
      )}
    </>
  );
}

function BoardEnd({
  code,
  time,
  showTime,
  airportOpts,
  onAirport,
  onTime,
}: {
  code: string | null;
  time: number | null;
  showTime: boolean;
  airportOpts: { value: string; name: string }[];
  onAirport: (code: string | null) => void;
  onTime: (hm: string) => void;
}) {
  return (
    <span className="board-end">
      <SearchSelect
        className="iata-edit"
        compact
        value={code}
        label={code}
        options={airportOpts}
        onChange={onAirport}
        allowCreate={iata3}
      />
      {showTime ? (
        <input
          type="time"
          value={unixInputTime(time)}
          onChange={(e) => onTime(e.target.value)}
        />
      ) : null}
    </span>
  );
}

function LayoverCell({
  layover,
  airportOpts,
  onAirport,
}: {
  layover: LegRow["layover"];
  airportOpts: { value: string; name: string }[];
  onAirport?: (code: string | null) => void;
}) {
  if (layover.kind === "none") return <span className="muted">None</span>;
  if (layover.kind === "multiple") return <span>Multiple</span>;
  return (
    <span className="board-end">
      {onAirport ? (
        <SearchSelect
          className="iata-edit"
          compact
          value={layover.airport}
          label={layover.airport}
          options={airportOpts}
          onChange={onAirport}
          allowCreate={iata3}
        />
      ) : (
        <Iata code={layover.airport} />
      )}
      {layover.minutes != null ? (
        <span className="muted">{layoverLabel(layover.minutes)}</span>
      ) : null}
    </span>
  );
}

function AirlinePicker({
  value,
  options,
  onChange,
  onOpenChange,
}: {
  value: string | null;
  options: { value: string; name: string }[];
  onChange: (value: string | null) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  const rows = useMemo(() => {
    const n = query.trim().toLowerCase();
    const hits = n
      ? options.filter(
          (o) =>
            o.value.toLowerCase().includes(n) ||
            o.name.toLowerCase().includes(n),
        )
      : options;
    const out = hits.slice(0, 24).map((o) => ({ ...o, create: false }));
    const create =
      n && /^[a-z0-9]{2}$/i.test(n) && !options.some((o) => o.value === n.toUpperCase())
        ? [{ value: n.toUpperCase(), name: `Use ${n.toUpperCase()}`, create: true }]
        : [];
    return [...create, ...out];
  }, [query, options]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
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
  }, [open, rows.length]);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  const menu =
    open && rows.length > 0
      ? createPortal(
          <ul
            ref={menuRef}
            className="search-select-menu compact-menu airline-picker-menu"
            style={{ top: pos.top, left: pos.left }}
          >
            <li className="ss-search">
              <input
                ref={searchRef}
                value={query}
                placeholder="Search airlines"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHi(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHi((i) => Math.min(i + 1, rows.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHi((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const hit = rows[hi];
                    if (hit) pick(hit.value);
                  }
                }}
              />
            </li>
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
                      <span className="ss-code">{r.value}</span>
                      {r.name}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="airline-picker" ref={box} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="airline-picker-btn"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
      >
        <span className="airline-picker-mark">
          <AirlineMark code={value} />
          <span className="airline-picker-caret" aria-hidden="true">
            <ChevronDown size={8} strokeWidth={2.5} />
          </span>
        </span>
      </button>
      {menu}
    </div>
  );
}

function AirlineMark({ code }: { code: string | null }) {
  const iata = (code ?? "").toUpperCase();
  const [src, setSrc] = useState(iata ? `/airlines/${iata}.png` : "");
  useEffect(() => {
    setSrc(iata ? `/airlines/${iata}.png` : "");
  }, [iata]);
  const mark =
    !iata || src === "letter" ? (
      <span className="logo-fallback">{iata ? iata.slice(0, 2) : "—"}</span>
    ) : (
      <img
        className="logo"
        alt={iata}
        src={src}
        onError={() => {
          if (src.startsWith("/airlines/")) {
            setSrc(`https://images.kiwi.com/airlines/64/${iata}.png`);
          } else {
            setSrc("letter");
          }
        }}
      />
    );
  if (!iata) return mark;
  return (
    <span className="airline-mark" data-airline={iata}>
      {mark}
    </span>
  );
}

type Aff = "spacex" | "casa" | "pp" | null;

function affiliationOf(row: LegRow): Aff {
  if (row.company_reimbursable) return "spacex";
  if (row.family_business) return "casa";
  if (row.personal_llc) return "pp";
  return null;
}

function BookedMark({ status }: { status: string }) {
  if (status === "booked") {
    return (
      <span className="leg-booked" role="img" aria-label="Booked" title="Booked">
        <CircleCheck size={14} aria-hidden="true" />
      </span>
    );
  }
  if (status === "planned") {
    return (
      <span className="leg-unbooked" role="img" aria-label="Not booked" title="Not booked">
        <CircleDashed size={14} aria-hidden="true" />
      </span>
    );
  }
  return null;
}

function AffBadges({
  company_reimbursable,
  company_reimbursed_time,
  family_business,
  personal_llc,
}: {
  company_reimbursable: boolean;
  company_reimbursed_time: number | null;
  family_business: boolean;
  personal_llc: boolean;
}) {
  return (
    <span className="badges">
      {company_reimbursable && (
        <span
          className={`badge-sx ${company_reimbursed_time ? "filed" : "unfiled"}`}
          title={
            company_reimbursed_time
              ? "Reimbursement filed"
              : "Reimbursable — not filed"
          }
        >
          <img src="/badges/spacex.svg" alt="SpaceX" />
        </span>
      )}
      {family_business && (
        <span className="badge avo" title="Family business">
          🥑
        </span>
      )}
      {personal_llc && (
        <span className="badge pp" title="Personal LLC">
          PP
        </span>
      )}
    </span>
  );
}

function FlightRoute({ legs }: { legs: LegRow[] }) {
  const kind = ticketKind(legs);
  if (!legs.length) return <span className="muted">—</span>;
  if (kind === "round_trip") {
    return (
      <span className="flight-route">
        <Iata code={legs[0].origin} />
        <span className="muted">⇄</span>
        <Iata code={legs[0].destination} />
      </span>
    );
  }
  if (kind === "multi_city") {
    const codes = [
      ...legs.map((l) => l.origin),
      legs[legs.length - 1].destination,
    ];
    return (
      <span className="flight-route">
        {codes.map((code, i) => (
          <span key={`${code ?? "?"}-${i}`}>
            {i > 0 ? <span className="muted"> → </span> : null}
            <Iata code={code} />
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="flight-route">
      <Iata code={legs[0].origin} />
      <span className="muted"> → </span>
      <Iata code={legs[legs.length - 1].destination} />
    </span>
  );
}

function flightDateLabel(legs: LegRow[]): string {
  if (!legs.length) return "—";
  const a = unixDate(legs[0].depart_time);
  const b = unixDate(legs[legs.length - 1].depart_time);
  if (!a) return "—";
  if (!b || a === b) return a;
  return `${a} – ${b}`;
}

function FlightsTable({
  flights,
  legsByFlight,
  selectedFlightId,
  onSelect,
  onContextMenu,
}: {
  flights: Flight[];
  legsByFlight: Map<string, LegRow[]>;
  selectedFlightId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: ReactMouseEvent, flightId: string) => void;
}) {
  return (
    <table className="dense flights">
      <thead>
        <tr>
          <th></th>
          <th>Dates</th>
          <th>Route</th>
          <th>Code</th>
          <th>Purpose</th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {flights.map((f) => {
          const legs = legsByFlight.get(f.id) ?? [];
          return (
            <tr
              key={f.id}
              className={`${selectedFlightId === f.id ? "sel" : ""} row-${f.status}`}
              onClick={() => onSelect(f.id)}
              onContextMenu={(e) => onContextMenu(e, f.id)}
            >
              <td>
                <AirlineMark code={f.airline} />
              </td>
              <td className="num">{flightDateLabel(legs)}</td>
              <td>
                <FlightRoute legs={legs} />
              </td>
              <td className="mono pnr-cell">{f.confirmation_code || "—"}</td>
              <td className="clip purpose-cell">{f.purpose?.trim() || "—"}</td>
              <td>
                <AffBadges
                  company_reimbursable={f.company_reimbursable}
                  company_reimbursed_time={f.company_reimbursed_time}
                  family_business={f.family_business}
                  personal_llc={f.personal_llc}
                />
              </td>
              <td className="leg-state">
                <BookedMark status={f.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Inspector({
  row,
  siblings,
  trips,
  credits,
  dataRev,
  emptyHint,
  onSelectLeg,
  onSaved,
}: {
  row: LegRow | null;
  siblings: LegRow[];
  trips: Trip[];
  credits: TravelCredit[];
  dataRev: number;
  emptyHint: string;
  onSelectLeg: (id: string) => void;
  onSaved: () => void;
}) {
  const flight = (row?.flight ?? {}) as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [portionByLeg, setPortionByLeg] = useState<Record<string, PortionDraft[]>>(
    {},
  );
  const [payments, setPayments] = useState<PayDraft[]>([]);
  const [aff, setAff] = useState<Aff>(null);
  const catalog = useCatalog();
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const flightId = row?.flight_id ?? null;
  const ticketKey = `${flightId ?? ""}:${dataRev}`;
  const [draftKey, setDraftKey] = useState("");
  const portionStamp = siblings
    .map((s) =>
      s.portions
        .map(
          (p) =>
            `${p.id}:${p.depart_time}:${p.arrive_time}:${p.depart_airport}:${p.arrive_airport}:${p.flight_number}`,
        )
        .join(","),
    )
    .join("|");

  if (row && ticketKey !== draftKey) {
    setDraftKey(ticketKey);
    setDraft({ ...flight });
    setAff(affiliationOf(row));
    setPayments(paymentsFromFlight(flight));
  }

  useEffect(() => {
    const next: Record<string, PortionDraft[]> = {};
    for (const s of siblings) {
      next[s.id] = s.portions.map((p) => ({ ...p }));
    }
    setPortionByLeg(next);
  }, [flightId, dataRev, portionStamp]);

  useEffect(() => {
    api.valuations().then(setValuations).catch(() => setValuations([]));
  }, []);

  const portions = row ? (portionByLeg[row.id] ?? row.portions) : [];

  const setPortions = (
    update: PortionDraft[] | ((ps: PortionDraft[]) => PortionDraft[]),
  ) => {
    if (!row) return;
    setPortionByLeg((prev) => {
      const cur = prev[row.id] ?? row.portions.map((p) => ({ ...p }));
      const next = typeof update === "function" ? update(cur) : update;
      return { ...prev, [row.id]: next };
    });
  };

  const dirty = useMemo(() => {
    if (!row) return false;
    const keys = [
      "airline",
      "booked_time",
      "cabin_class",
      "cost",
      "cost_currency",
      "cost_ineligible_for_points",
      "points_cost",
      "purpose",
      "remarks",
      "company_reimbursed_time",
      "confirmation_code",
    ];
    const portionsDirty = siblings.some(
      (s) => !portionsEqual(portionByLeg[s.id] ?? [], s.portions),
    );
    return (
      keys.some((k) => String(draft[k] ?? "") !== String(flight[k] ?? "")) ||
      aff !== affiliationOf(row) ||
      portionsDirty ||
      !paymentsEqual(payments, paymentsFromFlight(flight))
    );
  }, [draft, flight, row, aff, portionByLeg, siblings, payments]);

  const airlineOpts = useMemo(
    () =>
      Object.entries(catalog?.airlines ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );
  const airportOpts = useMemo(
    () =>
      Object.entries(catalog?.airports ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );

  if (!row) {
    return (
      <aside className="inspector empty">
        <p className="muted">{emptyHint}</p>
      </aside>
    );
  }

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const changed = (k: string) => String(draft[k] ?? "") !== String(flight[k] ?? "");
  const num = (k: string) =>
    draft[k] == null || draft[k] === "" ? "" : String(draft[k]);
  const patchPortion = (i: number, patch: Partial<PortionDraft>) => {
    setPortions((ps) => {
      const next = ps.map((p) => ({ ...p }));
      const cur = next[i];
      if (!cur) return ps;
      if (
        patch.arrive_airport !== undefined &&
        next[i + 1] &&
        next[i + 1].depart_airport === cur.arrive_airport
      ) {
        next[i + 1] = { ...next[i + 1], depart_airport: patch.arrive_airport ?? null };
      }
      if (
        patch.depart_airport !== undefined &&
        next[i - 1] &&
        next[i - 1].arrive_airport === cur.depart_airport
      ) {
        next[i - 1] = { ...next[i - 1], arrive_airport: patch.depart_airport ?? null };
      }
      next[i] = { ...cur, ...patch };
      return next;
    });
  };
  const origin = portions[0]?.depart_airport ?? null;
  const destination = portions[portions.length - 1]?.arrive_airport ?? null;
  const showTimes = hasClockTimes(row);
  const pnr = ((draft.confirmation_code as string) || "").trim();
  const pnrUnbooked = !pnr && !flight.booked_time;
  const airlineCode = ((draft.airline as string) || row.airline || "").toUpperCase() || null;
  const pointsValue = cpp(
    draft.cost != null && draft.points_cost
      ? ((draft.cost as number) - Number(draft.cost_ineligible_for_points ?? 0)) /
        Number(draft.points_cost)
      : null,
  );
  const ccy = ((draft.cost_currency as string) || "USD").toUpperCase();
  const pointsAverage = cpp(
    valuations.find((v) => v.airline === airlineCode && v.currency === ccy)?.average ?? null,
  );

  return (
    <aside className="inspector">
      <DatePicker
        variant="plain"
        className="insp-kicker"
        value={unixInputDate(portions[0]?.depart_time ?? row.depart_time)}
        label={unixDate(portions[0]?.depart_time ?? row.depart_time) || "—"}
        onChange={(iso) => setPortions((ps) => applyLegDate(ps, iso))}
      />
      <div className="insp-top">
        <div className="insp-head">
          <AirlineMark code={(draft.airline as string) || row.airline} />
          <div>
            <div className="insp-route">
              <SearchSelect
                className="iata-edit"
                compact
                value={origin}
                label={origin}
                options={airportOpts}
                onChange={(v) => {
                  if (portions.length) patchPortion(0, { depart_airport: v });
                }}
                allowCreate={iata3}
              />
              <span className="insp-route-arrow">→</span>
              <SearchSelect
                className="iata-edit"
                compact
                value={destination}
                label={destination}
                options={airportOpts}
                onChange={(v) => {
                  if (portions.length) patchPortion(portions.length - 1, { arrive_airport: v });
                }}
                allowCreate={iata3}
              />
            </div>
            <input
              className={`insp-pnr${pnrUnbooked ? " unbooked" : ""}`}
              value={pnr}
              placeholder={pnrUnbooked ? "Not yet booked" : "No confirmation"}
              onChange={(e) => set("confirmation_code", e.target.value || null)}
            />
          </div>
        </div>
        <textarea
          className="insp-purpose"
          value={(draft.purpose as string) ?? ""}
          placeholder="Purpose"
          rows={2}
          onChange={(e) => set("purpose", e.target.value || null)}
        />
      </div>

      {siblings.length > 1 ? (
        <ul className="insp-legs">
          {siblings.map((s) => {
            const from = s.origin ?? "—";
            const to = s.destination ?? "—";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={s.id === row.id ? "on" : ""}
                  onClick={() => onSelectLeg(s.id)}
                >
                  <span className="num">{unixDate(s.depart_time) || "—"}</span>
                  <span className="insp-leg-route">
                    {from} → {to}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <RouteMap portions={portions} planned={row.status === "planned"} />
      <ul className="portion-list">
        {portions.map((p, i) => (
          <li key={p.id || i} className="mono">
            <input
              className="fn"
              value={p.flight_number ?? ""}
              placeholder="—"
              onChange={(e) => patchPortion(i, { flight_number: e.target.value || null })}
            />
            <span className="portion-end">
              <SearchSelect
                className="iata-edit"
                compact
                value={p.depart_airport}
                label={p.depart_airport}
                options={airportOpts}
                onChange={(v) => patchPortion(i, { depart_airport: v })}
                allowCreate={iata3}
              />
              {showTimes ? (
                <input
                  type="time"
                  value={unixInputTime(p.depart_time)}
                  onChange={(e) =>
                    patchPortion(i, {
                      depart_time:
                        setPortionHm(p.depart_time, e.target.value, p.depart_time) ??
                        p.depart_time,
                    })
                  }
                />
              ) : null}
            </span>
            <span className="muted">→</span>
            <span className="portion-end">
              <SearchSelect
                className="iata-edit"
                compact
                value={p.arrive_airport}
                label={p.arrive_airport}
                options={airportOpts}
                onChange={(v) => patchPortion(i, { arrive_airport: v })}
                allowCreate={iata3}
              />
              {showTimes ? (
                <input
                  type="time"
                  value={unixInputTime(p.arrive_time)}
                  onChange={(e) =>
                    patchPortion(i, {
                      arrive_time: setPortionHm(p.arrive_time, e.target.value, p.depart_time),
                    })
                  }
                />
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="insp-props">
        <Prop label="Airline" dirty={changed("airline")}>
          <SearchSelect
            value={airlineCode}
            label={airlineCode ? catalog?.airlines[airlineCode]?.name : null}
            options={airlineOpts}
            onChange={(v) => set("airline", v)}
            allowCreate={(q) => (/^[A-Za-z0-9]{2}$/.test(q) ? q.toUpperCase() : null)}
          />
        </Prop>
        <Prop label="Booked" dirty={changed("booked_time")}>
          <DatePicker
            value={unixInputDate(draft.booked_time as number | null)}
            label={unixDate(draft.booked_time as number | null) || "—"}
            onChange={(iso) => set("booked_time", parseInputDate(iso))}
          />
        </Prop>
        <Prop label="Class" dirty={changed("cabin_class")}>
          <input
            value={(draft.cabin_class as string) ?? ""}
            onChange={(e) => set("cabin_class", e.target.value || null)}
            placeholder="—"
          />
        </Prop>
        <Prop label="Cost" dirty={changed("cost") || changed("cost_currency")}>
          <MoneyField
            currency={(draft.cost_currency as string) || "USD"}
            amount={num("cost")}
            onCurrency={(c) => set("cost_currency", c)}
            onAmount={(v) => set("cost", v)}
          />
        </Prop>
        <Prop label="Points" dirty={changed("points_cost")}>
          <input
            type="number"
            value={num("points_cost")}
            onChange={(e) =>
              set("points_cost", e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="—"
          />
        </Prop>
        <div className="prop">
          <span className="prop-k">Value</span>
          <span className="prop-static">{pointsValue || "—"}</span>
        </div>
        <div className="prop">
          <span className="prop-k">Average</span>
          <span className="prop-static">{pointsAverage || "—"}</span>
        </div>
        <PaymentList
          payments={payments}
          credits={credits}
          defaultCurrency={(draft.cost_currency as string) || "USD"}
          dirty={!paymentsEqual(payments, paymentsFromFlight(flight))}
          onChange={setPayments}
        />
        <Prop label="Remarks" dirty={changed("remarks")}>
          <input
            value={(draft.remarks as string) ?? ""}
            onChange={(e) => set("remarks", e.target.value || null)}
            placeholder="—"
          />
        </Prop>
      </div>

      <div className={`aff-row${aff ? " has-sel" : ""}`}>
        {(
          [
            ["spacex", "SpaceX"],
            ["casa", "Casa Gialla"],
            ["pp", "PP"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={aff === id ? "on" : ""}
            onClick={() => setAff((cur) => (cur === id ? null : id))}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={`insp-reimb${aff === "spacex" ? "" : " idle"}`}
        aria-hidden={aff !== "spacex"}
      >
        <Prop label="Reimbursed" dirty={changed("company_reimbursed_time")}>
          <DatePicker
            value={unixInputDate(draft.company_reimbursed_time as number | null)}
            label={unixDate(draft.company_reimbursed_time as number | null) || "—"}
            onChange={(iso) => set("company_reimbursed_time", parseInputDate(iso))}
          />
        </Prop>
      </div>
      <div className="insp-actions">
          <button
            disabled={!dirty}
            onClick={() => {
              setDraft({ ...flight });
              const next: Record<string, PortionDraft[]> = {};
              for (const s of siblings) {
                next[s.id] = s.portions.map((p) => ({ ...p }));
              }
              setPortionByLeg(next);
              setPayments(paymentsFromFlight(flight));
              setAff(affiliationOf(row));
            }}
          >
            Cancel
          </button>
          <button
            className={`primary ${dirty ? "glow" : ""}`}
            disabled={!dirty}
            onClick={async () => {
              const flags = {
                personal_llc: aff === "pp",
                family_business: aff === "casa",
                company_reimbursable: aff === "spacex",
              };
              let tripId = (flight.trip_id as string | null) ?? null;
              if (tripId) {
                const trip = trips.find((t) => t.id === tripId);
                await api.saveTrip(tripId, { ...(trip ?? {}), id: tripId, ...flags });
              } else if (aff) {
                const created = await api.createTrip(flags);
                tripId = created.id;
              }
              await api.saveFlight(row.flight_id, {
                ...flight,
                ...draft,
                id: row.flight_id,
                trip_id: tripId,
                company_reimbursed_time:
                  aff === "spacex" ? draft.company_reimbursed_time : null,
                payments: paymentsForSave(payments),
              });
              for (const s of siblings) {
                for (const p of portionByLeg[s.id] ?? s.portions) {
                  if (!p.id) continue;
                  await api.savePortion(p.id, {
                    id: p.id,
                    flight_leg_id: p.flight_leg_id,
                    depart_time: p.depart_time,
                    arrive_time: p.arrive_time,
                    depart_airport: p.depart_airport,
                    arrive_airport: p.arrive_airport,
                    flight_number: p.flight_number,
                  });
                }
              }
              onSaved();
            }}
          >
            Save
          </button>
        </div>
    </aside>
  );
}

function Prop({
  label,
  children,
  dirty,
}: {
  label: string;
  children: ReactNode;
  dirty?: boolean;
}) {
  return (
    <label className={`prop${dirty ? " dirty" : ""}`}>
      <span className="prop-k">{label}</span>
      {children}
    </label>
  );
}

const CURRENCIES: { code: string; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "PLN", symbol: "zł" },
];

function moneyText(amount: string): string {
  if (amount === "") return "";
  const n = Number(amount);
  return Number.isFinite(n) ? n.toFixed(2) : amount;
}

function MoneyField({
  currency,
  amount,
  onCurrency,
  onAmount,
  deferAmount,
}: {
  currency: string;
  amount: string;
  onCurrency?: (code: string) => void;
  onAmount: (value: number | null) => void;
  /** When set, amount is only committed on blur (not each keystroke). */
  deferAmount?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(moneyText(amount));
  const box = useRef<HTMLDivElement>(null);
  const meta = CURRENCIES.find((c) => c.code === currency) ?? {
    code: currency,
    symbol: currency,
  };

  useEffect(() => {
    if (!focused) setText(moneyText(amount));
  }, [amount, focused]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="money" ref={box}>
      {onCurrency ? (
        <button
          type="button"
          className="money-ccy"
          onClick={() => setOpen((v) => !v)}
          title={meta.code}
        >
          {meta.symbol}
        </button>
      ) : (
        <span className="money-ccy" title={meta.code}>
          {meta.symbol}
        </span>
      )}
      {open && onCurrency ? (
        <ul className="money-menu">
          {CURRENCIES.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                className={c.code === meta.code ? "on" : ""}
                onClick={() => {
                  onCurrency(c.code);
                  setOpen(false);
                }}
              >
                <span>{c.symbol}</span>
                {c.code}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        className="money-amt"
        value={focused ? text : moneyText(amount)}
        placeholder="—"
        onFocus={() => {
          setFocused(true);
          setText(moneyText(amount));
        }}
        onBlur={() => {
          setFocused(false);
          if (text.trim() === "") {
            onAmount(null);
            setText("");
            return;
          }
          const n = Number(text);
          if (Number.isFinite(n)) {
            onAmount(n);
            setText(n.toFixed(2));
          } else setText(moneyText(amount));
        }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (deferAmount) return;
          if (v.trim() === "") onAmount(null);
          else {
            const n = Number(v);
            if (Number.isFinite(n)) onAmount(n);
          }
        }}
      />
    </div>
  );
}

function CreateFlightForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (legId: string, flightId: string) => void;
}) {
  const catalog = useCatalog();
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({
    cost_currency: "USD",
  });
  const [payments, setPayments] = useState<PayDraft[]>([]);
  const [credits, setCredits] = useState<TravelCredit[]>([]);
  const [aff, setAff] = useState<Aff>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [departDate, setDepartDate] = useState("");
  const [departTime, setDepartTime] = useState("");
  const [arriveDate, setArriveDate] = useState("");
  const [arriveTime, setArriveTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.valuations().then(setValuations).catch(() => setValuations([]));
    api.credits().then(setCredits).catch(() => setCredits([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const num = (k: string) =>
    draft[k] == null || draft[k] === "" ? "" : String(draft[k]);

  const airlineOpts = useMemo(
    () =>
      Object.entries(catalog?.airlines ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );
  const airportOpts = useMemo(
    () =>
      Object.entries(catalog?.airports ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );

  const airlineCode = ((draft.airline as string) || "").toUpperCase() || null;
  const ccy = ((draft.cost_currency as string) || "USD").toUpperCase();
  const pointsValue = cpp(
    draft.cost != null && draft.points_cost
      ? ((draft.cost as number) - Number(draft.cost_ineligible_for_points ?? 0)) /
        Number(draft.points_cost)
      : null,
  );
  const pointsAverage = cpp(
    valuations.find((v) => v.airline === airlineCode && v.currency === ccy)?.average ?? null,
  );

  const canCreate = Boolean(from && to && departDate);
  const iataCode = (q: string) => (/^[A-Za-z]{3}$/.test(q) ? q.toUpperCase() : null);

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-flight-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="insp-kicker" id="create-flight-title">
          New flight
        </div>
        <div className="insp-props">
          <Prop label="From">
            <SearchSelect
              value={from}
              label={from ? catalog?.airports[from]?.name : null}
              options={airportOpts}
              onChange={setFrom}
              allowCreate={iataCode}
            />
          </Prop>
          <Prop label="To">
            <SearchSelect
              value={to}
              label={to ? catalog?.airports[to]?.name : null}
              options={airportOpts}
              onChange={setTo}
              allowCreate={iataCode}
            />
          </Prop>
          <Prop label="Depart">
            <div className="prop-pair">
              <DatePicker
                value={departDate}
                label={unixDate(parseInputDate(departDate)) || "—"}
                onChange={setDepartDate}
              />
              <input
                type="time"
                value={departTime}
                onChange={(e) => setDepartTime(e.target.value)}
              />
            </div>
          </Prop>
          <Prop label="Arrive">
            <div className="prop-pair">
              <DatePicker
                value={arriveDate}
                label={unixDate(parseInputDate(arriveDate)) || "—"}
                onChange={setArriveDate}
              />
              <input
                type="time"
                value={arriveTime}
                onChange={(e) => setArriveTime(e.target.value)}
              />
            </div>
          </Prop>
          <Prop label="Flight">
            <input
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="—"
            />
          </Prop>
          <Prop label="Code">
            <input
              value={(draft.confirmation_code as string) ?? ""}
              onChange={(e) => set("confirmation_code", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
          <Prop label="Airline">
            <SearchSelect
              value={airlineCode}
              label={airlineCode ? catalog?.airlines[airlineCode]?.name : null}
              options={airlineOpts}
              onChange={(v) => set("airline", v)}
              allowCreate={(q) => (/^[A-Za-z0-9]{2}$/.test(q) ? q.toUpperCase() : null)}
            />
          </Prop>
          <Prop label="Booked">
            <DatePicker
              value={unixInputDate(draft.booked_time as number | null)}
              label={unixDate(draft.booked_time as number | null) || "—"}
              onChange={(iso) => set("booked_time", parseInputDate(iso))}
            />
          </Prop>
          <Prop label="Class">
            <input
              value={(draft.cabin_class as string) ?? ""}
              onChange={(e) => set("cabin_class", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
          <Prop label="Cost">
            <MoneyField
              currency={(draft.cost_currency as string) || "USD"}
              amount={num("cost")}
              onCurrency={(c) => set("cost_currency", c)}
              onAmount={(v) => set("cost", v)}
            />
          </Prop>
          <Prop label="Points">
            <input
              type="number"
              value={num("points_cost")}
              onChange={(e) =>
                set("points_cost", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder="—"
            />
          </Prop>
          <div className="prop">
            <span className="prop-k">Value</span>
            <span className="prop-static">{pointsValue || "—"}</span>
          </div>
          <div className="prop">
            <span className="prop-k">Average</span>
            <span className="prop-static">{pointsAverage || "—"}</span>
          </div>
          <PaymentList
            payments={payments}
            credits={credits}
            defaultCurrency={(draft.cost_currency as string) || "USD"}
            onChange={setPayments}
          />
          <Prop label="Purpose">
            <input
              value={(draft.purpose as string) ?? ""}
              onChange={(e) => set("purpose", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
          <Prop label="Remarks">
            <input
              value={(draft.remarks as string) ?? ""}
              onChange={(e) => set("remarks", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
        </div>
        <div className={`aff-row${aff ? " has-sel" : ""}`}>
          {(
            [
              ["spacex", "SpaceX"],
              ["casa", "Casa Gialla"],
              ["pp", "PP"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={aff === id ? "on" : ""}
              onClick={() => setAff((cur) => (cur === id ? null : id))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={`insp-reimb${aff === "spacex" ? "" : " idle"}`} aria-hidden={aff !== "spacex"}>
          <Prop label="Reimbursed">
            <DatePicker
              value={unixInputDate(draft.company_reimbursed_time as number | null)}
              label={unixDate(draft.company_reimbursed_time as number | null) || "—"}
              onChange={(iso) => set("company_reimbursed_time", parseInputDate(iso))}
            />
          </Prop>
        </div>
        <div className="insp-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!canCreate || busy}
            onClick={async () => {
              const depart_time = parseInputDateTime(departDate, departTime);
              if (!depart_time || !from || !to) return;
              const arriveDay = arriveDate || (arriveTime ? departDate : "");
              const arrive_time = arriveDay
                ? parseInputDateTime(arriveDay, arriveTime)
                : null;
              setBusy(true);
              try {
                const flags = {
                  personal_llc: aff === "pp",
                  family_business: aff === "casa",
                  company_reimbursable: aff === "spacex",
                };
                let tripId: string | null = null;
                if (aff) {
                  const created = await api.createTrip(flags);
                  tripId = created.id;
                }
                const f = await api.createFlight({
                  ...draft,
                  trip_id: tripId,
                  company_reimbursed_time:
                    aff === "spacex" ? draft.company_reimbursed_time : null,
                  payments: paymentsForSave(payments),
                  portion: {
                    depart_time,
                    arrive_time,
                    depart_airport: from,
                    arrive_airport: to,
                    flight_number: flightNumber.trim() || null,
                  },
                });
                const board = await api.legsBoard();
                const leg = board.find((r) => r.flight_id === f.id);
                onSaved(leg?.id ?? board[board.length - 1]?.id ?? "", f.id);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentList({
  payments,
  credits,
  defaultCurrency,
  dirty,
  onChange,
}: {
  payments: PayDraft[];
  credits: TravelCredit[];
  defaultCurrency: string;
  dirty?: boolean;
  onChange: (next: PayDraft[]) => void;
}) {
  const patch = (i: number, part: Partial<PayDraft>) => {
    onChange(payments.map((p, j) => (j === i ? { ...p, ...part } : p)));
  };
  return (
    <div className={`pay-block${dirty ? " dirty" : ""}`}>
      <span className="prop-k">Payment</span>
      <div className="pay-rows">
        {payments.length === 0 ? <span className="prop-static">—</span> : null}
        {payments.map((p, i) => {
          const credit = credits.find((c) => c.id === p.travel_credit_id);
          const showMoney =
            p.kind === "card" || (p.kind === "travel_credit" && !!credit?.currency);
          const creditOpts = credits
            .filter((c) => c.status === "available" || c.id === p.travel_credit_id)
            .map((c) => ({
              value: c.id,
              name: [c.airline, kindName(CREDIT_KINDS, c.kind), c.code, valueLabel(c)]
                .filter(Boolean)
                .join(" · "),
            }));
          return (
            <div key={p.id} className="pay-row">
              <select
                value={p.kind ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "points") {
                    patch(i, {
                      kind: v,
                      travel_credit_id: null,
                      account_id: null,
                    });
                  } else if (v === "travel_credit") {
                    patch(i, {
                      kind: v,
                      amount: null,
                      account_id: null,
                    });
                  } else {
                    patch(i, {
                      kind: "card",
                      travel_credit_id: null,
                      account_id: p.account_id ?? "",
                    });
                  }
                }}
              >
                {PAYMENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.name}
                  </option>
                ))}
              </select>
              {p.kind === "card" ? (
                <input
                  className="pay-account"
                  value={p.account_id ?? ""}
                  placeholder="Account"
                  onChange={(e) => patch(i, { account_id: e.target.value })}
                />
              ) : null}
              {p.kind === "travel_credit" ? (
                <select
                  className="pay-credit"
                  value={p.travel_credit_id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const c = credits.find((x) => x.id === id);
                    if (!c) {
                      patch(i, { travel_credit_id: id, amount: null });
                      return;
                    }
                    patch(i, {
                      travel_credit_id: id,
                      amount: c.currency ? c.remaining_amount : null,
                    });
                  }}
                >
                  <option value="">Credit…</option>
                  {creditOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : null}
              {p.kind === "points" ? (
                <input
                  type="number"
                  value={p.amount ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    patch(i, {
                      amount: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              ) : showMoney ? (
                <MoneyField
                  currency={
                    p.kind === "travel_credit"
                      ? credit?.currency || defaultCurrency
                      : defaultCurrency
                  }
                  amount={p.amount == null ? "" : String(p.amount)}
                  onAmount={(v) => patch(i, { amount: v })}
                />
              ) : null}
              <button
                type="button"
                className="icon"
                onClick={() => onChange(payments.filter((_, j) => j !== i))}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        <button type="button" className="pay-add" onClick={() => {
          onChange([
            ...payments,
            {
              id: `tmp_${Date.now()}`,
              kind: "card",
              amount: null,
              travel_credit_id: null,
              account_id: "",
              remarks: null,
            },
          ]);
        }}>
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

function CreditDetailEditor({
  credit,
  editing,
  draft,
  onDraftChange,
  onPersist,
  onSaved,
}: {
  credit: TravelCredit;
  editing: boolean;
  draft: CreditDraft;
  onDraftChange: (patch: Partial<CreditDraft>) => void;
  onPersist: (next: CreditDraft) => void | Promise<void>;
  onSaved?: () => void | Promise<void>;
}) {
  const [code, setCode] = useState(credit.code ?? "");
  const [remarks, setRemarks] = useState(credit.remarks ?? "");
  const [viewBusy, setViewBusy] = useState(false);

  useEffect(() => {
    setCode(credit.code ?? "");
    setRemarks(credit.remarks ?? "");
  }, [credit.id, credit.code, credit.remarks]);

  const saveView = async () => {
    const nextCode = code.trim() || null;
    const nextRemarks = remarks.trim() || null;
    if (
      nextCode === (credit.code ?? null) &&
      nextRemarks === (credit.remarks ?? null)
    ) {
      return;
    }
    setViewBusy(true);
    try {
      await api.saveCredit(credit.id, {
        ...creditPayloadFromDraft(creditDraftFrom(credit)),
        code: nextCode,
        remarks: nextRemarks,
      });
      await onSaved?.();
    } finally {
      setViewBusy(false);
    }
  };

  const [extraShown, setExtraShown] = useState(editing);

  useLayoutEffect(() => {
    if (editing) setExtraShown(true);
  }, [editing]);

  useEffect(() => {
    if (editing || !extraShown) return;
    const t = window.setTimeout(() => setExtraShown(false), 400);
    return () => window.clearTimeout(t);
  }, [editing, extraShown]);

  const fields = creditKindFields(draft.kind);
  const num = (v: number | null) => (v == null ? "" : String(v));
  const usedCount = credit.usages.length;
  const remainingUses =
    draft.uses != null ? Math.max(draft.uses - usedCount, 0) : null;
  const commit = (patch: Partial<CreditDraft>, save = false) => {
    const next = { ...draft, ...patch };
    onDraftChange(patch);
    if (save) onPersist(next);
  };

  return (
    <div className="credit-detail" onMouseDown={(e) => e.stopPropagation()}>
      {extraShown ? (
        <div
          className={`credit-edit-extra${editing ? " open" : ""}`}
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (!editing) setExtraShown(false);
          }}
        >
          <div className="credit-edit-extra-inner">
            {fields.showUses ? (
              <div className="credit-detail-row">
                <span className="credit-detail-k">Uses:</span>
                <div className="credit-detail-inline">
                  <input
                    type="number"
                    min={1}
                    value={num(draft.uses)}
                    placeholder={fields.usesRequired ? "1" : "—"}
                    onChange={(e) =>
                      onDraftChange({
                        uses: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      commit(
                        { uses: e.target.value === "" ? null : Number(e.target.value) },
                        true,
                      )
                    }
                  />
                  {remainingUses != null ? (
                    <span className="credit-detail-hint">({remainingUses} remaining)</span>
                  ) : null}
                </div>
              </div>
            ) : null}
            {fields.showValue ? (
              <div className="credit-detail-row">
                <span className="credit-detail-k">
                  {fields.valueIsMax ? "Max value:" : "Original:"}
                </span>
                <MoneyField
                  currency={draft.currency || "USD"}
                  amount={num(draft.original_amount)}
                  deferAmount
                  onCurrency={(c) => commit({ currency: c }, true)}
                  onAmount={(v) => commit({ original_amount: v }, true)}
                />
              </div>
            ) : null}
            {fields.showPercent ? (
              <div className="credit-detail-row">
                <span className="credit-detail-k">% off:</span>
                <input
                  type="number"
                  value={num(draft.percent_off)}
                  placeholder="—"
                  onChange={(e) =>
                    onDraftChange({
                      percent_off: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    commit(
                      {
                        percent_off:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                      true,
                    )
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="credit-detail-row">
        <span className="credit-detail-k">Code:</span>
        <input
          className="mono"
          value={editing ? draft.code : code}
          disabled={!editing && viewBusy}
          placeholder="—"
          onChange={(e) => {
            if (editing) onDraftChange({ code: e.target.value });
            else setCode(e.target.value);
          }}
          onBlur={(e) => {
            if (editing) commit({ code: e.target.value }, true);
            else saveView();
          }}
        />
      </div>
      <div className="credit-detail-row">
        <span className="credit-detail-k">Remarks:</span>
        <textarea
          value={editing ? draft.remarks : remarks}
          disabled={!editing && viewBusy}
          placeholder="Add a remark…"
          rows={2}
          onChange={(e) => {
            if (editing) onDraftChange({ remarks: e.target.value });
            else setRemarks(e.target.value);
          }}
          onBlur={(e) => {
            if (editing) commit({ remarks: e.target.value }, true);
            else saveView();
          }}
        />
      </div>
    </div>
  );
}

function CreditRow({
  credit,
  open,
  editing,
  draft,
  airlineOpts,
  onToggle,
  onDraftChange,
  onPersist,
  onUpdated,
  onContextMenu,
  onAirlinePickerOpenChange,
}: {
  credit: TravelCredit;
  open: boolean;
  editing: boolean;
  draft: CreditDraft;
  airlineOpts: { value: string; name: string }[];
  onToggle: () => void;
  onDraftChange: (patch: Partial<CreditDraft>) => void;
  onPersist: (next: CreditDraft) => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
  onContextMenu: (e: ReactMouseEvent) => void;
  onAirlinePickerOpenChange?: (open: boolean) => void;
}) {
  const [shown, setShown] = useState(open);

  useLayoutEffect(() => {
    if (open) setShown(true);
  }, [open]);

  useEffect(() => {
    if (open || !shown) return;
    const t = window.setTimeout(() => setShown(false), 400);
    return () => window.clearTimeout(t);
  }, [open, shown]);

  const display: TravelCredit = editing
    ? {
        ...credit,
        ...creditPayloadFromDraft(draft),
        remaining_amount: draft.original_amount,
        remaining_uses: draft.uses,
      }
    : credit;

  return (
    <Fragment>
      <tr
        className={`row-${credit.status}${open ? " sel credit-open" : shown ? " credit-closing" : ""}${editing ? " credit-edit" : ""}`}
        onClick={onToggle}
        onContextMenu={onContextMenu}
      >
        <td onClick={(e) => editing && e.stopPropagation()}>
          {editing ? (
            <AirlinePicker
              value={draft.airline}
              options={airlineOpts}
              onOpenChange={onAirlinePickerOpenChange}
              onChange={(v) => {
                const next = { ...draft, airline: v };
                onDraftChange({ airline: v });
                onPersist(next);
              }}
            />
          ) : (
            <AirlineMark code={credit.airline} />
          )}
        </td>
        <td onClick={(e) => editing && e.stopPropagation()}>
          {editing ? (
            <select
              className="credit-kind"
              value={draft.kind}
              onChange={(e) => {
                const next = applyCreditKind(draft, e.target.value || "flight_credit");
                onDraftChange(next);
                onPersist(next);
              }}
            >
              {CREDIT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.name}
                </option>
              ))}
            </select>
          ) : (
            kindName(CREDIT_KINDS, display.kind)
          )}
        </td>
        <td className="num">{valueLabel(display) || "—"}</td>
        <td
          className="num"
          onClick={(e) => editing && e.stopPropagation()}
        >
          {editing ? (
            <DatePicker
              variant="plain"
              value={unixInputDate(draft.expires_at)}
              label={unixDate(draft.expires_at) || "—"}
              onChange={(iso) => {
                const expires_at = parseInputDate(iso);
                const next = { ...draft, expires_at };
                onDraftChange({ expires_at });
                onPersist(next);
              }}
            />
          ) : (
            unixDate(display.expires_at) || "—"
          )}
        </td>
      </tr>
      {shown ? (
        <tr
          className={`credit-remarks-row row-${credit.status}${open ? " open" : " credit-closing"}${editing ? " credit-edit" : ""}`}
        >
          <td colSpan={4}>
            <div
              className="credit-reveal"
              onTransitionEnd={(e) => {
                if (e.target !== e.currentTarget) return;
                if (!open) setShown(false);
              }}
            >
              <div className="credit-reveal-inner">
                <CreditDetailEditor
                  credit={credit}
                  editing={editing}
                  draft={draft}
                  onDraftChange={onDraftChange}
                  onPersist={onPersist}
                  onSaved={onUpdated}
                />
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function CreditsTable({
  rows,
  onUpdated,
  onError,
}: {
  rows: TravelCredit[];
  onUpdated?: () => void | Promise<void>;
  onError?: (msg: string) => void;
}) {
  const catalog = useCatalog();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreditDraft | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: CtxMenuItem[];
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [airlinePickerOpen, setAirlinePickerOpen] = useState(false);

  const airlineOpts = useMemo(
    () =>
      Object.entries(catalog?.airlines ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );

  const startEdit = (credit: TravelCredit) => {
    setOpenId(credit.id);
    setEditId(credit.id);
    setDraft(creditDraftFrom(credit));
  };

  const persistDraft = async (creditId: string, next: CreditDraft) => {
    setDraft(next);
    try {
      await api.saveCredit(creditId, creditPayloadFromDraft(next));
      await onUpdated?.();
    } catch (err) {
      onError?.(String(err));
    }
  };

  useEffect(() => {
    if (!openId) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      const el = t as Element;
      if (el.closest?.(".airline-picker-menu, .search-select-menu, .context-menu, .date-cal, .money-menu")) return;
      if (airlinePickerOpen) return;
      setOpenId(null);
      setEditId(null);
      setDraft(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openId, airlinePickerOpen]);

  const collapse = () => {
    setOpenId(null);
    setEditId(null);
    setDraft(null);
    setAirlinePickerOpen(false);
  };

  return (
    <div
      className="table-wrap"
      ref={wrapRef}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest("tbody tr")) return;
        if (airlinePickerOpen) return;
        if (openId) collapse();
      }}
    >
      <table className="dense credits">
        <thead>
          <tr>
            <th></th>
            <th>Type</th>
            <th>Value</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <CreditRow
              key={r.id}
              credit={r}
              open={openId === r.id}
              editing={editId === r.id}
              draft={draft ?? creditDraftFrom(r)}
              airlineOpts={airlineOpts}
              onToggle={() => {
                if (openId === r.id) {
                  setOpenId(null);
                  setEditId(null);
                  setDraft(null);
                } else {
                  setOpenId(r.id);
                  if (editId && editId !== r.id) {
                    setEditId(null);
                    setDraft(null);
                  }
                }
              }}
              onDraftChange={(patch) =>
                setDraft((d) => ({ ...(d ?? creditDraftFrom(r)), ...patch }))
              }
              onPersist={(next) => persistDraft(r.id, next)}
              onUpdated={onUpdated}
              onAirlinePickerOpenChange={setAirlinePickerOpen}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    {
                      label: "Edit",
                      onClick: () => startEdit(r),
                    },
                    {
                      label: "Delete",
                      danger: true,
                      onClick: async () => {
                        await api.deleteCredit(r.id);
                        if (openId === r.id) {
                          setOpenId(null);
                          setEditId(null);
                          setDraft(null);
                        }
                        await onUpdated?.();
                      },
                    },
                  ],
                });
              }}
            />
          ))}
        </tbody>
      </table>
      <RowContextMenu
        at={ctxMenu ? { x: ctxMenu.x, y: ctxMenu.y } : null}
        onClose={() => setCtxMenu(null)}
        items={(ctxMenu?.items ?? []).map((item) => ({
          ...item,
          onClick: () =>
            Promise.resolve(item.onClick()).catch((err) => onError?.(String(err))),
        }))}
      />
    </div>
  );
}

function CreateCreditForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const catalog = useCatalog();
  const [draft, setDraft] = useState<Record<string, unknown>>({
    kind: "flight_credit",
    currency: "USD",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const num = (k: string) =>
    draft[k] == null || draft[k] === "" ? "" : String(draft[k]);
  const airlineOpts = useMemo(
    () =>
      Object.entries(catalog?.airlines ?? {}).map(([value, a]) => ({
        value,
        name: a.name,
      })),
    [catalog],
  );
  const airlineCode = ((draft.airline as string) || "").toUpperCase() || null;
  const kind = (draft.kind as string) || "flight_credit";
  const fields = creditKindFields(kind);

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>New credit</h2>
        <div className="insp-props">
          <Prop label="Airline">
            <SearchSelect
              value={airlineCode}
              label={airlineCode ? catalog?.airlines[airlineCode]?.name : null}
              options={airlineOpts}
              onChange={(v) => set("airline", v)}
              allowCreate={(q) => (/^[A-Za-z0-9]{2}$/.test(q) ? q.toUpperCase() : null)}
            />
          </Prop>
          <Prop label="Type">
            <select
              value={kind}
              onChange={(e) => {
                const v = e.target.value || "flight_credit";
                setDraft((d) => {
                  const next: Record<string, unknown> = { ...d, kind: v };
                  if (v === "flight_credit") {
                    next.currency = (d.currency as string) || "USD";
                    next.uses = null;
                    next.percent_off = null;
                  } else {
                    if (
                      (v === "companion_certificate" || v === "award") &&
                      d.uses == null
                    ) {
                      next.uses = 1;
                    }
                    if (v === "award") next.percent_off = null;
                    if (v === "discount_code" && d.kind === "flight_credit") {
                      next.uses = null;
                    }
                    if (!next.currency && d.original_amount != null) {
                      next.currency = "USD";
                    }
                  }
                  return next;
                });
              }}
            >
              {CREDIT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.name}
                </option>
              ))}
            </select>
          </Prop>
          {fields.showUses ? (
            <Prop label="Uses">
              <input
                type="number"
                min={1}
                value={num("uses")}
                onChange={(e) =>
                  set("uses", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder={fields.usesRequired ? "1" : "—"}
              />
            </Prop>
          ) : null}
          {fields.showValue ? (
            <Prop label={fields.valueIsMax ? "Max value" : "Original"}>
              <MoneyField
                currency={(draft.currency as string) || "USD"}
                amount={num("original_amount")}
                onCurrency={(c) => set("currency", c)}
                onAmount={(v) => set("original_amount", v)}
              />
            </Prop>
          ) : null}
          {fields.showPercent ? (
            <Prop label="% off">
              <input
                type="number"
                value={num("percent_off")}
                onChange={(e) =>
                  set("percent_off", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder="—"
              />
            </Prop>
          ) : null}
          <Prop label="Expires">
            <DatePicker
              value={unixInputDate(draft.expires_at as number | null)}
              label={unixDate(draft.expires_at as number | null) || "—"}
              onChange={(iso) => set("expires_at", parseInputDate(iso))}
            />
          </Prop>
          <Prop label="Number">
            <input
              value={(draft.code as string) ?? ""}
              onChange={(e) => set("code", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
          <Prop label="Remarks">
            <input
              value={(draft.remarks as string) ?? ""}
              onChange={(e) => set("remarks", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
        </div>
        <div className="insp-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const amount = (draft.original_amount as number | null) ?? null;
                const saved = await api.createCredit({
                  airline: draft.airline || null,
                  kind,
                  original_amount: amount,
                  currency: amount != null ? (draft.currency as string) || "USD" : null,
                  uses:
                    kind === "flight_credit"
                      ? null
                      : fields.usesRequired
                        ? (draft.uses as number | null) ?? 1
                        : (draft.uses as number | null) ?? null,
                  percent_off: fields.showPercent
                    ? (draft.percent_off as number | null) || null
                    : null,
                  expires_at: draft.expires_at || null,
                  code: draft.code || null,
                  remarks: draft.remarks || null,
                });
                onSaved(saved.id);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
