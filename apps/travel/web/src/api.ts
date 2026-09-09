export type Flight = {
  id: string;
  trip_id: string | null;
  trip_name: string | null;
  airline: string | null;
  booked_time: number | null;
  cancelled_time: number | null;
  cabin_class: string | null;
  cost: number | null;
  cost_currency: string | null;
  cost_ineligible_for_points: number | null;
  points_cost: number | null;
  purchase_method: string | null;
  purpose: string | null;
  confirmation_code: string | null;
  remarks: string | null;
  company_reimbursed_time: number | null;
  origin: string | null;
  destination: string | null;
  first_depart_time: number | null;
  last_arrive_time: number | null;
  routing: string | null;
  stops: number;
  status: string;
  itinerary_type: string | null;
  points_value: number | null;
  personal_llc: boolean;
  family_business: boolean;
  company_reimbursable: boolean;
};

export type Layover =
  | { kind: "none" }
  | { kind: "multiple" }
  | { kind: "one"; airport: string | null; minutes: number | null; until: number | null };

export type LegRow = {
  id: string;
  flight_id: string;
  remarks: string | null;
  origin: string | null;
  destination: string | null;
  depart_time: number | null;
  arrive_time: number | null;
  layover: Layover;
  portions: {
    id: string;
    flight_leg_id: string;
    depart_time: number;
    arrive_time: number | null;
    depart_airport: string | null;
    arrive_airport: string | null;
    flight_number: string | null;
  }[];
  airline: string | null;
  confirmation_code: string | null;
  flight: Record<string, unknown>;
  trip_name: string | null;
  personal_llc: boolean;
  family_business: boolean;
  company_reimbursable: boolean;
  company_reimbursed_time: number | null;
  status: string;
};

export type Portion = {
  id: string;
  flight_leg_id: string;
  flight_id: string;
  depart_time: number;
  arrive_time: number | null;
  depart_airport: string | null;
  arrive_airport: string | null;
  flight_number: string | null;
  operated_by: string | null;
  layover_minutes: number | null;
};

export type Trip = {
  id: string;
  name: string | null;
  remarks: string | null;
  personal_llc: number;
  family_business: number;
  company_reimbursable: number;
};

export type Valuation = {
  program_id: string;
  kind: string;
  name: string;
  airline: string | null;
  currency: string;
  average: number;
  min_amount: number;
  max_amount: number;
  relative_spread: number;
  last_checked: number;
};

type ApiEvent = {
  method: string;
  path: string;
  ok: boolean;
  status: number;
  error?: string;
};

export function onApi(handler: (e: ApiEvent) => void): () => void {
  const fn = (ev: Event) => handler((ev as CustomEvent<ApiEvent>).detail);
  window.addEventListener("lifeos-api", fn);
  return () => window.removeEventListener("lifeos-api", fn);
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let ok = false;
  let status = 0;
  let error: string | undefined;
  try {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    ok = res.ok;
    if (!res.ok) {
      const text = await res.text();
      error = text || res.statusText;
      throw new Error(`${method} ${path} → ${res.status} ${error}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (!error) error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    window.dispatchEvent(
      new CustomEvent<ApiEvent>("lifeos-api", {
        detail: { method, path, ok, status, error },
      }),
    );
  }
}

export const api = {
  flights: () => req<Flight[]>("GET", "/api/flights"),
  flight: (id: string) => req<Flight>("GET", `/api/flights/${id}`),
  saveFlight: (id: string, body: Record<string, unknown>) =>
    req<Flight>("PUT", `/api/flights/${id}`, body),
  createFlight: (body: Record<string, unknown>) => req<Flight>("POST", "/api/flights", body),
  plannedStub: (body: {
    depart_time: number;
    from_airport: string;
    to_airport: string;
    trip_id?: string | null;
  }) => req<Flight>("POST", "/api/flights/planned-stub", body),
  book: (id: string) => req<Flight>("POST", `/api/flights/${id}/book`, {}),
  cancel: (id: string) => req<Flight>("POST", `/api/flights/${id}/cancel`, {}),
  reimbursed: (id: string, company_reimbursed_time: number | null) =>
    req<Flight>("POST", `/api/flights/${id}/reimbursed`, { company_reimbursed_time }),
  legsBoard: () => req<LegRow[]>("GET", "/api/legs"),
  portions: (flightId: string) => req<Portion[]>("GET", `/api/flights/${flightId}/portions`),
  legs: (flightId: string) =>
    req<{ id: string }[]>("GET", `/api/flights/${flightId}/legs`),
  savePortion: (id: string, body: Record<string, unknown>) =>
    req<Portion>("PUT", `/api/portions/${id}`, body),
  addPortion: (legId: string, body: Record<string, unknown>) =>
    req<Portion>("POST", `/api/legs/${legId}/portions`, body),
  addLeg: (flightId: string) => req<unknown>("POST", `/api/flights/${flightId}/legs`, {}),
  trips: () => req<Trip[]>("GET", "/api/trips"),
  saveTrip: (id: string, body: Record<string, unknown>) =>
    req<Trip>("PUT", `/api/trips/${id}`, body),
  createTrip: (body: Record<string, unknown>) => req<Trip>("POST", "/api/trips", body),
  valuations: () => req<Valuation[]>("GET", "/api/valuations"),
};
