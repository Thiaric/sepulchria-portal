export type DispelSourceType =
  | "shape"
  | "feat"
  | "item";

export type EffectSourceType =
  | "shape"
  | "feat"
  | "item"
  | "manual";

export function canDispelEffect({
  dispelSourceType,
  dispelLevel,
  effectSourceType,
  effectLevel,
}: {
  dispelSourceType: DispelSourceType;
  dispelLevel: number;
  effectSourceType: EffectSourceType;
  effectLevel: number;
}) {
  if (
    effectSourceType ===
    "manual"
  ) {
    return false;
  }

  if (
    dispelSourceType ===
    "shape"
  ) {
    if (
      effectSourceType !==
      "shape"
    ) {
      return true;
    }

    return (
      effectLevel <=
      dispelLevel
    );
  }

  if (
    dispelSourceType ===
    "feat"
  ) {
    if (
      effectSourceType ===
      "feat"
    ) {
      return true;
    }

    if (
      effectSourceType ===
      "shape"
    ) {
      return (
        effectLevel <= 3
      );
    }

    return false;
  }

  if (
    effectSourceType ===
      "feat" ||
    effectSourceType ===
      "item"
  ) {
    return true;
  }

  return (
    effectSourceType ===
      "shape" &&
    effectLevel <= 3
  );
}
