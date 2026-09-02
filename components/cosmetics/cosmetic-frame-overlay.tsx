import type { CSSProperties } from "react";

export type CosmeticFrameVariant =
  | "sheet"
  | "chat"
  | "portrait"
  | "message"
  | "instant"
  | "forum"
  | "nameplate"
  | "panel"
  | "header";

function safeUrl(value: string) {
  return value.replace(/"/g, "%22");
}

export function cosmeticFrameStyle(
  assetUrl: string | null | undefined,
  variant: CosmeticFrameVariant,
): CSSProperties | undefined {
  if (!assetUrl) return undefined;

  const base: CSSProperties = {
    boxSizing: "border-box",
    borderStyle: "solid",
    borderColor: "transparent",
    borderImageSource: `url("${safeUrl(assetUrl)}")`,
    borderImageWidth: "1",
    borderImageRepeat: "stretch",
  };

  switch (variant) {
    case "sheet":
      return { ...base, borderWidth: "10px", borderImageSlice: "14% 9%" };
    case "chat":
      return {
        ...base,
        borderWidth: "clamp(9px, 0.9vw, 13px) clamp(11px, 1.2vw, 17px)",
        borderImageSlice: "15% 9%",
      };
    case "portrait":
      return { ...base, borderWidth: "9px", borderImageSlice: "12% 12%" };
    case "message":
      return { ...base, borderWidth: "8px 10px", borderImageSlice: "15% 9%" };
    case "instant":
      return { ...base, borderWidth: "6px 8px", borderImageSlice: "15% 10%" };
    case "forum":
      return { ...base, borderWidth: "10px", borderImageSlice: "12% 8%" };
    case "nameplate":
      return { ...base, borderWidth: "5px 9px", borderImageSlice: "18% 10%" };
    case "panel":
      return { ...base, borderWidth: "8px", borderImageSlice: "10% 10%" };
    case "header":
      return { ...base, borderWidth: "5px", borderImageSlice: "18% 18%" };
  }
}

export function cssImageUrl(
  assetUrl: string | null | undefined,
): string {
  return assetUrl ? `url("${safeUrl(assetUrl)}")` : "none";
}
