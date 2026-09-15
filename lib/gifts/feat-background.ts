export const FEAT_ANCESTRY_BACKGROUND_SLUGS: Record<string, string> = {
  Aelari:"aelari", Birdfolk:"birdfolk", Cambions:"cambions", Dwarves:"dwarves",
  "Fair Folk":"fair-folk", Gharuk:"gharuk", Littlings:"littlings", Humans:"humans",
  Karesh:"karesh", "Reptilian Folk":"reptilian-folk", Siranthi:"siranthi",
  Vampires:"vampires", Vaskari:"vaskari", Werewolves:"werewolves",
};

export function featAncestrySlug(name: string) {
  return FEAT_ANCESTRY_BACKGROUND_SLUGS[name] ??
    name.trim().toLowerCase().replace(/[\'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function featBackgroundFromNames({ ancestryNames=[], hasOrder=false }:{
  ancestryNames?: string[]; hasOrder?: boolean;
}) {
  if (ancestryNames.length === 1)
    return `/backgrounds/feats/ancestries/${featAncestrySlug(ancestryNames[0])}.png`;
  if (ancestryNames.length > 1) return "/backgrounds/feats/ancestry.png";
  if (hasOrder) return "/backgrounds/feats/order.png";
  return "/backgrounds/feats/general.png";
}

export function featBackgroundStyle(image:string) {
  return {
    backgroundImage: `linear-gradient(rgb(var(--sep-colour-100d0b) / 82%), rgb(var(--sep-colour-100d0b) / 82%)), url("${image}")`,
    backgroundSize:"cover", backgroundPosition:"center", backgroundRepeat:"no-repeat",
  };
}
