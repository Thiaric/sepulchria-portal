from pathlib import Path

ROOT = Path.cwd()

def fail(message):
    raise SystemExit(f"\nPATCH STOPPED: {message}\n")

def read(rel):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing expected file: {rel}")
    return path.read_text(encoding="utf-8")

def write(rel, content):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")

# Guard: this patch is for the 92eb782 checkout state.
actions_rel = "app/(portal)/store/actions.ts"
actions = read(actions_rel)
if "export async function startStorePaddleCheckout(" not in actions:
    fail("Expected 92eb782 Paddle checkout action was not found.")
if 'ensureStorePriceReadyForCheckout } from "@/lib/store/paddle-server"' not in actions:
    fail("Expected Paddle checkout import was not found.")

# Stripe server helper.
stripe_rel = "lib/store/stripe-server.ts"
stripe = read(stripe_rel)

if "export async function createManagedStoreCheckout(" not in stripe:
    anchor = 'function stripeClient() {\n  return new Stripe(stripeSecretKey());\n}\n'
    if anchor not in stripe:
        fail("Could not locate stripeClient() in stripe-server.ts.")
    stripe = stripe.replace(anchor, anchor + '\nfunction storeSiteUrl() {\n  const value =\n    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||\n    process.env.SITE_URL?.trim() ||\n    "https://sepulchria.com";\n\n  return value.replace(/\\/+$/, "");\n}\n', 1)
    stripe = stripe.rstrip() + "\n\n" + '\nexport async function createManagedStoreCheckout(input: {\n  stripePriceId: string;\n  customerEmail: string;\n  currency: string;\n  discountMoneyMinor: number;\n  orderId: string;\n  productId: string;\n  userId: string;\n  characterId: string;\n  discountDescription?: string | null;\n}) {\n  const stripe = stripeClient();\n\n  let couponId: string | null = null;\n\n  if (input.discountMoneyMinor > 0) {\n    const coupon = await stripe.coupons.create({\n      amount_off: Math.trunc(input.discountMoneyMinor),\n      currency: input.currency.toLowerCase(),\n      duration: "once",\n      name: input.discountDescription?.trim() || "Sepulchria Store discount",\n      metadata: {\n        sepulchria_store_order_id: input.orderId,\n      },\n    });\n\n    couponId = coupon.id;\n  }\n\n  const params = {\n    mode: "payment",\n    line_items: [\n      {\n        price: input.stripePriceId,\n        quantity: 1,\n      },\n    ],\n    ...(couponId\n      ? {\n          discounts: [\n            {\n              coupon: couponId,\n            },\n          ],\n        }\n      : {}),\n    customer_email: input.customerEmail,\n    success_url:\n      `${storeSiteUrl()}/store?stripe=success&session_id={CHECKOUT_SESSION_ID}`,\n    cancel_url: `${storeSiteUrl()}/store?stripe=cancelled`,\n    metadata: {\n      store_order_id: input.orderId,\n      store_product_id: input.productId,\n      sepulchria_user_id: input.userId,\n      sepulchria_character_id: input.characterId,\n    },\n    managed_payments: {\n      enabled: true,\n    },\n  } as Stripe.Checkout.SessionCreateParams & {\n    managed_payments: { enabled: true };\n  };\n\n  const session = await stripe.checkout.sessions.create(params);\n\n  if (!session.url) {\n    throw new Error("Stripe created a Checkout Session without a checkout URL.");\n  }\n\n  return {\n    checkoutUrl: session.url,\n    checkoutSessionId: session.id,\n    couponId,\n  };\n}\n'.strip() + "\n"
    write(stripe_rel, stripe)

# Store action: use Stripe helper and replace the complete Paddle checkout function.
actions = actions.replace(
    'import { ensureStorePriceReadyForCheckout } from "@/lib/store/paddle-server";',
    'import {\n  createManagedStoreCheckout,\n  ensureStorePriceReadyForCheckout,\n} from "@/lib/store/stripe-server";',
    1,
)

type_start = actions.find("export type StorePaddleState =")
func_start = actions.find("export async function startStorePaddleCheckout(")

