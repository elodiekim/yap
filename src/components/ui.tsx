"use client";

import type { ReactNode } from "react";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className={`grid place-items-center rounded-2xl border-2 border-ink bg-butter shadow-sticker ${
          small ? "size-9 text-lg" : "size-11 text-2xl"
        }`}
      >
        🐣
      </span>
      <span
        className={`font-display font-semibold ${small ? "text-xl" : "text-3xl"}`}
      >
        Yap
      </span>
    </div>
  );
}

export function Card({
  children,
  className = "",
  tint,
}: {
  children: ReactNode;
  className?: string;
  /** Tailwind bg class for a soft coloured card, e.g. "bg-butter-soft". */
  tint?: string;
}) {
  return (
    <section
      className={`rounded-blob border-2 border-line-strong ${
        tint ?? "bg-paper"
      } shadow-sticker ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionLabel({
  step,
  children,
  color = "bg-grass-soft text-grass-ink",
}: {
  step?: number;
  children: ReactNode;
  /** Tailwind bg + text classes for the step chip. */
  color?: string;
}) {
  return (
    <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
      {step !== undefined ? (
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${color}`}
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
    "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold transition-all duration-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lilac disabled:cursor-not-allowed";
  const styles = {
    primary:
      "border-2 border-ink bg-grass px-5 py-2.5 text-paper shadow-[0_4px_0_0_var(--color-grass-ink)] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--color-grass-ink)] disabled:border-line-strong disabled:bg-line disabled:text-faint disabled:shadow-[0_4px_0_0_var(--color-line-strong)]",
    ghost:
      "border-2 border-line-strong bg-paper px-5 py-2.5 text-ink shadow-sticker hover:bg-cream active:translate-y-[2px] active:shadow-none disabled:opacity-50",
    quiet:
      "px-3 py-2 text-sm text-muted underline decoration-line-strong decoration-2 underline-offset-4 hover:text-ink disabled:opacity-50",
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
  tone = "grass",
}: {
  children: ReactNode;
  tone?: "grass" | "coral" | "lilac" | "butter" | "plain";
}) {
  const tones = {
    grass: "bg-grass-soft text-grass-ink border-grass/30",
    coral: "bg-coral-soft text-coral-ink border-coral/30",
    lilac: "bg-lilac-soft text-lilac-ink border-lilac/30",
    butter: "bg-butter-soft text-butter-ink border-butter/50",
    plain: "bg-cream text-muted border-line-strong",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold ${tones}`}
    >
      {children}
    </span>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-grass animate-bounce-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}
