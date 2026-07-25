"use client";

import type { ReactNode } from "react";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`font-semibold tracking-tight text-ink ${
        small ? "text-lg" : "text-2xl"
      }`}
    >
      Yap
      <span className="text-accent">.</span>
    </span>
  );
}

/** English label with the Korean reading underneath it. */
export function Bi({
  en,
  ko,
  className = "",
}: {
  en: string;
  ko: string;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="block">{en}</span>
      <span className="ko mt-0.5 block font-normal text-muted">{ko}</span>
    </span>
  );
}

export function Card({
  children,
  className = "",
  tone,
}: {
  children: ReactNode;
  className?: string;
  /** Optional soft background, e.g. "bg-accent-soft". */
  tone?: string;
}) {
  return (
    <section
      className={`rounded-card border border-hair ${
        tone ?? "bg-card"
      } shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionLabel({
  step,
  en,
  ko,
}: {
  step?: number;
  en: string;
  ko: string;
}) {
  return (
    <h3 className="flex items-baseline gap-2 text-[15px] font-semibold text-ink">
      {step !== undefined ? (
        <span className="text-[13px] font-medium tabular-nums text-faint">
          {step}
        </span>
      ) : null}
      <span>
        {en}
        <span className="ko ml-2 font-normal text-muted">{ko}</span>
      </span>
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
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-[14px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed";
  const styles = {
    primary:
      "bg-accent px-4 py-2.5 text-white hover:bg-accent/90 disabled:bg-hair-strong disabled:text-faint",
    ghost:
      "border border-hair-strong bg-card px-4 py-2.5 text-ink hover:bg-sunk disabled:opacity-50",
    quiet: "px-2 py-1.5 text-muted hover:text-ink disabled:opacity-50",
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

/** Quiet metadata, not a coloured badge. */
export function Meta({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] ${
        accent ? "font-medium text-accent" : "text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1 rounded-full bg-accent animate-pulse-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}