if type_start == -1 or func_start == -1:
    fail("Could not locate Paddle state/action.")

# Remove Paddle state plus paddleApiBase(), but preserve Remnants action between them.
# Easier targeted deletions.
state_end_marker = "\n\nfunction paddleApiBase()"
state_end = actions.find(state_end_marker, type_start)
if state_end == -1:
    fail("Could not locate Paddle state end.")
api_end = actions.find("\n\nexport async function purchaseStoreProductWithRemnants", state_end)
if api_end == -1:
    fail("Could not locate Paddle API helper end.")
actions = actions[:type_start] + actions[api_end+2:]

func_start = actions.find("export async function startStorePaddleCheckout(")
if func_start == -1:
    fail("Could not relocate Paddle checkout function.")
actions = actions[:func_start] + 'export type StoreStripeState = {\n  ok: boolean;\n  error: string | null;\n  checkoutUrl: string | null;\n  checkoutSessionId: string | null;\n};\n\nexport async function startStoreStripeCheckout(\n  _previousState: StoreStripeState,\n  formData: FormData,\n): Promise<StoreStripeState> {\n  const productId = String(formData.get("productId") ?? "").trim();\n  const priceId = String(formData.get("priceId") ?? "").trim();\n  const discountCode = String(formData.get("discountCode") ?? "").trim();\n\n  const failure = (error: string): StoreStripeState => ({\n    ok: false,\n    error,\n    checkoutUrl: null,\n    checkoutSessionId: null,\n  });\n\n  if (!productId) {\n    return failure("Store product is missing.");\n  }\n\n  if (!process.env.STRIPE_SECRET_KEY?.trim()) {\n    return failure("Stripe is not configured yet.");\n  }\n\n  const supabase = await createClient();\n  const admin = createAdminClient();\n\n  const {\n    data: { user },\n  } = await supabase.auth.getUser();\n\n  if (!user) {\n    return failure("You must be signed in.");\n  }\n\n  const customerEmail = user.email?.trim() ?? "";\n\n  if (!customerEmail) {\n    return failure(\n      "Your account does not have an email address for the payment receipt.",\n    );\n  }\n\n  const [characterResult, productResult, priceResult, grantsResult] =\n    await Promise.all([\n      admin\n        .from("characters")\n        .select("id")\n        .eq("user_id", user.id)\n        .maybeSingle(),\n      admin\n        .from("store_products")\n        .select("id, slug, name, product_type, category, is_active")\n        .eq("id", productId)\n        .maybeSingle(),\n      admin\n        .from("store_product_prices")\n        .select("id, currency, money_amount_minor, is_active")\n        .eq("product_id", productId)\n        .eq("id", priceId)\n        .eq("is_active", true)\n        .not("money_amount_minor", "is", null)\n        .maybeSingle(),\n      admin\n        .from("store_product_grants")\n        .select(\n          "grant_type, portal_skin_id, cosmetic_item_id, music_track_id, feature_key, quantity",\n        )\n        .eq("product_id", productId),\n    ]);\n\n  if (characterResult.error || !characterResult.data) {\n    return failure(\n      characterResult.error?.message ?? "Character not found.",\n    );\n  }\n\n  if (\n    productResult.error ||\n    !productResult.data ||\n    productResult.data.is_active !== true\n  ) {\n    return failure(\n      productResult.error?.message ??\n        "This Store product is not available.",\n    );\n  }\n\n  if (priceResult.error || !priceResult.data) {\n    return failure(\n      priceResult.error?.message ??\n        "This product does not have an active Stripe price.",\n    );\n  }\n\n  if (grantsResult.error || !(grantsResult.data ?? []).length) {\n    return failure(\n      grantsResult.error?.message ??\n        "This Store product has no fulfilment grants.",\n    );\n  }\n\n  const product = productResult.data;\n  const price = priceResult.data;\n  const character = characterResult.data;\n  const allGrants = grantsResult.data ?? [];\n\n  const [\n    skinEntitlementsResult,\n    cosmeticEntitlementsResult,\n    musicEntitlementsResult,\n    featureEntitlementsResult,\n  ] = await Promise.all([\n    admin\n      .from("user_portal_skin_entitlements")\n      .select("skin_id")\n      .eq("user_id", user.id)\n      .eq("enabled", true),\n    admin\n      .from("character_cosmetic_entitlements")\n      .select("cosmetic_item_id")\n      .eq("character_id", character.id)\n      .eq("enabled", true),\n    admin\n      .from("character_music_entitlements")\n      .select("music_track_id")\n      .eq("character_id", character.id)\n      .eq("enabled", true),\n    admin\n      .from("character_feature_entitlements")\n      .select("feature_key")\n      .eq("character_id", character.id)\n      .eq("enabled", true),\n  ]);\n\n  for (const result of [\n    skinEntitlementsResult,\n    cosmeticEntitlementsResult,\n    musicEntitlementsResult,\n    featureEntitlementsResult,\n  ]) {\n    if (result.error) {\n      return failure(result.error.message);\n    }\n  }\n\n  const ownedSkinIds = new Set(\n    (skinEntitlementsResult.data ?? []).map((entry) => entry.skin_id),\n  );\n  const ownedCosmeticIds = new Set(\n    (cosmeticEntitlementsResult.data ?? []).map(\n      (entry) => entry.cosmetic_item_id,\n    ),\n  );\n  const ownedMusicIds = new Set(\n    (musicEntitlementsResult.data ?? []).map(\n      (entry) => entry.music_track_id,\n    ),\n  );\n  const ownedFeatures = new Set(\n    (featureEntitlementsResult.data ?? []).map(\n      (entry) => entry.feature_key,\n    ),\n  );\n\n  const grantIsOwned = (grant: (typeof allGrants)[number]) => {\n    if (grant.grant_type === "portal_skin" && grant.portal_skin_id) {\n      return ownedSkinIds.has(grant.portal_skin_id);\n    }\n\n    if (grant.grant_type === "cosmetic" && grant.cosmetic_item_id) {\n      return ownedCosmeticIds.has(grant.cosmetic_item_id);\n    }\n\n    if (grant.grant_type === "music" && grant.music_track_id) {\n      return ownedMusicIds.has(grant.music_track_id);\n    }\n\n    if (grant.grant_type === "feature" && grant.feature_key) {\n      return ownedFeatures.has(grant.feature_key);\n    }\n\n    return false;\n  };\n\n  const missingGrants = allGrants.filter(\n    (grant) => !grantIsOwned(grant),\n  );\n\n  if (missingGrants.length === 0) {\n    return failure(\n      "You already own everything included in this product.",\n    );\n  }\n\n  const bundleItemCount =\n    product.product_type === "bundle" ? allGrants.length : 0;\n  const ownedBundleItemCount =\n    product.product_type === "bundle"\n      ? allGrants.length - missingGrants.length\n      : 0;\n\n  const baseMoneyMinor = Number(price.money_amount_minor ?? 0);\n\n  const ownershipDiscountMoneyMinor =\n    bundleItemCount > 0 && ownedBundleItemCount > 0\n      ? Math.round(\n          (baseMoneyMinor * ownedBundleItemCount) /\n            bundleItemCount,\n        )\n      : 0;\n\n  const ownershipAdjustedSubtotalMoneyMinor = Math.max(\n    0,\n    baseMoneyMinor - ownershipDiscountMoneyMinor,\n  );\n\n  let syncedStripePriceId: string;\n\n  try {\n    const synced = await ensureStorePriceReadyForCheckout(price.id);\n    syncedStripePriceId = synced.stripePriceId;\n  } catch (error) {\n    return failure(\n      error instanceof Error\n        ? error.message\n        : "Stripe price synchronization failed.",\n    );\n  }\n\n  let discount: {\n    discount_code_id: string;\n    user_discount_code_id: string | null;\n    discount_type: "percentage" | "fixed_money";\n    discount_value: number;\n    discount_money_minor: number;\n  } | null = null;\n\n  if (discountCode) {\n    const { data: discountRows, error: discountError } =\n      await admin.rpc("resolve_store_discount", {\n        p_user_id: user.id,\n        p_product_id: product.id,\n        p_code: discountCode,\n        p_payment_method: "stripe",\n        p_subtotal_money_minor:\n          ownershipAdjustedSubtotalMoneyMinor,\n        p_subtotal_remnants: 0,\n        p_currency: price.currency,\n      });\n\n    if (discountError) {\n      return failure(discountError.message);\n    }\n\n    const row = Array.isArray(discountRows)\n      ? discountRows[0] ?? null\n      : discountRows;\n\n    if (!row) {\n      return failure("Discount code is invalid or expired.");\n    }\n\n    discount = row as typeof discount;\n  }\n\n  const codeDiscountMoneyMinor = Math.min(\n    ownershipAdjustedSubtotalMoneyMinor,\n    Math.max(\n      0,\n      Number(discount?.discount_money_minor ?? 0),\n    ),\n  );\n\n  const discountMoneyMinor = Math.min(\n    baseMoneyMinor,\n    ownershipDiscountMoneyMinor + codeDiscountMoneyMinor,\n  );\n\n  const expectedTotalMoneyMinor = Math.max(\n    0,\n    baseMoneyMinor - discountMoneyMinor,\n  );\n\n  const { data: order, error: orderError } = await admin\n    .from("store_orders")\n    .insert({\n      user_id: user.id,\n      character_id: character.id,\n      status: "pending",\n      payment_method: "stripe",\n      currency: price.currency,\n      subtotal_money_minor: baseMoneyMinor,\n      discount_money_minor: discountMoneyMinor,\n      total_money_minor: expectedTotalMoneyMinor,\n      subtotal_remnants: 0,\n      discount_remnants: 0,\n      total_remnants: 0,\n      discount_code_id: discount?.discount_code_id ?? null,\n      user_discount_code_id:\n        discount?.user_discount_code_id ?? null,\n    })\n    .select("id")\n    .single();\n\n  if (orderError || !order) {\n    return failure(\n      orderError?.message ?? "Unable to create Store order.",\n    );\n  }\n\n  const { data: item, error: itemError } = await admin\n    .from("store_order_items")\n    .insert({\n      order_id: order.id,\n      product_id: product.id,\n      product_slug_snapshot: product.slug,\n      product_name_snapshot: product.name,\n      product_type_snapshot: product.product_type,\n      category_snapshot: product.category,\n      quantity: 1,\n      unit_money_minor_snapshot: baseMoneyMinor,\n      total_money_minor_snapshot: baseMoneyMinor,\n      unit_remnants_snapshot: null,\n      total_remnants_snapshot: null,\n    })\n    .select("id")\n    .single();\n\n  if (itemError || !item) {\n    await admin.from("store_orders").delete().eq("id", order.id);\n    return failure(\n      itemError?.message ?? "Unable to create Store order item.",\n    );\n  }\n\n  const snapshots = missingGrants.map((grant) => ({\n    order_id: order.id,\n    order_item_id: item.id,\n    grant_type: grant.grant_type,\n    portal_skin_id: grant.portal_skin_id,\n    cosmetic_item_id: grant.cosmetic_item_id,\n    music_track_id: grant.music_track_id,\n    feature_key: grant.feature_key,\n    quantity: grant.quantity,\n  }));\n\n  const { error: snapshotError } = await admin\n    .from("store_order_grants")\n    .insert(snapshots);\n\n  if (snapshotError) {\n    await admin.from("store_orders").delete().eq("id", order.id);\n    return failure(snapshotError.message);\n  }\n\n  const discountDescription = [\n    ownershipDiscountMoneyMinor > 0\n      ? `Bundle ownership ${ownedBundleItemCount}/${bundleItemCount}`\n      : null,\n    discount ? `Store code ${discountCode.toUpperCase()}` : null,\n  ]\n    .filter(Boolean)\n    .join(" + ");\n\n  try {\n    const checkout = await createManagedStoreCheckout({\n      stripePriceId: syncedStripePriceId,\n      customerEmail,\n      currency: String(price.currency).toUpperCase(),\n      discountMoneyMinor,\n      orderId: order.id,\n      productId: product.id,\n      userId: user.id,\n      characterId: character.id,\n      discountDescription,\n    });\n\n    const { error: linkError } = await admin\n      .from("store_orders")\n      .update({\n        stripe_checkout_session_id:\n          checkout.checkoutSessionId,\n      })\n      .eq("id", order.id);\n\n    if (linkError) {\n      await admin\n        .from("store_orders")\n        .update({ status: "failed" })\n        .eq("id", order.id);\n\n      return failure(linkError.message);\n    }\n\n    return {\n      ok: true,\n      error: null,\n      checkoutUrl: checkout.checkoutUrl,\n      checkoutSessionId: checkout.checkoutSessionId,\n    };\n  } catch (error) {\n    await admin\n      .from("store_orders")\n      .update({ status: "failed" })\n      .eq("id", order.id);\n\n    return failure(\n      error instanceof Error\n        ? error.message\n        : "Stripe could not create the checkout.",\n    );\n  }\n}\n'.strip() + "\n"
write(actions_rel, actions)

