"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sepButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 border font-medium uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-1 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35",
  {
    variants: {
      variant: {
        primary:
          "border-[var(--sep-ui-accent)] bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-efd6a8))] shadow-[0_0_14px_color-mix(in_srgb,var(--sep-ui-accent)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--sep-ui-accent)_12%,rgb(var(--sep-colour-21170f)))]",
        secondary:
          "border-[color-mix(in_srgb,var(--sep-ui-accent)_42%,transparent)] bg-[rgb(var(--sep-colour-17110d))] text-[rgb(var(--sep-colour-dfc79c))] hover:border-[color-mix(in_srgb,var(--sep-ui-accent)_68%,transparent)]",
        subtle:
          "border-[color-mix(in_srgb,var(--sep-ui-accent)_28%,transparent)] bg-transparent text-[rgb(var(--sep-colour-bba27c))] hover:border-[color-mix(in_srgb,var(--sep-ui-accent)_48%,transparent)] hover:bg-[rgb(var(--sep-colour-17110d))]",
        destructive:
          "border-[rgba(185,66,66,0.72)] bg-[rgba(78,18,18,0.48)] text-[rgb(239_170_160)] hover:border-[rgb(215_91_91)] hover:bg-[rgba(100,22,22,0.58)]",
      },
      size: {
        sm: "min-h-8 px-3 py-2 text-[7px] tracking-[0.16em]",
        md: "min-h-9 px-4 py-2.5 text-[7px] tracking-[0.18em]",
        lg: "min-h-10 px-5 py-3 text-[8px] tracking-[0.2em]",
        icon: "h-9 w-9 p-0 text-[12px] tracking-normal",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export type SepButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof sepButtonVariants> & {
    accent?: string;
    asChild?: boolean;
  };

export const SepButton = React.forwardRef<HTMLButtonElement, SepButtonProps>(
  ({ accent = "#b68b4f", asChild = false, variant, size, className, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(sepButtonVariants({ variant, size }), className)}
        style={
          {
            "--sep-ui-accent": accent,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      />
    );
  },
);

SepButton.displayName = "SepButton";

export type SepIconButtonProps = Omit<SepButtonProps, "size">;

export const SepIconButton = React.forwardRef<HTMLButtonElement, SepIconButtonProps>(
  (props, ref) => <SepButton ref={ref} size="icon" {...props} />,
);

SepIconButton.displayName = "SepIconButton";

export type SepNoticeTone = "success" | "error" | "warning" | "info";

const noticeTone = {
  success: {
    label: "Success",
    border: "color-mix(in srgb, var(--sep-ui-accent) 55%, transparent)",
    background: "color-mix(in srgb, var(--sep-ui-accent) 8%, rgb(var(--sep-colour-100c09)))",
    marker: "var(--sep-ui-accent)",
    title: "var(--sep-ui-accent)",
    body: "rgb(var(--sep-colour-d4bd94))",
  },
  error: {
    label: "Error",
    border: "rgba(185, 66, 66, 0.72)",
    background: "rgba(78, 18, 18, 0.48)",
    marker: "rgb(190 72 72)",
    title: "rgb(224 117 117)",
    body: "rgb(239 170 160)",
  },
  warning: {
    label: "Warning",
    border: "rgba(190, 142, 62, 0.66)",
    background: "rgba(82, 58, 18, 0.42)",
    marker: "rgb(197 151 74)",
    title: "rgb(220 180 108)",
    body: "rgb(var(--sep-colour-d4bd94))",
  },
  info: {
    label: "Notice",
    border: "color-mix(in srgb, var(--sep-ui-accent) 34%, transparent)",
    background: "rgb(var(--sep-colour-100c09))",
    marker: "color-mix(in srgb, var(--sep-ui-accent) 72%, transparent)",
    title: "rgb(var(--sep-colour-bba27c))",
    body: "rgb(var(--sep-colour-a99575))",
  },
} satisfies Record<SepNoticeTone, {
  label: string;
  border: string;
  background: string;
  marker: string;
  title: string;
  body: string;
}>;

export function SepNotice({
  tone = "info",
  title,
  accent = "#b68b4f",
  children,
  className,
}: {
  tone?: SepNoticeTone;
  title?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const treatment = noticeTone[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("border px-3 py-2.5", className)}
      style={
        {
          "--sep-ui-accent": accent,
          borderColor: treatment.border,
          background: treatment.background,
          boxShadow: `inset 3px 0 0 ${treatment.marker}`,
        } as React.CSSProperties
      }
    >
      <p
        className="text-[7px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: treatment.title }}
      >
        {title ?? treatment.label}
      </p>
      <div
        className="mt-1.5 text-[10px] font-medium leading-5"
        style={{ color: treatment.body }}
      >
        {children}
      </div>
    </div>
  );
}

export function SepBadge({
  children,
  accent = "#b68b4f",
  tone = "accent",
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  tone?: "accent" | "neutral" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center justify-center border px-2 py-1 text-[7px] uppercase tracking-[0.13em]",
        className,
      )}
      style={{
        borderColor:
          tone === "danger"
            ? "rgba(185,66,66,0.62)"
            : tone === "neutral"
              ? "rgb(var(--sep-colour-60482e) / 0.45)"
              : `color-mix(in srgb, ${accent} 38%, transparent)`,
        color:
          tone === "danger"
            ? "rgb(224 117 117)"
            : tone === "neutral"
              ? "rgb(var(--sep-colour-bba27c))"
              : accent,
      }}
    >
      {children}
    </span>
  );
}

export function SepPanel({
  children,
  accent = "#b68b4f",
  level = "surface",
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  level?: "surface" | "inset" | "raised";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative border",
        level === "surface" && "bg-[rgb(var(--sep-colour-120d0a))]/95",
        level === "inset" && "bg-[rgb(var(--sep-colour-100c09))]",
        level === "raised" && "bg-[rgb(var(--sep-colour-0d0907))]",
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${accent} ${
          level === "raised" ? 42 : level === "inset" ? 24 : 32
        }%, transparent)`,
      }}
    >
      {children}
    </section>
  );
}

export function SepSectionHeader({
  eyebrow,
  title,
  trailing,
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3",
        className,
      )}
    >
      <p className="text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-806b50))]">
        {eyebrow}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
          {title}
        </h2>
        {trailing}
      </div>
    </header>
  );
}

export function SepModalFrame({
  children,
  accent = "#b68b4f",
  labelledBy,
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  labelledBy?: string;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px] sm:p-8"
    >
      <div
        className={cn(
          "relative w-full max-w-2xl border bg-[rgb(var(--sep-colour-0d0907))] p-[5px] shadow-2xl",
          className,
        )}
        style={{
          borderColor: accent,
          boxShadow: `0 24px 70px rgba(0,0,0,0.72), 0 0 34px color-mix(in srgb, ${accent} 18%, transparent)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
