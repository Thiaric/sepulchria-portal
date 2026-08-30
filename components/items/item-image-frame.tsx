export type ItemImageFrameBadgeSize =
  | "xs"
  | "sm"
  | "md"
  | "lg";

type ItemQualityVisual = {
  label: string;
  colour: string;
  symbol: string;
};

const QUALITY_VISUALS: Record<string, ItemQualityVisual> = {
  poor: {
    label: "Poor",
    colour: "#777777",
    symbol: "◇",
  },
  average: {
    label: "Average",
    colour: "#c8c8c8",
    symbol: "●",
  },
  fine: {
    label: "Fine",
    colour: "#4fa76c",
    symbol: "◆",
  },
  superior: {
    label: "Superior",
    colour: "#4d82d6",
    symbol: "✦",
  },
  flawless: {
    label: "Flawless",
    colour: "#9b62cc",
    symbol: "✧",
  },
  peerless: {
    label: "Peerless",
    colour: "#d6a844",
    symbol: "♛",
  },
};

function qualityVisual(
  quality: string | null | undefined,
) {
  const key =
    quality?.trim().toLowerCase() ||
    "average";

  return QUALITY_VISUALS[key] ?? QUALITY_VISUALS.average;
}

const BADGE_CLASSES: Record<ItemImageFrameBadgeSize, string> = {
  xs: "h-[14px] min-w-[14px] px-[2px] text-[7px]",
  sm: "h-4 min-w-4 px-[3px] text-[8px]",
  md: "h-5 min-w-5 px-1 text-[10px]",
  lg: "h-8 min-w-8 px-1 text-[18px]",
};

export function ItemImageFrame({
  src,
  quality,
  alt = "",
  className = "h-14 w-14",
  imageClassName = "h-full w-full object-cover",
  badgeSize = "sm",
  fallback = "◇",
  muted = false,
}: {
  src?: string | null;
  quality?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  badgeSize?: ItemImageFrameBadgeSize;
  fallback?: string;
  muted?: boolean;
}) {
  const visual = qualityVisual(quality);

  return (
    <div
      className={[
        "relative shrink-0 overflow-hidden border-2 bg-[rgb(var(--sep-colour-0d0907))]",
        className,
      ].join(" ")}
      style={{
        borderColor: visual.colour,
      }}
      title={`${visual.label} Item`}
      data-item-quality={visual.label.toLowerCase()}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={[
            imageClassName,
            muted ? "grayscale opacity-75" : "",
          ].join(" ")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-[rgb(var(--sep-colour-756247))]">
          {fallback}
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: `
  inset 0 0 0 1px ${visual.colour},
  inset 0 0 5px 2px color-mix(in srgb, ${visual.colour} 55%, transparent),
  inset 0 0 10px 4px color-mix(in srgb, ${visual.colour} 20%, transparent)
`,
        }}
      />

      <span
        aria-label={`${visual.label} quality`}
        className={[
          "absolute -bottom-[2px] -right-[2px] z-10 flex items-center justify-center font-serif font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
          BADGE_CLASSES[badgeSize],
        ].join(" ")}
        style={{
          color: visual.colour,
        }}
      >
        {visual.symbol}
      </span>
    </div>
  );
}