import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type LegRow, type Trip, type Valuation } from "./api";
import { Iata } from "./AirportCode";
import { useCatalog } from "./iata";
import { RouteMap } from "./RouteMap";
import { DatePicker } from "./DatePicker";
import { SearchSelect } from "./SearchSelect";
import {
  cpp,
  layoverLabel,
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

function hasClockTimes(r: LegRow): boolean {
  return r.status !== "planned" && r.flight?.booked_time != null;
}

export function Travel() {
  const [rows, setRows] = useState<LegRow[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stubOpen, setStubOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [board, t] = await Promise.all([api.legsBoard(), api.trips()]);
    setRows(board);
    setTrips(t);
  }, []);

  useEffect(() => {
    reload().catch((e) => setErr(String(e)));
  }, [reload]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
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
    <div className="workspace">
      <div className="board">
        <div className="board-head">
          <div className="tabs">
            {TABS.map((name) => (
              <button
                key={name}
                className={name === "Flight legs" ? "on" : ""}
                disabled={name !== "Flight legs"}
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
          <table className="dense legs">
            <thead>
              <tr>
                <th></th>
                <th>Date</th>
                <th>Depart</th>
                <th>Arrive</th>
                <th>Layover</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`${selectedId === r.id ? "sel" : ""} row-${r.status}`}
                  onClick={() => setSelectedId(r.id)}
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
                  <td>
                    <LayoverCell
                      layover={r.layover}
                      airportOpts={airportOpts}
                      onAirport={
                        r.portions.length === 2
                          ? (code) => {
                              const next = r.portions.map((p) => ({ ...p }));
                              next[0] = { ...next[0], arrive_airport: code };
                              next[1] = { ...next[1], depart_airport: code };
                              commitPortions(r, next);
                            }
                          : undefined
                      }
                    />
                  </td>
                  <td className="leg-state">
                    {r.status === "booked" ? <span className="leg-booked">booked</span> : null}
                  </td>
                  <td className="badges">
                    {r.company_reimbursable && (
                      <span
                        className={`badge-sx ${r.company_reimbursed_time ? "filed" : "unfiled"}`}
                        title={
                          r.company_reimbursed_time
                            ? "Reimbursement filed"
                            : "Reimbursable — not filed"
                        }
                      >
                        <img src="/badges/spacex.svg" alt="SpaceX" />
                      </span>
                    )}
                    {r.family_business && (
                      <span className="badge avo" title="Family business">
                        🥑
                      </span>
                    )}
                    {r.personal_llc && (
                      <span className="badge pp" title="Personal LLC">
                        PP
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Inspector
        row={selected}
        trips={trips}
        onSaved={async () => {
          await reload();
        }}
      />

    </div>
      {stubOpen && (
        <CreateFlightForm
          onClose={() => setStubOpen(false)}
          onSaved={async (id) => {
            setStubOpen(false);
            await reload();
            setSelectedId(id);
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

function Inspector({
  row,
  trips,
  onSaved,
}: {
  row: LegRow | null;
  trips: Trip[];
  onSaved: () => void;
}) {
  const flight = (row?.flight ?? {}) as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [portions, setPortions] = useState<PortionDraft[]>([]);
  const [aff, setAff] = useState<Aff>(null);
  const catalog = useCatalog();
  const [valuations, setValuations] = useState<Valuation[]>([]);

  useEffect(() => {
    if (!row) return;
    setDraft({ ...flight });
    setAff(affiliationOf(row));
  }, [row?.id, row?.flight]);

  useEffect(() => {
    if (!row) return;
    setPortions(row.portions.map((p) => ({ ...p })));
  }, [row?.id, row?.portions]);

  useEffect(() => {
    api.valuations().then(setValuations).catch(() => setValuations([]));
  }, []);

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
      "purchase_method",
      "purpose",
      "remarks",
      "company_reimbursed_time",
      "confirmation_code",
    ];
    return (
      keys.some((k) => String(draft[k] ?? "") !== String(flight[k] ?? "")) ||
      aff !== affiliationOf(row) ||
      !portionsEqual(portions, row.portions)
    );
  }, [draft, flight, row, aff, portions]);

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
        <p className="muted">Select a flight leg</p>
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
  const pnrUnbooked = !pnr && row.status === "planned";
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
        <Prop label="Payment" dirty={changed("purchase_method")}>
          <input
            value={(draft.purchase_method as string) ?? ""}
            onChange={(e) => set("purchase_method", e.target.value || null)}
            placeholder="—"
          />
        </Prop>
        <Prop label="Purpose" dirty={changed("purpose")}>
          <input
            value={(draft.purpose as string) ?? ""}
            onChange={(e) => set("purpose", e.target.value || null)}
            placeholder="—"
          />
        </Prop>
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
              setPortions(row.portions.map((p) => ({ ...p })));
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
              });
              for (const p of portions) {
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
}: {
  currency: string;
  amount: string;
  onCurrency: (code: string) => void;
  onAmount: (value: number | null) => void;
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
      <button
        type="button"
        className="money-ccy"
        onClick={() => setOpen((v) => !v)}
        title={meta.code}
      >
        {meta.symbol}
      </button>
      {open && (
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
      )}
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
  onSaved: (legId: string) => void;
}) {
  const catalog = useCatalog();
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({
    cost_currency: "USD",
  });
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
          <Prop label="PNR">
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
          <Prop label="Payment">
            <input
              value={(draft.purchase_method as string) ?? ""}
              onChange={(e) => set("purchase_method", e.target.value || null)}
              placeholder="—"
            />
          </Prop>
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
                onSaved(leg?.id ?? board[board.length - 1]?.id);
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
