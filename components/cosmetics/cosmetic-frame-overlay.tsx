import type { CSSProperties } from "react";

export type CosmeticFrameVariant =
  | "sheet"
  | "chat";

export function cosmeticFrameStyle(
  assetUrl: string | null | undefined,
  variant: CosmeticFrameVariant,
): CSSProperties | undefined {
  if (!assetUrl) {
    return undefined;
  }

  const safeUrl = assetUrl.replace(/"/g, "%22");

  if (variant === "sheet") {
    return {
      boxSizing: "border-box",
      borderStyle: "solid",
      borderColor: "transparent",
      borderWidth:
        "clamp(10px, 2.6vw, 10px)",
      borderImageSource:
        `url("${safeUrl}")`,
      borderImageSlice: "14% 9%",
      borderImageWidth: "1",
      borderImageRepeat: "stretch",
    };
  }

  return {
    boxSizing: "border-box",
    borderStyle: "solid",
    borderColor: "transparent",
    borderWidth:
      "clamp(9px, 0.9vw, 13px) clamp(11px, 1.2vw, 17px)",
    borderImageSource:
      `url("${safeUrl}")`,
    borderImageSlice: "15% 9%",
    borderImageWidth: "1",
    borderImageRepeat: "stretch",
  };
}
