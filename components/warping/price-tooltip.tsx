import type { ReactNode } from "react";
import {
  getWarpingPriceDefinition,
  getWarpingPriceDefinitionFromText,
} from "@/lib/warping/price-definitions";

export function PriceTooltip({
  priceKey,
  displayText,
  children,
  className = "",
}: {
  priceKey?: string | null;
  displayText?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const price =
    getWarpingPriceDefinition(priceKey) ??
    getWarpingPriceDefinitionFromText(displayText);

  if (!price) return <>{children}</>;

  return (
    <span className={`group/price relative inline-flex cursor-help ${className}`} tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[80] mb-2 hidden w-[280px] max-w-[80vw] -translate-x-1/2 border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2.5 text-left normal-case tracking-normal shadow-xl group-hover/price:block group-focus-within/price:block"
      >
        <span className="block font-serif text-[12px] text-[rgb(var(--sep-colour-dec89f))]">{price.name}</span>
        <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b99765))]">
          Stage {price.stageLabel} · {price.durationDays} days
        </span>
        <span className="mt-2 block text-[9px] leading-4 text-[rgb(var(--sep-colour-b9aa94))]">
          {price.manifestation}
        </span>
      </span>
    </span>
  );
}
