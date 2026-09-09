import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { airportPlace, useCatalog } from "./iata";

export function Iata({ code }: { code: string | null | undefined }) {
  if (!code) return <>—</>;
  return (
    <span className="iata" data-iata={code.toUpperCase()}>
      {code}
    </span>
  );
}

export function IataHover() {
  const catalog = useCatalog();
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    side: "above" | "below" | "left" | "right";
    name: string;
    place: string;
  } | null>(null);

  useEffect(() => {
    let timer = 0;
    const hide = () => {
      window.clearTimeout(timer);
      setTip(null);
    };
    const onOver = (e: Event) => {
      const t = e.target as Element | null;
      const airlineEl = t?.closest?.("[data-airline]");
      const iataEl = t?.closest?.("[data-iata]");
      window.clearTimeout(timer);
      if (airlineEl instanceof HTMLElement) {
        const code = (airlineEl.getAttribute("data-airline") ?? "").toUpperCase();
        const name = catalog?.airlines[code]?.name || code;
        if (!name) return;
        timer = window.setTimeout(() => {
          const r = airlineEl.getBoundingClientRect();
          const left = r.left >= 160;
          setTip({
            x: left ? r.left : r.right,
            y: r.top + r.height / 2,
            side: left ? "left" : "right",
            name,
            place: "",
          });
        }, 120);
        return;
      }
      if (!(iataEl instanceof HTMLElement)) return;
      const code = iataEl.getAttribute("data-iata") ?? "";
      const a = catalog?.airports[code];
      if (!a) return;
      timer = window.setTimeout(() => {
        const r = iataEl.getBoundingClientRect();
        const onMap = !!iataEl.closest(".route-map");
        setTip({
          x: r.left + r.width / 2,
          y: onMap ? r.top : r.bottom,
          side: onMap ? "above" : "below",
          name: a.name,
          place: airportPlace(a, catalog?.countries ?? {}),
        });
      }, 120);
    };
    const onOut = (e: Event) => {
      const t = e.target as Element | null;
      const el = t?.closest?.("[data-airline], [data-iata]");
      const next = (e as MouseEvent).relatedTarget as Element | null;
      if (el && next && el.contains(next)) return;
      hide();
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
    };
  }, [catalog]);

  if (!tip) return null;
  return createPortal(
    <div
      className={`iata-tip ${tip.side}`}
      style={{ left: tip.x, top: tip.y }}
    >
      <div className="iata-tip-name">{tip.name}</div>
      {tip.place ? <div className="iata-tip-place">{tip.place}</div> : null}
    </div>,
    document.body,
  );
}
