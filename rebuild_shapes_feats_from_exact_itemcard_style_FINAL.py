from pathlib import Path

ROOT = Path.cwd()

SHAPES = ROOT / "components/warping/shapes-catalogue.tsx"
FEATS = ROOT / "components/gifts/gifts-catalogue.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

for path in (SHAPES, FEATS):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

shapes = SHAPES.read_text(encoding="utf-8")
feats = FEATS.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# PRE-FLIGHT: this patch targets the user's current local state after the
# previous consistency/normalisation passes.
# ---------------------------------------------------------------------------

for marker in [
    "function ShapeArticle({",
    "function ProfileCard({",
    "function ResolutionBlock({",
    'min-h-[300px]',
    "Beneficial Other Effect",
    "Harmful Other Effect",
]:
    if marker not in shapes:
        fail(f"Unexpected local Shapes catalogue state: missing {marker!r}")

for marker in [
    "function FeatCard({",
    'min-h-[300px]',
    "Live filtering",
    "ownershipState",
]:
    if marker not in feats:
        fail(f"Unexpected local Feats catalogue state: missing {marker!r}")

# ---------------------------------------------------------------------------
# SHAPES
# Rebuild ShapeArticle as an always-visible ItemCard-style article.
# Keep all current mechanics/details, but use ItemCard's exact visual grammar:
# 59432c/40 + 120e0b shell, p-4, text-base serif title, text-xs description,
# visible square badges, 100c09 mechanics boxes, border-t separators.
# ---------------------------------------------------------------------------

shape_article_start = shapes.find("function ShapeArticle({")
shape_catalogue_start = shapes.find("export function ShapesCatalogue(", shape_article_start)

if shape_article_start < 0 or shape_catalogue_start < 0:
    fail("Could not locate ShapeArticle block.")

new_shape_article = r'''function ShapeArticle({
  shape,
}: {
  shape: ShapeCard;
}) {
  const requirements =
    attributeRequirements(shape);

  const hasSelf =
    shape.target_mode === "self" ||
    shape.target_mode === "either";

  const hasOther =
    shape.target_mode === "other" ||
    shape.target_mode === "either";

  return (
    <article
      id={`shape-${shape.id}`}
      className="min-h-[430px] scroll-mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4"
    >
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] font-serif text-2xl text-[rgb(var(--sep-colour-756247))]">
          ✦
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                {shape.name}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))]">
                Level {shape.level}
                {" · "}
                {pretty(shape.school)}
                {" · "}
                {shape.word_of_power}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))]">
                {pretty(shape.movement)}
                {" · "}
                {durationLabel(shape)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))]">
                Level {shape.level}
              </span>

              <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]">
                {pretty(shape.effect_nature)}
              </span>

              <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]">
                {targetLabel(shape)}
              </span>

              {shape.is_dispel ? (
                <span className="border border-[rgb(var(--sep-colour-65456f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bda0c7))]">
                  Dispel
                </span>
              ) : null}
            </div>
          </div>

          {shape.description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">
              {shape.description}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3">
            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
                Words
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                {[
                  pretty(shape.essence_word),
                  pretty(shape.action_word),
                  pretty(shape.law_word),
                ].join(" · ")}
              </p>
            </div>

            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
                Components
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                {shape.requires_verbal ? "Verbal" : "No verbal"}
                {" · "}
                {shape.requires_movement ? "Movement" : "No movement"}
              </p>
            </div>

            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
                Price
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                {shape.price_key
                  ? PRICE_LABELS[shape.price_key] ??
                    pretty(shape.price_key)
                  : "None"}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
              Effects
            </p>

            <div className="mt-2 grid gap-2">
              {hasSelf ? (
                <ProfileCard
                  shape={shape}
                  profile="self"
                  title="Self Effect"
                  subtitle="Applied when the caster is the recipient."
                />
              ) : null}

              {hasOther ? (
                <ProfileCard
                  shape={shape}
                  profile="other"
                  title={
                    shape.other_alternative_enabled
                      ? "Beneficial Other Effect"
                      : "Other Effect"
                  }
                  subtitle={
                    shape.other_alternative_enabled
                      ? "Chosen independently for each Other target."
                      : "Applied to another Character."
                  }
                />
              ) : null}

              {hasOther && shape.other_alternative_enabled ? (
                <ProfileCard
                  shape={shape}
                  profile="other_alt"
                  title="Harmful Other Effect"
                  subtitle="Chosen independently for each Other target."
                />
              ) : null}

              {shape.target_mode === "written" ? (
                <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5">
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                    Written / Fate
                  </p>
                  <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                    Resolved narratively through its Written / Fate target.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
              Requirements
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="border border-emerald-900/65 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-emerald-400">
                Affinity {shape.level}
              </span>

              {requirements.map((requirement) => (
                <span
                  key={requirement}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]"
                >
                  {requirement}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

'''

shapes = (
    shapes[:shape_article_start]
    + new_shape_article
    + shapes[shape_catalogue_start:]
)

