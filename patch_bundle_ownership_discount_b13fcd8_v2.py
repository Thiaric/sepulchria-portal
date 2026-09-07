from __future__ import annotations

import re
import subprocess
from pathlib import Path

EXPECTED_COMMIT = "b13fcd8"

ROOT = Path.cwd()
PAGE = ROOT / "app" / "(portal)" / "store" / "page.tsx"
ACTIONS = ROOT / "app" / "(portal)" / "store" / "actions.ts"


def fail(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)


def replace_exact_count(text: str, old: str, new: str, expected: int, label: str) -> str:
    count = text.count(old)
    if count != expected:
        fail(f"{label}: expected {expected} matches, found {count}.")
    return text.replace(old, new)


def regex_replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        fail(f"{label}: expected exactly 1 regex match, found {count}.")
    return new_text


for path in (PAGE, ACTIONS):
    if not path.exists():
        fail(f"Missing expected file: {path}")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        cwd=ROOT,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
except Exception:
    head = ""

if head and head != EXPECTED_COMMIT:
    fail(f"This patch was written for {EXPECTED_COMMIT}, but current HEAD is {head}.")

page = PAGE.read_text(encoding="utf-8")
actions = ACTIONS.read_text(encoding="utf-8")

# Refuse if a previous successful run already modified the files.
if "bundleOwnershipDiscountPercent" in page or "ownershipDiscountMoneyMinor" in actions:
    fail(
        "The bundle ownership patch appears to be already present. "
        "Do not run this patch again."
    )

# ---------------- page.tsx ----------------

old = '''  const productOwned = (productId: string) => {
    const productGrants = grants.filter(
      (grant) => grant.product_id === productId,
    );

    if (productGrants.length === 0) {
      return false;
    }

    return productGrants.every((grant) => {
      if (
        grant.grant_type === "portal_skin" &&
        grant.portal_skin_id
      ) {
        return ownedSkinIds.has(grant.portal_skin_id);
      }

      if (
        grant.grant_type === "cosmetic" &&
        grant.cosmetic_item_id
      ) {
        return ownedCosmeticIds.has(grant.cosmetic_item_id);
      }

      if (
        grant.grant_type === "music" &&
        grant.music_track_id
      ) {
        return ownedMusicIds.has(grant.music_track_id);
      }

      if (
        grant.grant_type === "feature" &&
        grant.feature_key
      ) {
        return ownedFeatures.has(grant.feature_key);
      }

      return false;
    });
  };
'''

new = '''  const grantOwned = (grant: StoreGrant) => {
    if (
      grant.grant_type === "portal_skin" &&
      grant.portal_skin_id
    ) {
      return ownedSkinIds.has(grant.portal_skin_id);
    }

    if (
      grant.grant_type === "cosmetic" &&
      grant.cosmetic_item_id
    ) {
      return ownedCosmeticIds.has(grant.cosmetic_item_id);
    }

    if (
      grant.grant_type === "music" &&
      grant.music_track_id
    ) {
      return ownedMusicIds.has(grant.music_track_id);
    }

    if (
      grant.grant_type === "feature" &&
      grant.feature_key
    ) {
      return ownedFeatures.has(grant.feature_key);
    }

    return false;
  };

  const productOwned = (productId: string) => {
    const productGrants = grants.filter(
      (grant) => grant.product_id === productId,
    );

    return (
      productGrants.length > 0 &&
      productGrants.every(grantOwned)
    );
  };

  const ownedGrantCountForProduct = (productId: string) =>
    grants.filter(
      (grant) =>
        grant.product_id === productId &&
        grantOwned(grant),
    ).length;

  const grantCountForProduct = (productId: string) =>
    grants.filter(
      (grant) => grant.product_id === productId,
    ).length;
'''
page = replace_once(page, old, new, "Store ownership helpers")

