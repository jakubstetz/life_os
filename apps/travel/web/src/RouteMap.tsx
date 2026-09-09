import L from "leaflet";
import { useEffect, useRef } from "react";
import type { LegRow } from "./api";
import { durationHm, unixHm } from "./fmt";
import { useCatalog, type Airport } from "./iata";
import "leaflet/dist/leaflet.css";

type TileCfg = { url: string; subdomains: string | null };
type Portion = LegRow["portions"][number];
type Stop = {
  code: string;
  latlng: [number, number];
  arrive: number | null;
  depart: number | null;
  layoverMin: number | null;
};

function coords(airports: Record<string, Airport>, code: string | null): [number, number] | null {
  if (!code) return null;
  const a = airports[code.toUpperCase()];
  return a ? [a.lat, a.lon] : null;
}

function stopsFromPortions(
  portions: Portion[],
  airports: Record<string, Airport>,
): Stop[] {
  if (portions.length === 0) return [];
  const stops: Stop[] = [];
  const origin = portions[0].depart_airport;
  const originAt = coords(airports, origin);
  if (origin && originAt) {
    stops.push({
      code: origin,
      latlng: originAt,
      arrive: null,
      depart: portions[0].depart_time ?? null,
      layoverMin: null,
    });
  }
  for (let i = 0; i < portions.length; i++) {
    const p = portions[i];
    const code = p.arrive_airport;
    const at = coords(airports, code);
    if (!code || !at) continue;
    const next = portions[i + 1];
    const arrive = p.arrive_time ?? null;
    const depart = next ? (next.depart_time ?? null) : null;
    let layoverMin: number | null = null;
    if (next && arrive != null && depart != null) {
      layoverMin = (depart - arrive) / 60;
    }
    stops.push({ code, latlng: at, arrive, depart, layoverMin });
  }
  return stops;
}

function ico(kind: "arrive" | "depart" | "lay"): string {
  const svg = (inner: string) =>
    `<svg class="ap-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ground = '<path d="M2 22h20"/>';
  const plane = (d: string) =>
    `<g transform="translate(0 -1.6)"><g transform="translate(12 21) scale(0.78) translate(-12 -21)"><path d="${d}"/></g></g>`;
  if (kind === "arrive")
    return svg(
      `${ground}${plane("M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z")}`,
    );
  if (kind === "depart")
    return svg(
      `${ground}${plane("M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z")}`,
    );
  return svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
}

function pinHtml(stop: Stop, planned: boolean): string {
  const lines = [`<div class="ap-code iata" data-iata="${stop.code}">${stop.code}</div>`];
  if (!planned) {
    const a = unixHm(stop.arrive);
    if (a) lines.push(`<div class="ap-meta">${ico("arrive")}<span>${a}</span></div>`);
    const l = durationHm(stop.layoverMin);
    if (l) lines.push(`<div class="ap-meta">${ico("lay")}<span>${l}</span></div>`);
    const d = unixHm(stop.depart);
    if (d) lines.push(`<div class="ap-meta">${ico("depart")}<span>${d}</span></div>`);
  }
  return `<div class="ap-pin"><span class="ap-dot"></span><div class="ap-label">${lines.join("")}</div></div>`;
}

function cssToken(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function addSegmentArrows(map: L.Map, latlngs: L.LatLngExpression[]) {
  for (let i = 0; i < latlngs.length - 1; i++) {
    const a = L.latLng(latlngs[i]);
    const b = L.latLng(latlngs[i + 1]);
    const p1 = map.latLngToLayerPoint(a);
    const p2 = map.latLngToLayerPoint(b);
    if (p1.distanceTo(p2) < 24) continue;
    const mid = map.layerPointToLatLng(L.point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2));
    const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
    L.marker(mid, {
      icon: L.divIcon({
        className: "route-arrow",
        html: `<div class="route-arrow-rot" style="transform:rotate(${angle}deg)"><svg viewBox="0 0 14 10" aria-hidden="true"><path d="M1 1 L13 5 L1 9 Z"/></svg></div>`,
        iconSize: [14, 10],
        iconAnchor: [7, 5],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
  }
}

/** Horizontal pad 0.168 = 30% tighter than the previous 0.24. */
function routeBounds(latlngs: L.LatLngExpression[]): L.LatLngBounds {
  const b = L.latLngBounds(latlngs);
  const dLat = Math.max(b.getNorth() - b.getSouth(), 0.8);
  const dLng = Math.max(b.getEast() - b.getWest(), 0.8);
  return L.latLngBounds(
    [b.getSouth() - dLat * 0.4, b.getWest() - dLng * 0.168],
    [b.getNorth() + dLat * 0.4, b.getEast() + dLng * 0.168],
  );
}

export function RouteMap({
  portions,
  planned = false,
}: {
  portions: LegRow["portions"];
  planned?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const catalog = useCatalog();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const stops = stopsFromPortions(portions, catalog?.airports ?? {});

    (async () => {
      const cfg: TileCfg = await fetch("/api/map-config").then((r) => r.json());
      if (cancelled || !ref.current) return;

      mapRef.current?.remove();
      const map = L.map(el, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        tapHold: false,
        zoomSnap: 0.25,
      });
      mapRef.current = map;
      const layerOpts: L.TileLayerOptions = {};
      if (cfg.subdomains) layerOpts.subdomains = cfg.subdomains;
      L.tileLayer(cfg.url, layerOpts).addTo(map);

      if (stops.length === 0) {
        map.setView([20, 0], 1);
      } else {
        const latlngs = stops.map((s) => s.latlng);
        L.polyline(latlngs, {
          color: cssToken("--accent", "#1e7ab6"),
          weight: 2,
          opacity: 0.9,
          dashArray: planned ? "6 7" : undefined,
          interactive: false,
        }).addTo(map);
        for (const s of stops) {
          L.marker(s.latlng, {
            icon: L.divIcon({
              className: "ap-marker",
              html: pinHtml(s, planned),
              iconSize: [80, 68],
              iconAnchor: [40, 4],
            }),
            interactive: false,
            keyboard: false,
          }).addTo(map);
        }
        map.fitBounds(routeBounds(latlngs), {
          paddingTopLeft: [3, 10],
          paddingBottomRight: [3, 52],
          animate: false,
        });
      }
      window.setTimeout(() => {
        if (cancelled || mapRef.current !== map) return;
        map.invalidateSize({ animate: false });
        if (stops.length >= 2) addSegmentArrows(map, stops.map((s) => s.latlng));
      }, 50);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [portions, catalog, planned]);

  return <div className="route-map" ref={ref} />;
}