# Make profile cards mimic Item mechanics/effects instead of mini panels.
old_profile_card_start = shapes.find("function ProfileCard({")
new_profile_card_end = shapes.find("function ShapeArticle({", old_profile_card_start)

if old_profile_card_start < 0 or new_profile_card_end < 0:
    fail("Could not locate ProfileCard block after ShapeArticle replacement.")

new_profile_card = r'''function ProfileCard({
  shape,
  profile,
  title,
  subtitle,
}: {
  shape: ShapeCard;
  profile: ProfileKey;
  title: string;
  subtitle?: string;
}) {
  const effects =
    profileEffects(shape, profile);

  const resolution =
    resolutionFor(shape, profile);

  return (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
            {title}
          </p>

          {subtitle ? (
            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-776957))]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span
          className={`border px-2 py-1 text-[7px] uppercase tracking-[0.12em] ${
            resolution.mode === "automatic"
              ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
              : "border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] text-[rgb(var(--sep-colour-d3b278))]"
          }`}
        >
          {resolution.mode === "automatic"
            ? "Automatic"
            : "Save Required"}
        </span>
      </div>

      {resolution.mode === "save" ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
              DC
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
              11 +{" "}
              {resolution.dc
                ? ATTRIBUTE_LABELS[resolution.dc] ??
                  pretty(resolution.dc)
                : "0"}
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
              Saves
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
              {resolution.saves
                .map(
                  (save: string) =>
                    SAVE_LABELS[save] ?? pretty(save),
                )
                .join(" · ") || "None"}
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
              Success
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
              {resolution.saveResult === "half"
                ? "Half damage only"
                : "No effect"}
            </p>
          </div>
        </div>
      ) : null}

      {effects.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {effects.map((effect, index) => (
            <span
              key={`${effect.label}-${index}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]"
            >
              {effect.label} · {effect.value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756957))]">
          No mechanical effect configured.
        </p>
      )}
    </div>
  );
}

'''

shapes = (
    shapes[:old_profile_card_start]
    + new_profile_card
    + shapes[new_profile_card_end:]
)

# Remove now-unused presentation helpers if present.
for function_name, next_name in [
    ("function EffectChip({", "function ResolutionBlock({"),
    ("function ResolutionBlock({", "function ProfileCard({"),
]:
    start = shapes.find(function_name)
    end = shapes.find(next_name, start)
    if start >= 0 and end > start:
        shapes = shapes[:start] + shapes[end:]

# ---------------------------------------------------------------------------
# FEATS
# Rebuild FeatCard using the exact same ItemCard anatomy.
# ---------------------------------------------------------------------------

feat_card_start = feats.find("function FeatCard({")
feat_catalogue_start = feats.find("export function GiftsCatalogue(", feat_card_start)

if feat_card_start < 0 or feat_catalogue_start < 0:
    fail("Could not locate FeatCard block.")

new_feat_card = r'''function FeatCard({
  gift,
}: {
  gift: GiftCard;
}) {
  const modifiers =
    modifierLabels(gift);

  const types =
    typeLabels(gift);

  const ancestryText =
    gift.ancestries
      .map((ancestry) => ancestry.name)
      .join(", ");

  const orders =
    Array.from(
      new Set(
        gift.roles
          .map((role) => role.orderName)
          .filter(Boolean),
      ),
    ).join(", ");

  return (
    <article
      id={`gift-${gift.id}`}
      className="min-h-[430px] scroll-mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4"
    >
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] font-serif text-2xl text-[rgb(var(--sep-colour-756247))]">
          ◇
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                {gift.name}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))]">
                {types.length
                  ? types.join(" · ")
                  : "Feat"}
                {" · "}
                {effectLabel(gift)}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))]">
                {targetLabel(gift.targetMode)}
                {" · "}
                {durationLabel(gift)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {gift.ownershipState ? (
                <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))]">
                  {gift.ownershipState}
                </span>
              ) : null}

              {types.map((label) => (
                <span
                  key={label}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]"
                >
                  {label}
                </span>
              ))}

              <span className="border border-[rgb(var(--sep-colour-49634f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9cbe9f))]">
                {effectLabel(gift)}
              </span>
            </div>
          </div>

          {gift.description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">
              {gift.description}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3">
            <RecapBox
              label="Target"
              value={targetLabel(gift.targetMode)}
            />

            <RecapBox
              label="Success"
              value={successLabel(gift)}
            />

            <RecapBox
              label="Timing"
              value={`${durationLabel(gift)} · ${
                gift.cooldownMinutes
                  ? `${gift.cooldownMinutes} min cooldown`
                  : "No cooldown"
              }`}
            />
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
              Effects
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {gift.damageDice ? (
                <span className="border border-red-900/65 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-red-400">
                  Damage · {gift.damageDice}
                  {gift.damageType
                    ? ` ${gift.damageType}`
                    : ""}
                </span>
              ) : null}

              {gift.healthDelta !== 0 ? (
                <span
                  className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.healthDelta > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`}
                >
                  Health · {signed(gift.healthDelta)}
                </span>
              ) : null}

              {gift.maxHealthModifier !== 0 ? (
                <span
                  className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.maxHealthModifier > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`}
                >
                  Max Health · {signed(gift.maxHealthModifier)}
                </span>
              ) : null}

              {modifiers.map((modifier) => (
                <span
                  key={modifier}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]"
                >
                  {modifier}
                </span>
              ))}

              {!gift.damageDice &&
              gift.healthDelta === 0 &&
              gift.maxHealthModifier === 0 &&
              !modifiers.length ? (
                <span className="text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756957))]">
                  No direct mechanical modifiers.
                </span>
              ) : null}
            </div>
          </div>

          {ancestryText || orders || gift.isGeneral ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Available through
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {ancestryText ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]">
                    Ancestry · {ancestryText}
                  </span>
                ) : null}

                {orders ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]">
                    Order · {orders}
                  </span>
                ) : null}

                {gift.isGeneral ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]">
                    General
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

'''