old = '''                    owned={productOwned(product.id)}
                    skinNames={skinNames}
'''
new = '''                    owned={productOwned(product.id)}
                    ownedGrantCount={ownedGrantCountForProduct(product.id)}
                    totalGrantCount={grantCountForProduct(product.id)}
                    skinNames={skinNames}
'''
page = replace_exact_count(page, old, new, 2, "StoreProductCard ownership props")

old = '''  grants,
  owned,
  skinNames,
'''
new = '''  grants,
  owned,
  ownedGrantCount,
  totalGrantCount,
  skinNames,
'''
page = replace_once(page, old, new, "StoreProductCard destructuring")

old = '''  grants: StoreGrant[];
  owned: boolean;
  skinNames: Map<string, string>;
'''
new = '''  grants: StoreGrant[];
  owned: boolean;
  ownedGrantCount: number;
  totalGrantCount: number;
  skinNames: Map<string, string>;
'''
page = replace_once(page, old, new, "StoreProductCard prop types")

old = '''  const moneyPrices = prices
    .map((price) => ({
      id: price.id,
      label: moneyLabel(
        price.money_amount_minor,
        price.currency,
      ),
    }))
    .filter(
      (price): price is { id: string; label: string } =>
        Boolean(price.label),
    );
'''

new = '''  const isPartiallyOwnedBundle =
    product.product_type === "bundle" &&
    totalGrantCount > 0 &&
    ownedGrantCount > 0 &&
    ownedGrantCount < totalGrantCount;

  const bundleOwnershipDiscountPercent =
    isPartiallyOwnedBundle
      ? (ownedGrantCount / totalGrantCount) * 100
      : 0;

  const bundleOwnershipDiscountLabel =
    Number.isInteger(bundleOwnershipDiscountPercent)
      ? bundleOwnershipDiscountPercent.toFixed(0)
      : bundleOwnershipDiscountPercent.toFixed(1);

  const moneyPrices = prices.flatMap((price) => {
    if (
      price.money_amount_minor === null ||
      !price.currency
    ) {
      return [];
    }

    const originalAmountMinor = price.money_amount_minor;
    const adjustedAmountMinor = isPartiallyOwnedBundle
      ? Math.max(
          0,
          originalAmountMinor -
            Math.round(
              (originalAmountMinor * ownedGrantCount) /
                totalGrantCount,
            ),
        )
      : originalAmountMinor;

    const label = moneyLabel(
      adjustedAmountMinor,
      price.currency,
    );
    const originalLabel = moneyLabel(
      originalAmountMinor,
      price.currency,
    );

    if (!label || !originalLabel) {
      return [];
    }

    return [
      {
        id: price.id,
        label,
        originalLabel,
      },
    ];
  });
'''
page = replace_once(page, old, new, "Adjusted bundle money price calculation")

pattern = r'(?m)^(\s*)<div className="mt-auto pt-4">\s*\n(\s*)\{owned \? \('
replacement = r'''\1<div className="mt-auto pt-4">
\1  {isPartiallyOwnedBundle && moneyPrices[0] ? (
\1    <div className="mb-2 border border-[rgb(var(--sep-colour-80613b))]/45 bg-[rgb(var(--sep-colour-17120f))] px-3 py-2">
\1      <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c6a979))]">
\1        Bundle ownership discount · {ownedGrantCount}/{totalGrantCount} already owned · {bundleOwnershipDiscountLabel}% off
\1      </p>
\1      <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))]">
\1        <span className="mr-2 text-[rgb(var(--sep-colour-756958))] line-through">
\1          {moneyPrices[0].originalLabel}
\1        </span>
\1        <span className="font-semibold text-[rgb(var(--sep-colour-efd9aa))]">
\1          {moneyPrices[0].label}
\1        </span>
\1      </p>
\1    </div>
\1  ) : null}

\1  {owned ? ('''
page = regex_replace_once(page, pattern, replacement, "Bundle discount display")

# ---------------- actions.ts ----------------

