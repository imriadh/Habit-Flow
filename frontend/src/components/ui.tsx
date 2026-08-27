import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "./icons";
import { pct } from "../lib/dates";

/* ------------------------------- progress ring ------------------------------ */

export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = "var(--leaf)",
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setV(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      style={{ width: size, height: size, position: "relative", display: "grid", placeItems: "center" }}
      role="img"
      aria-label={`${Math.round(value * 100)} percent`}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}

/* --------------------------------- bar chart -------------------------------- */

export function Bars({
  data,
  height = 110,
  color = "var(--leaf)",
  highlightColor = "var(--gold)",
}: {
  data: { label: string; value: number | null; highlight?: boolean }[];
  height?: number;
  color?: string;
  highlightColor?: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, [data]);
  return (
    <div>
      <div className="bars-wrap" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-tip">{d.value === null ? "no data" : pct(d.value)}</div>
            <div
              className="bar-rect"
              style={{
                height: on ? `${Math.max(4, (d.value ?? 0) * 100)}%` : "3px",
                background: d.value === null ? "var(--ring-track)" : d.highlight ? highlightColor : color,
                opacity: d.value === null ? 0.7 : d.highlight ? 1 : 0.85,
                transitionDelay: `${i * 45}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="bar-labels">
        {data.map((d, i) => (
          <div key={i} className={`bar-label ${d.highlight ? "hl" : ""}`}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- modal ----------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-card card ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <h2 className="h2">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="row top">
        <div className="tile" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}>
          <Icon name="alert" size={20} />
        </div>
        <p className="txt-s soft">{body}</p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* --------------------------------- controls --------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`switch ${checked ? "on" : ""}`}
    >
      <span className="switch-knob" />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.v}
          role="tab"
          aria-selected={value === o.v}
          className={`seg-btn ${value === o.v ? "on" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- reveal ---------------------------------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.06 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`rv ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------------------------- avatar ---------------------------------- */

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials || "?"}
    </div>
  );
}

/* ---------------------------------- toasts ---------------------------------- */

type ToastKind = "ok" | "warn" | "err" | "info";
interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}

const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const KIND_META: Record<ToastKind, { icon: string; color: string; soft: string }> = {
  ok: { icon: "check", color: "var(--leaf)", soft: "var(--leaf-soft)" },
  warn: { icon: "bell", color: "var(--gold-deep)", soft: "var(--gold-soft)" },
  err: { icon: "alert", color: "var(--coral-deep)", soft: "var(--coral-soft)" },
  info: { icon: "spark", color: "var(--teal-deep)", soft: "var(--teal-soft)" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {items.map((t) => {
          const m = KIND_META[t.kind];
          return (
            <div key={t.id} className="toast-item card">
              <span className="tile tile-s" style={{ background: m.soft, color: m.color }}>
                <Icon name={m.icon} size={16} />
              </span>
              <p className="toast-msg">{t.msg}</p>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* --------------------------------- empty state ------------------------------ */

export function EmptyState({
  icon,
  title,
  sub,
  children,
}: {
  icon: string;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div className="card empty">
      <div className="tile tile-l floaty" style={{ background: "var(--leaf-soft)", color: "var(--leaf-deep)" }}>
        <Icon name={icon} size={26} />
      </div>
      <h3 className="h2">{title}</h3>
      <p className="txt-s muted" style={{ maxWidth: 300 }}>
        {sub}
      </p>
      {children && <div className="mt-s">{children}</div>}
    </div>
  );
}