feats = (
    feats[:feat_card_start]
    + new_feat_card
    + feats[feat_catalogue_start:]
)

# Make RecapBox literally use ItemMechanics box styling.
recap_start = feats.find("function RecapBox({")
feat_card_start_after = feats.find("function FeatCard({", recap_start)

if recap_start < 0 or feat_card_start_after < 0:
    fail("Could not locate Feat RecapBox.")

new_recap = r'''function RecapBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
      <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
        {label}
      </p>

      <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
        {value}
      </p>
    </div>
  );
}

'''

feats = (
    feats[:recap_start]
    + new_recap
    + feats[feat_card_start_after:]
)

# Remove now-unused Badge helper in Feats if present.
badge_start = feats.find("function Badge({")
recap_start_after = feats.find("function RecapBox({", badge_start)
if badge_start >= 0 and recap_start_after > badge_start:
    feats = feats[:badge_start] + feats[recap_start_after:]

# ---------------------------------------------------------------------------
# FILTERS: match Item browser visual shell exactly.
# ---------------------------------------------------------------------------

# Shapes were already normalised to the Item filter surface by the previous
# local pass. Feats still used 59432c for this one outer border; normalise it
# instead of treating that harmless difference as a fatal preflight error.
feat_filter_old = (
    '<section className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 '
    'bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4">'
)
feat_filter_new = (
    '<section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 '
    'bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4">'
)

if feat_filter_old in feats:
    feats = feats.replace(
        feat_filter_old,
        feat_filter_new,
        1,
    )

item_filter_surface = (
    'border border-[rgb(var(--sep-colour-60482e))]/40 '
    'bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4'
)

if item_filter_surface not in shapes:
    fail(
        "Shapes filter shell is not in the expected Item-style state."
    )

if item_filter_surface not in feats:
    fail(
        "Could not normalise the Feats filter shell to the Item-style state."
    )

# ---------------------------------------------------------------------------
# FINAL VALIDATION
# ---------------------------------------------------------------------------

checks = {
    "Shapes": (
        shapes,
        [
            '<article',
            'min-h-[430px]',
            'border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4',
            'font-serif text-base text-[rgb(var(--sep-colour-dec89f))]',
            'whitespace-pre-wrap text-xs leading-5',
            'border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2',
            'className="mt-3 grid items-start gap-3 md:grid-cols-2"',
            'function ProfileCard({',
            'Beneficial Other Effect',
            'Harmful Other Effect',
        ],
    ),
    "Feats": (
        feats,
        [
            '<article',
            'min-h-[430px]',
            'border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4',
            'font-serif text-base text-[rgb(var(--sep-colour-dec89f))]',
            'whitespace-pre-wrap text-xs leading-5',
            'border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2',
            'className="mt-3 grid items-start gap-3 md:grid-cols-2"',
            'function FeatCard({',
            'Live filtering',
        ],
    ),
}

for label, (text, markers) in checks.items():
    for marker in markers:
        if marker not in text:
            fail(f"{label} final validation failed: missing {marker!r}")

# The cards are now articles, matching Items, not collapsible details.
if "<details" in shapes:
    fail("A collapsible <details> Shape card still remains.")
if "<details" in feats:
    fail("A collapsible <details> Feat card still remains.")

SHAPES.write_text(
    shapes,
    encoding="utf-8",
    newline="\n",
)

FEATS.write_text(
    feats,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  components/warping/shapes-catalogue.tsx")
print("WROTE  components/gifts/gifts-catalogue.tsx")
print()
print("EXACT ITEMCARD PRESENTATION PASS APPLIED")
print()
print("Both Shapes and Feats now use the ItemCard visual grammar:")
print("- Always-visible <article> cards, not collapsible <details>.")
print("- border 59432c/40 + background 120e0b + p-4.")
print("- 56px ItemThumbnail-style identity tile.")
print("- font-serif text-base card title.")
print("- text-xs leading-5 description.")
print("- same boxed uppercase badge treatment.")
print("- same 100c09 mechanics boxes.")
print("- same border-t separators.")
print("- same green/red effect badge language.")
print("- same two-column catalogue grid.")
print("- same min-height: 430px.")
print()
print("No Shape/Feat mechanics or data changed.")
print()
print("Run: npm run build")