old = '''  const product = productResult.data;
  const price = priceResult.data;
  const character = characterResult.data;

  let syncedPaddlePriceId: string;
'''

new = '''  const product = productResult.data;
  const price = priceResult.data;
  const character = characterResult.data;
  const allGrants = grantsResult.data ?? [];

  const [
    skinEntitlementsResult,
    cosmeticEntitlementsResult,
    musicEntitlementsResult,
    featureEntitlementsResult,
  ] = await Promise.all([
    admin
      .from("user_portal_skin_entitlements")
      .select("skin_id")
      .eq("user_id", user.id)
      .eq("enabled", true),
    admin
      .from("character_cosmetic_entitlements")
      .select("cosmetic_item_id")
      .eq("character_id", character.id)
      .eq("enabled", true),
    admin
      .from("character_music_entitlements")
      .select("music_track_id")
      .eq("character_id", character.id)
      .eq("enabled", true),
    admin
      .from("character_feature_entitlements")
      .select("feature_key")
      .eq("character_id", character.id)
      .eq("enabled", true),
  ]);

  for (const result of [
    skinEntitlementsResult,
    cosmeticEntitlementsResult,
    musicEntitlementsResult,
    featureEntitlementsResult,
  ]) {
    if (result.error) {
      return {
        ok: false,
        error: result.error.message,
        checkoutUrl: null,
        transactionId: null,
        customerEmail: null,
      };
    }
  }

  const ownedSkinIds = new Set(
    (skinEntitlementsResult.data ?? []).map(
      (entry) => entry.skin_id,
    ),
  );
  const ownedCosmeticIds = new Set(
    (cosmeticEntitlementsResult.data ?? []).map(
      (entry) => entry.cosmetic_item_id,
    ),
  );
  const ownedMusicIds = new Set(
    (musicEntitlementsResult.data ?? []).map(
      (entry) => entry.music_track_id,
    ),
  );
  const ownedFeatures = new Set(
    (featureEntitlementsResult.data ?? []).map(
      (entry) => entry.feature_key,
    ),
  );

  const grantIsOwned = (grant: (typeof allGrants)[number]) => {
    if (
      grant.grant_type === "portal_skin" &&
      grant.portal_skin_id
    ) {
      return ownedSkinIds.has(grant.portal_skin_id);
    }

    if (
      grant.grant_type === "cosmetic" &&
      grant.cosmetic_item_id
    ) {
      return ownedCosmeticIds.has(grant.cosmetic_item_id);
    }

    if (
      grant.grant_type === "music" &&
      grant.music_track_id
    ) {
      return ownedMusicIds.has(grant.music_track_id);
    }

    if (
      grant.grant_type === "feature" &&
      grant.feature_key
    ) {
      return ownedFeatures.has(grant.feature_key);
    }

    return false;
  };

  const missingGrants = allGrants.filter(
    (grant) => !grantIsOwned(grant),
  );

  if (missingGrants.length === 0) {
    return {
      ok: false,
      error: "You already own everything included in this product.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }

  const bundleItemCount =
    product.product_type === "bundle"
      ? allGrants.length
      : 0;
  const ownedBundleItemCount =
    product.product_type === "bundle"
      ? allGrants.length - missingGrants.length
      : 0;

  const baseMoneyMinor = Number(
    price.money_amount_minor ?? 0,
  );

  const ownershipDiscountMoneyMinor =
    bundleItemCount > 0 &&
    ownedBundleItemCount > 0
      ? Math.round(
          (baseMoneyMinor * ownedBundleItemCount) /
            bundleItemCount,
        )
      : 0;

  const ownershipAdjustedSubtotalMoneyMinor =
    Math.max(
      0,
      baseMoneyMinor - ownershipDiscountMoneyMinor,
    );

  let syncedPaddlePriceId: string;
'''
actions = replace_once(actions, old, new, "Server-side entitlement and bundle discount calculation")

