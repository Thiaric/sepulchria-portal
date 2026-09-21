from pathlib import Path

ROOT = Path.cwd()

TOOLTIP = ROOT / "components" / "warping" / "price-tooltip.tsx"
CATALOGUE = ROOT / "components" / "warping" / "shapes-catalogue.tsx"

for path in (TOOLTIP, CATALOGUE):
    if not path.exists():
        raise RuntimeError(f"Missing expected file: {path}")

tooltip = TOOLTIP.read_text(encoding="utf-8")
catalogue = CATALOGUE.read_text(encoding="utf-8")

old_stage = '''                Stage{" "}
                {price.stageLabel} ·{" "}
                {price.durationDays} days
'''

new_stage = '''                Stage{" "}
                {price.stage === 1
                  ? "I"
                  : price.stage === 2
                    ? "II"
                    : price.stage === 3
                      ? "III"
                      : price.stage}{" "}
                · {price.durationDays} days
'''

if tooltip.count(old_stage) != 1:
    raise RuntimeError(
        f"price-tooltip.tsx: expected stageLabel snippet once, found {tooltip.count(old_stage)}. No files were written."
    )

old_catalogue_block = '''  const priceDefinitions =
    useWarpingPrices();

  const priceNames =
    useMemo(
      () =>
        new Map(
          priceDefinitions.map(
            (price) => [
              price.key,
              price.name,
            ],
          ),
        ),
      [priceDefinitions],
    );

  const [q, setQ] = useState("");
'''

new_catalogue_block = '''  const [q, setQ] = useState("");
'''

if catalogue.count(old_catalogue_block) != 1:
    raise RuntimeError(
        f"shapes-catalogue.tsx: expected misplaced price map once, found {catalogue.count(old_catalogue_block)}. No files were written."
    )

old_shape_article = '''function ShapeArticle({
  shape,
}: {
  shape: ShapeCard;
}) {
  const backgroundImage =
    shapeBackgroundImage(shape.level);
'''

new_shape_article = '''function ShapeArticle({
  shape,
}: {
  shape: ShapeCard;
}) {
  const priceDefinitions =
    useWarpingPrices();

  const priceNames =
    useMemo(
      () =>
        new Map(
          priceDefinitions.map(
            (price) => [
              price.key,
              price.name,
            ],
          ),
        ),
      [priceDefinitions],
    );

  const backgroundImage =
    shapeBackgroundImage(shape.level);
'''

if catalogue.count(old_shape_article) != 1:
    raise RuntimeError(
        f"shapes-catalogue.tsx: expected ShapeArticle header once, found {catalogue.count(old_shape_article)}. No files were written."
    )

# All validation passed; write now.
TOOLTIP.write_text(
    tooltip.replace(old_stage, new_stage, 1),
    encoding="utf-8",
)

catalogue = catalogue.replace(
    old_catalogue_block,
    new_catalogue_block,
    1,
)
catalogue = catalogue.replace(
    old_shape_article,
    new_shape_article,
    1,
)

CATALOGUE.write_text(
    catalogue,
    encoding="utf-8",
)

print("Follow-up Price patch applied.")
print("Changed:")
print("  components/warping/price-tooltip.tsx")
print("  components/warping/shapes-catalogue.tsx")
print()
print("Now run:")
print("  npm run build")
