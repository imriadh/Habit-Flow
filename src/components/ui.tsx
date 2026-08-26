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
  className = "",
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  className?: string;
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
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(value * 100)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
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
      <div className="absolute inset-0 grid place-items-center">{children}</div>
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
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex-1 flex flex-col justify-end h-full">
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-[var(--ink)] px-2 py-0.5 text-[11px] font-semibold text-[var(--bg)] opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap z-10">
              {d.value === null ? "no data" : pct(d.value)}
            </div>
            <div
              className="w-full rounded-t-[6px] rounded-b-[3px] min-h-[3px] transition-all duration-700 ease-out"
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
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] font-semibold tracking-wide ${d.highlight ? "text-[var(--gold-deep)]" : "text-[var(--mut)]"}`}
          >
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
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgba(10,16,11,0.5)]" onClick={onClose} />
      <div className={`modal-in card relative w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4 rounded-t-[14px]">
          <h2 className="disp text-lg font-bold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
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
      <div className="flex items-start gap-3">
        <div className="tile shrink-0" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}>
          <Icon name="alert" size={20} />
        </div>
        <p className="text-sm text-[var(--ink2)]">{body}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
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
      className="relative h-[26px] w-[46px] flex-none rounded-full transition-colors duration-200"
      style={{ background: checked ? "var(--leaf)" : "var(--line2)" }}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: checked ? 23 : 3 }}
      />
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
    <div className="inline-flex rounded-[11px] border border-[var(--line)] bg-[var(--surface2)] p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
            value === o.v
              ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
              : "text-[var(--mut)] hover:text-[var(--ink2)]"
          }`}
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
    <div
      className="disp grid flex-none place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "linear-gradient(135deg, var(--leaf) 0%, var(--teal) 100%)",
      }}
      aria-hidden="true"
    >
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
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
        {items.map((t) => {
          const m = KIND_META[t.kind];
          return (
            <div key={t.id} className="toast-in card pointer-events-auto flex items-center gap-3 px-4 py-3">
              <span className="tile !h-8 !w-8 !rounded-lg" style={{ background: m.soft, color: m.color }}>
                <Icon name={m.icon} size={16} />
              </span>
              <p className="text-[13px] font-semibold leading-snug text-[var(--ink)]">{t.msg}</p>
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
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="tile floaty !h-14 !w-14 !rounded-2xl" style={{ background: "var(--leaf-soft)", color: "var(--leaf-deep)" }}>
        <Icon name={icon} size={26} />
      </div>
      <h3 className="disp text-lg font-bold">{title}</h3>
      <p className="max-w-xs text-sm text-[var(--mut)]">{sub}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
