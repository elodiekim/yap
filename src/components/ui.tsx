"use client";

import type { ReactNode } from "react";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`grid place-items-center rounded-xl bg-mint/15 ring-1 ring-mint/30 ${
          small ? "size-8 text-base" : "size-10 text-xl"
        }`}
      >
        💬
      </span>
      <span className={`font-semibold tracking-tight ${small ? "text-lg" : "text-2xl"}`}>
        Yap
      </span>
    </div>
  );
}

export function Card({
  children,
  className = "",
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface/70 backdrop-blur-sm ${className}`}
    >
      {accent ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      ) : null}
      {children}
    </section>
  );
}

export function SectionLabel({
  step,
  children,
  color = "var(--color-mint)",
}: {
  step?: number;
  children: ReactNode;
  color?: string;
}) {
  return (
    <h3 className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
      {step !== undefined ? (
        <span
          className="grid size-5 place-items-center rounded-md text-[11px] font-bold"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
        >
          {step}
        </span>
      ) : null}
      {children}
    </h3>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "quiet";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint";
  const styles = {
    primary:
      "bg-mint text-ink hover:bg-mint/90 active:scale-[0.98] shadow-[0_0_0_1px_rgba(94,234,212,0.25),0_8px_24px_-12px_rgba(94,234,212,0.6)]",
    ghost:
      "border border-line bg-surface-2 text-fg hover:border-line/80 hover:bg-surface-2/70 active:scale-[0.98]",
    quiet: "text-muted hover:text-fg",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = "mint",
}: {
  children: ReactNode;
  tone?: "mint" | "amber" | "violet" | "muted";
}) {
  const tones = {
    mint: "bg-mint/12 text-mint ring-mint/25",
    amber: "bg-amber/12 text-amber ring-amber/25",
    violet: "bg-violet/12 text-violet ring-violet/25",
    muted: "bg-white/5 text-muted ring-white/10",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones}`}
    >
      {children}
    </span>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-mint animate-breathe"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}