# New Stripe client button.
stripe_button_rel = "components/store/store-stripe-purchase-button.tsx"
if (ROOT / stripe_button_rel).exists():
    fail("store-stripe-purchase-button.tsx already exists.")
write(stripe_button_rel, '"use client";\n\nimport { useActionState, useEffect } from "react";\n\nimport {\n  startStoreStripeCheckout,\n  type StoreStripeState,\n} from "@/app/(portal)/store/actions";\n\nconst initialState: StoreStripeState = {\n  ok: false,\n  error: null,\n  checkoutUrl: null,\n  checkoutSessionId: null,\n};\n\nexport function StoreStripePurchaseButton({\n  productId,\n  priceId,\n  label,\n}: {\n  productId: string;\n  priceId: string;\n  label: string;\n}) {\n  const [state, action, pending] = useActionState(\n    startStoreStripeCheckout,\n    initialState,\n  );\n\n  useEffect(() => {\n    if (!state.ok || !state.checkoutUrl) return;\n    window.location.assign(state.checkoutUrl);\n  }, [state.ok, state.checkoutUrl]);\n\n  return (\n    <form action={action} className="mt-2">\n      <input type="hidden" name="productId" value={productId} />\n      <input type="hidden" name="priceId" value={priceId} />\n\n      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">\n        <input\n          type="text"\n          name="discountCode"\n          autoComplete="off"\n          placeholder="Discount code (optional)"\n          className="min-w-0 w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"\n        />\n\n        <button\n          type="submit"\n          disabled={pending}\n          className="whitespace-nowrap border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55"\n        >\n          {pending ? "Opening..." : `Buy for ${label}`}\n        </button>\n      </div>\n\n      {state.error ? (\n        <p className="mt-2 text-[9px] leading-4 text-red-300">\n          {state.error}\n        </p>\n      ) : null}\n    </form>\n  );\n}\n')

