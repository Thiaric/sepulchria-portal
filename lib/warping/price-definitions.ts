export type WarpingPriceDefinition = {
  key: string;
  number: number;
  name: string;
  stage: 1 | 2 | 3;
  stageLabel: "I" | "II" | "III";
  durationDays: 2 | 5 | 10;
  manifestation: string;
};

export const WARPING_PRICE_DEFINITIONS: readonly WarpingPriceDefinition[] = [
  { key: "cinder_eyes", number: 1, name: "Cinder Eyes", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "The Warper's eyes change colour, developing an unnatural metallic or Cinder-like quality." },
  { key: "luminous_veins", number: 2, name: "Luminous Veins", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "Faintly luminous veins become visible beneath the skin, intensifying when the Current is channelled." },
  { key: "cinderblood", number: 3, name: "Cinderblood", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "Traces of Cinder manifest within the Warper's blood." },
  { key: "dreamtouched", number: 4, name: "Dreamtouched", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "The Warper experiences intensely vivid dreams, some of which appear prophetic." },
  { key: "beastmarked", number: 5, name: "Beastmarked", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "Animals instinctively react to the Warper's presence, whether through attraction, submission, agitation or fear." },
  { key: "bloomwake", number: 6, name: "Bloomwake", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Plant life responds unnaturally to the Warper's presence, blooming or growing around them." },
  { key: "witherwake", number: 7, name: "Witherwake", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Nearby plant life wilts, discolours or withers in response to the Warper's presence." },
  { key: "upstream", number: 8, name: "Upstream", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Water near the Warper occasionally defies gravity or flows in impossible directions." },
  { key: "unbound_shadow", number: 9, name: "Unbound Shadow", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "The Warper's shadow sometimes moves independently of the body casting it." },
  { key: "starbound", number: 10, name: "Starbound", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Stars appear subtly to change position or follow the Warper from their perspective." },
  { key: "false_remembrance", number: 11, name: "False Remembrance", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "People around the Warper occasionally remember events involving them that never actually occurred." },
  { key: "current_sighted", number: 12, name: "Current-Sighted", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "The Warper gains direct perception of the Current woven through reality for the duration of the manifestation." },
  { key: "godwhispered", number: 13, name: "Godwhispered", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "The Warper hears what appear to be the distant voices of the dead gods." },
  { key: "realitys_misstep", number: 14, name: "Reality's Misstep", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "Reality occasionally fails to behave normally around the Warper: reflections lag, distances seem subtly wrong, or their physical presence appears momentarily displaced." },
  { key: "unmoored", number: 15, name: "Unmoored", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "The Warper's relationship with ordinary physical reality becomes visibly unstable: gravity, light, matter or space may react incorrectly to their presence." },
] as const;

export const WARPING_PRICE_BY_KEY = Object.fromEntries(
  WARPING_PRICE_DEFINITIONS.map((price) => [price.key, price]),
) as Record<string, WarpingPriceDefinition>;

export function getWarpingPriceDefinition(key: string | null | undefined): WarpingPriceDefinition | null {
  return key ? WARPING_PRICE_BY_KEY[key] ?? null : null;
}

export function getWarpingPriceDefinitionFromText(value: string | null | undefined): WarpingPriceDefinition | null {
  if (!value) return null;
  const cleanName = value.replace(/\s*\(Stage\s+(?:I|II|III|\d+)\)\s*$/i, "").trim().toLowerCase();
  return WARPING_PRICE_DEFINITIONS.find((price) => price.name.toLowerCase() === cleanName) ?? null;
}
