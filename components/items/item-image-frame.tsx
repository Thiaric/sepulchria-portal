export type ItemImageFrameBadgeSize =
  | "xs"
  | "sm"
  | "md"
  | "lg";

type ItemQualityVisual = {
  label: string;
  colour: string;
  icon: string;
  frame: string;
};

const QUALITY_VISUALS: Record<
  string,
  ItemQualityVisual
> = {
  poor: {
    label: "Poor",
    colour: "#777777",
    icon: "/icons/rarity/poor.png",
    frame: "/icons/rarity/frames/poor.png",
  },

  average: {
    label: "Average",
    colour: "#c8c8c8",
    icon: "/icons/rarity/average.png",
    frame: "/icons/rarity/frames/average.png",
  },

  fine: {
    label: "Fine",
    colour: "#4fa76c",
    icon: "/icons/rarity/fine.png",
    frame: "/icons/rarity/frames/fine.png",
  },

  superior: {
    label: "Superior",
    colour: "#4d82d6",
    icon: "/icons/rarity/superior.png",
    frame: "/icons/rarity/frames/superior.png",
  },

  flawless: {
    label: "Flawless",
    colour: "#9b62cc",
    icon: "/icons/rarity/flawless.png",
    frame: "/icons/rarity/frames/flawless.png",
  },

  peerless: {
    label: "Legendary",
    colour: "#d6a844",
    icon: "/icons/rarity/peerless.png",
    frame: "/icons/rarity/frames/peerless.png",
  },
};

function qualityVisual(
  quality: string | null | undefined,
) {
  const key =
    quality
      ?.trim()
      .toLowerCase() ||
    "average";

  return (
    QUALITY_VISUALS[key] ??
    QUALITY_VISUALS.average
  );
}

const BADGE_CLASSES: Record<
  ItemImageFrameBadgeSize,
  string
> = {
  xs: "h-[14px] w-[14px]",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function ItemImageFrame({
  src,
  quality,
  alt = "",
  className = "h-14 w-14",
  imageClassName =
    "h-full w-full object-cover",
  badgeSize = "sm",
  fallback = "◇",
  muted = false,
  frameClassName = "",
}: {
  src?: string | null;
  quality?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  badgeSize?: ItemImageFrameBadgeSize;
  fallback?: string;
  muted?: boolean;
  frameClassName?: string;
}) {
  const visual =
    qualityVisual(quality);

  return (
    <div
      className={[
        [
          "relative shrink-0 overflow-hidden bg-[rgb(var(--sep-colour-0d0907))]",
          className,
        ].join(" "),
        "components_items_item_image_frame_div_container",
      ]
        .filter(Boolean)
        .join(" ")}
      title={`${visual.label} Item`}
      data-item-quality={visual.label.toLowerCase()}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={[
            [
              imageClassName,
              muted
                ? "grayscale opacity-75"
                : "",
            ].join(" "),
            "components_items_item_image_frame_img_image",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-[rgb(var(--sep-colour-756247))] components_items_item_image_frame_div_container_2">
          {fallback}
        </div>
      )}

      {/* Rarity glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          boxShadow: `
            inset 0 0 5px 2px color-mix(
              in srgb,
              ${visual.colour} 40%,
              transparent
            ),
            inset 0 0 10px 4px color-mix(
              in srgb,
              ${visual.colour} 15%,
              transparent
            )
          `,
        }}
      />

      {/* Custom rarity frame */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={visual.frame}
        alt=""
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-0 z-[2] h-full w-full origin-center object-fill",
          frameClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {/* Bottom-right rarity icon */}
      <span
        aria-label={`${visual.label} quality`}
        title={visual.label}
        className={[
          [
            "absolute bottom-[1px] right-[1px] z-10 block shrink-0 overflow-visible",
            BADGE_CLASSES[
              badgeSize
            ],
          ].join(" "),
          "components_items_item_image_frame_span_text",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.icon}
          alt=""
          aria-hidden="true"
          className="block h-full w-full object-contain"
        />
      </span>
    </div>
  );
}