old = '''  const { data: allOwned, error: allOwnedError } = await admin.rpc("store_product_all_owned", {
    p_user_id: user.id,
    p_character_id: character.id,
    p_product_id: product.id,
  });
  if (allOwnedError) return { ok: false, error: allOwnedError.message, checkoutUrl: null, transactionId: null, customerEmail: null };
  if (allOwned === true) return { ok: false, error: "You already own everything included in this product.", checkoutUrl: null, transactionId: null, customerEmail: null };

'''
actions = replace_once(actions, old, "", "Remove redundant all-owned RPC check")

actions = replace_once(
    actions,
    '      p_subtotal_money_minor: price.money_amount_minor,\n',
    '      p_subtotal_money_minor: ownershipAdjustedSubtotalMoneyMinor,\n',
    "Apply entered discount code after ownership discount",
)

old = '''  const discountMoneyMinor = Number(discount?.discount_money_minor ?? 0);
  const expectedTotalMoneyMinor = Math.max(0, Number(price.money_amount_minor) - discountMoneyMinor);
'''
new = '''  const codeDiscountMoneyMinor = Math.min(
    ownershipAdjustedSubtotalMoneyMinor,
    Math.max(
      0,
      Number(discount?.discount_money_minor ?? 0),
    ),
  );

  const discountMoneyMinor = Math.min(
    baseMoneyMinor,
    ownershipDiscountMoneyMinor +
      codeDiscountMoneyMinor,
  );

  const expectedTotalMoneyMinor = Math.max(
    0,
    baseMoneyMinor - discountMoneyMinor,
  );
'''
actions = replace_once(actions, old, new, "Combine ownership + code discounts")

actions = replace_once(
    actions,
    '      subtotal_money_minor: price.money_amount_minor,\n',
    '      subtotal_money_minor: baseMoneyMinor,\n',
    "Store original order subtotal",
)

old = '''      unit_money_minor_snapshot: price.money_amount_minor,
      total_money_minor_snapshot: price.money_amount_minor,
'''
new = '''      unit_money_minor_snapshot: baseMoneyMinor,
      total_money_minor_snapshot: baseMoneyMinor,
'''
actions = replace_once(actions, old, new, "Store original item price snapshot")

actions = replace_once(
    actions,
    '  const snapshots = (grantsResult.data ?? []).map((grant) => ({\n',
    '''  // Snapshot only entitlements the buyer does not already own.
  // This also prevents a refund from touching a pre-owned entitlement.
  const snapshots = missingGrants.map((grant) => ({
''',
    "Snapshot only missing grants",
)

old = '''      ...(discount?.discount_type === "fixed_money"
        ? { currency_code: String(price.currency).toUpperCase() }
        : {}),
      ...(discount
        ? {
            discount: {
              type:
                discount.discount_type === "percentage"
                  ? "percentage"
                  : "flat",
              description: `Sepulchria Store code ${discountCode.toUpperCase()}`,
              amount: String(discount.discount_value),
            },
          }
        : {}),
'''
new = '''      ...(discountMoneyMinor > 0
        ? {
            currency_code: String(price.currency).toUpperCase(),
            discount: {
              type: "flat",
              description: [
                ownershipDiscountMoneyMinor > 0
                  ? `Bundle ownership ${ownedBundleItemCount}/${bundleItemCount}`
                  : null,
                discount
                  ? `Store code ${discountCode.toUpperCase()}`
                  : null,
              ]
                .filter(Boolean)
                .join(" + "),
              amount: String(discountMoneyMinor),
            },
          }
        : {}),
'''
actions = replace_once(actions, old, new, "Send exact combined discount to Paddle")

# Only write after every expected edit has succeeded.
PAGE.write_text(page, encoding="utf-8")
ACTIONS.write_text(actions, encoding="utf-8")

print("\nSUCCESS: bundle ownership discount patch applied.")
print("Changed:")
print("  app/(portal)/store/page.tsx")
print("  app/(portal)/store/actions.ts")
print("\nNext command:")
print("  npm run build")