# Store page: switch component and remove Paddle price field from UI query/type.
page_rel = "app/(portal)/store/page.tsx"
page = read(page_rel)
page = page.replace(
    'import { StorePaddlePurchaseButton } from "@/components/store/store-paddle-purchase-button";',
    'import { StoreStripePurchaseButton } from "@/components/store/store-stripe-purchase-button";',
    1,
)
page = page.replace("  paddle_price_id: string | null;\n", "", 1)
page = page.replace(
    '"id, product_id, currency, money_amount_minor, remnants_amount, paddle_price_id",',
    '"id, product_id, currency, money_amount_minor, remnants_amount",',
    1,
)
page = page.replace("<StorePaddlePurchaseButton", "<StoreStripePurchaseButton")
write(page_rel, page)

# The old browser-side Paddle component is now unused; remove it.
old_button = ROOT / "components/store/store-paddle-purchase-button.tsx"
if old_button.exists():
    old_button.unlink()

print("Stripe Managed Payments checkout patch applied.")
print("Changed:")
print("  ~ lib/store/stripe-server.ts")
print("  ~ app/(portal)/store/actions.ts")
print("  + components/store/store-stripe-purchase-button.tsx")
print("  ~ app/(portal)/store/page.tsx")
print("  - components/store/store-paddle-purchase-button.tsx")
print("")
print("Next: npm run build")
