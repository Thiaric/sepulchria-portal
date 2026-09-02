type CosmeticFrameOverlayProps = {
  assetUrl:
    | string
    | null
    | undefined;
  layer?:
    | "front"
    | "background";
};

export function CosmeticFrameOverlay({
  assetUrl,
  layer = "front",
}: CosmeticFrameOverlayProps) {
  if (!assetUrl) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={[
        "pointer-events-none absolute inset-0 h-full w-full select-none object-fill",
        layer ===
        "front"
          ? "z-20"
          : "z-[1]",
      ].join(" ")}
    />
  );
}
