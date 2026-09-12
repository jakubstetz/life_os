import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from "react";

export function Modal({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  children: (dismiss: () => void) => ReactNode;
}) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onScrimTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!closing || e.target !== scrimRef.current || e.propertyName !== "opacity") return;
    onClose();
  };

  return (
    <div
      ref={scrimRef}
      className={`modal-scrim${open ? " open" : ""}${closing ? " closing" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      onTransitionEnd={onScrimTransitionEnd}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children(dismiss)}
      </div>
    </div>
  );
}
