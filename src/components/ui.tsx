import type { ReactNode } from "react";
import { AlertTriangle, Beaker, Clock, Info, Radio } from "lucide-react";
import type { DataMode, ImpactLevel } from "@/lib/types";
import { impactLabel } from "@/lib/format";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: typeof Radio;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("min-w-0 rounded-2xl border border-line bg-surface", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 pt-4">
          {title && (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              {Icon && (
                <Icon className="size-4 text-teal" aria-hidden />
              )}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className={cx("px-5 pb-5", title || action ? "pt-3" : "pt-5")}>{children}</div>
    </section>
  );
}

const modeStyle: Record<DataMode, { cls: string; label: string; Icon: typeof Radio }> = {
  LIVE: { cls: "bg-live-soft text-live", label: "LIVE", Icon: Radio },
  STALE: { cls: "bg-stale-soft text-stale", label: "STALE", Icon: Clock },
  SIMULATION: { cls: "bg-sim-soft text-sim-ink", label: "SIMULASI", Icon: Beaker },
};

export function ModeBadge({ mode }: { mode: DataMode }) {
  const { cls, label, Icon } = modeStyle[mode];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", cls)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

const impactStyle: Record<ImpactLevel, string> = {
  low: "bg-live-soft text-live",
  moderate: "bg-stale-soft text-stale",
  high: "bg-warn-soft text-warn",
  extreme: "bg-danger-soft text-danger",
};

export function ImpactBadge({ level }: { level: ImpactLevel }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", impactStyle[level])}>
      <AlertTriangle className="size-3.5" aria-hidden />
      Dampak {impactLabel[level]}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "teal" | "warn" | "danger" | "ok" | "sim";
}) {
  const dots = {
    neutral: null,
    teal: "bg-teal",
    warn: "bg-warn",
    danger: "bg-danger",
    ok: "bg-live",
    sim: "bg-sim",
  };
  const dot = dots[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      {dot && <span className={cx("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />}
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-teal text-white hover:bg-teal-deep disabled:bg-slate-300",
    secondary: "border border-line bg-surface text-ink hover:bg-canvas disabled:opacity-50",
    ghost: "text-ink-soft hover:bg-canvas",
    danger: "bg-danger text-white hover:bg-red-800 disabled:bg-slate-300",
  };
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "block min-h-10 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-teal";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "sim";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-teal-soft text-ink-soft [&>svg]:text-teal",
    warn: "bg-stale-soft text-ink-soft [&>svg]:text-stale",
    sim: "bg-sim-soft text-ink-soft [&>svg]:text-sim-ink",
  };
  return (
    <div className={cx("flex gap-2 rounded-lg px-3 py-2.5 text-sm", tones[tone])}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("size-3.5 shrink-0", className)}
      aria-hidden
    >
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  );
}
