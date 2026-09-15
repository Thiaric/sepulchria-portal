from pathlib import Path

ROOT = Path.cwd()
TARGET = ROOT / "components" / "gifts" / "gifts-catalogue.tsx"

if not TARGET.exists():
    raise SystemExit(
        "ERROR: Run this from the sepulchria-portal repository root.\n"
        f"Could not find: {TARGET}"
    )

text = TARGET.read_text(encoding="utf-8")
original = text

ANCESTRY_MAP = {
    "Aelari": "aelari",
    "Birdfolk": "birdfolk",
    "Cambions": "cambions",
    "Dwarves": "dwarves",
    "Fair Folk": "fair-folk",
    "Gharuk": "gharuk",
    "Littlings": "littlings",
    "Humans": "humans",
    "Karesh": "karesh",
    "Reptilian Folk": "reptilian-folk",
    "Siranthi": "siranthi",
    "Vampires": "vampires",
    "Vaskari": "vaskari",
    "Werewolves": "werewolves",
}

resolver = '''const FEAT_ANCESTRY_BACKGROUND_SLUGS: Record<string, string> = {
  "Aelari": "aelari",
  "Birdfolk": "birdfolk",
  "Cambions": "cambions",
  "Dwarves": "dwarves",
  "Fair Folk": "fair-folk",
  "Gharuk": "gharuk",
  "Littlings": "littlings",
  "Humans": "humans",
  "Karesh": "karesh",
  "Reptilian Folk": "reptilian-folk",
  "Siranthi": "siranthi",
  "Vampires": "vampires",
  "Vaskari": "vaskari",
  "Werewolves": "werewolves",
};

function featBackgroundSlug(name: string) {
  return (
    FEAT_ANCESTRY_BACKGROUND_SLUGS[name] ??
    name
      .trim()
      .toLowerCase()
      .replace(/[\\'’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

function featBackgroundImage(gift: GiftCard) {
  if (gift.ancestries.length === 1) {
    return `/backgrounds/feats/ancestries/${featBackgroundSlug(
      gift.ancestries[0].name,
    )}.png`;
  }

  if (gift.ancestries.length > 1) {
    return "/backgrounds/feats/ancestry.png";
  }

  if (gift.roles.length > 0) {
    return "/backgrounds/feats/order.png";
  }

  return "/backgrounds/feats/general.png";
}

'''

marker = "function RecapBox({"
if "function featBackgroundImage(gift: GiftCard)" not in text:
    if marker not in text:
        raise SystemExit("ERROR: Could not locate RecapBox insertion point.")
    text = text.replace(marker, resolver + marker, 1)

needle = '''  const types =
    typeLabels(gift);
'''
replacement = '''  const types =
    typeLabels(gift);

  const backgroundImage =
    featBackgroundImage(gift);
'''
if "const backgroundImage =" not in text:
    if needle not in text:
        raise SystemExit("ERROR: Could not locate FeatCard typeLabels block.")
    text = text.replace(needle, replacement, 1)

old_article = '''    <article
  id={`gift-${gift.id}`}
  data-sep-interactive-surface="card"
  className="min-h-[430px] scroll-mt-4 border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-18110c))] p-4 components_gifts_gifts_catalogue_article_article"
>
'''

new_article = '''    <article
      id={`gift-${gift.id}`}
      data-sep-interactive-surface="card"
      data-feat-background={backgroundImage}
      style={{
        backgroundImage: `
          linear-gradient(
            rgb(var(--sep-colour-100d0b) / 82%),
            rgb(var(--sep-colour-100d0b) / 82%)
          ),
          url("${backgroundImage}")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      className="relative min-h-[430px] scroll-mt-4 overflow-hidden border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-18110c))] p-4 components_gifts_gifts_catalogue_article_article"
    >
'''

if 'data-feat-background={backgroundImage}' not in text:
    if old_article not in text:
        raise SystemExit(
            "ERROR: Could not locate expected FeatCard <article> from commit 2d57342."
        )
    text = text.replace(old_article, new_article, 1)

old_content = '''      <div className="flex gap-3 components_gifts_gifts_catalogue_div_container_2">'''
new_content = '''      <div className="relative z-[1] flex gap-3 components_gifts_gifts_catalogue_div_container_2">'''
if new_content not in text:
    if old_content not in text:
        raise SystemExit("ERROR: Could not locate FeatCard content wrapper.")
    text = text.replace(old_content, new_content, 1)

if text != original:
    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched: {TARGET}")
else:
    print("Feat background code already present; no source changes required.")

base = ROOT / "public" / "backgrounds" / "feats"
ancestries = base / "ancestries"
ancestries.mkdir(parents=True, exist_ok=True)

required = [
    "general.png",
    "order.png",
    "ancestry.png",
] + [f"ancestries/{slug}.png" for slug in ANCESTRY_MAP.values()]

manifest = base / "README.txt"
manifest.write_text(
    "SEPULCHRIA FEAT BACKGROUNDS\n\n"
    "Required artwork paths:\n\n"
    + "\n".join(f"- public/backgrounds/feats/{name}" for name in required)
    + "\n\nRULES\n-----\n"
      "- Exactly one ancestry -> that ancestry image.\n"
      "- Multiple ancestries -> ancestry.png.\n"
      "- Non-ancestry Order feat -> order.png.\n"
      "- Other non-ancestry feat -> general.png.\n"
      "- Background treatment: 82% Sepulchria dark overlay, cover, centered, no-repeat.\n"
      "- Applied centrally through FeatCard in GiftsCatalogue.\n",
    encoding="utf-8",
)

print(f"Created/updated: {manifest}")
print("\nCOMPLETE. Add artwork using these exact filenames:")
for name in required:
    print(f"  public/backgrounds/feats/{name}")
