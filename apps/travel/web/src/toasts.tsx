import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { onApi } from "./api";

type Toast = { id: number; text: string; ok: boolean };

export function Toasts() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    return onApi((e) => {
      n += 1;
      const id = n;
      const text = e.ok
        ? `${e.method} ${e.path} ${e.status}`
        : `${e.method} ${e.path} failed: ${e.error ?? e.status}`;
      setItems((prev) => [...prev, { id, text, ok: e.ok }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
  }, []);
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={t.ok ? "toast ok" : "toast err"}>
          {t.ok ? <CircleCheck size={12} /> : <CircleAlert size={12} />} {t.text}
        </div>
      ))}
    </div>
  );
}
