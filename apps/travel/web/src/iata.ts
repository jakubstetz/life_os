/** Client catalog from GET /api/ref/catalog. Sources: ``apps/travel/domain/iata.py``. */
import { useEffect, useState } from "react";

export type Airport = {
  name: string;
  city: string | null;
  country: string | null;
  region: string | null;
  lat: number;
  lon: number;
};
export type Airline = { name: string };
export type Catalog = {
  airports: Record<string, Airport>;
  airlines: Record<string, Airline>;
  countries: Record<string, string>;
};

const STATE_COUNTRIES = new Set(["US", "CA", "AU", "MX"]);

/** City + state (US/CA/AU/MX) or city + country. */
export function airportPlace(a: Airport, countries: Record<string, string> = {}): string {
  const city = a.city ?? "";
  const cc = (a.country ?? "").toUpperCase();
  let admin = "";
  if (STATE_COUNTRIES.has(cc) && a.region && a.region.includes("-")) {
    admin = a.region.split("-")[1] ?? "";
  } else {
    admin = countries[cc] || cc;
  }
  return [city, admin].filter(Boolean).join(", ");
}

let pending: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (!pending) {
    pending = fetch("/api/ref/catalog").then((r) => {
      if (!r.ok) throw new Error(`catalog ${r.status}`);
      return r.json();
    });
  }
  return pending;
}

export function useCatalog(): Catalog | null {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    let live = true;
    loadCatalog()
      .then((c) => {
        if (live) setCatalog(c);
      })
      .catch(() => {
        if (live) setCatalog({ airports: {}, airlines: {}, countries: {} });
      });
    return () => {
      live = false;
    };
  }, []);
  return catalog;
}
