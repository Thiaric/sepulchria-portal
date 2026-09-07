from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "c54cfdb"

def head():
    return subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        cwd=ROOT,
        encoding="utf-8",
        errors="strict",
    ).strip()

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exact block once, found {count}. No file written.")
    return text.replace(old, new, 1)

current = head()
if current != EXPECTED_HEAD:
    raise SystemExit(f"This patch is for {EXPECTED_HEAD}; your local HEAD is {current}.")

# 1) Refunds: positive sign/green/filtering/label.
ledger_path = ROOT / "components" / "economy" / "ledger-entries.tsx"
ledger = ledger_path.read_text(encoding="utf-8")
ledger_original = ledger

old = '''function amountLabel(entry: LedgerFilterEntry) {
  if (entry.kind === "money") {
    return `−${moneyLabel(entry)}`;
  }

  return formatSignedRemnants(Number(entry.amount));
}

function movementValue(entry: LedgerFilterEntry) {
  if (entry.kind === "money") return -Math.abs(Number(entry.money_amount_minor ?? 0));
  return Number(entry.amount);
}'''

new = '''function amountLabel(entry: LedgerFilterEntry) {
  if (entry.kind === "money") {
    const amount = Number(entry.amount);
    const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
    return `${sign}${moneyLabel(entry)}`;
  }

  return formatSignedRemnants(Number(entry.amount));
}

function movementValue(entry: LedgerFilterEntry) {
  return Number(entry.amount);
}'''

ledger = replace_once(ledger, old, new, "Ledger money sign logic")

old = '''            const balanceText = isMoney
              ? "Real-money Store purchase"
              : `Balance ${formatRemnants(Number(entry.balance_after ?? 0))}`;'''

new = '''            const balanceText = isMoney
              ? amount > 0
                ? "Real-money Store refund"
                : "Real-money Store purchase"
              : `Balance ${formatRemnants(Number(entry.balance_after ?? 0))}`;'''

ledger = replace_once(ledger, old, new, "Ledger money movement label")
ledger_path.write_text(ledger, encoding="utf-8")

# 2) Discount update/delete server actions.
actions_path = ROOT / "app" / "(portal)" / "admin" / "store" / "actions.ts"
actions = actions_path.read_text(encoding="utf-8")

actions_anchor = '''export async function toggleStoreDiscount(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_discount_codes")
    .update({ is_active: str(formData, "next") === "true" })
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to update discount: ${error.message}`);
  refresh();
}


export async function createStorePostPurchaseOffer'''

actions_replacement = '''export async function updateStoreDiscount(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const id = str(formData, "id");
  const discountType = str(formData, "discount_type");
  const scopeType = str(formData, "scope_type");
  const productIds = formData
    .getAll("product_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (scopeType === "products" && !productIds.length) {
    throw new Error("Select at least one product for a product-scoped discount.");
  }

  const { error } = await admin
    .from("store_discount_codes")
    .update({
      code: nullableStr(formData, "code")?.toUpperCase() ?? null,
      name: str(formData, "name"),
      description: str(formData, "description"),
      discount_type: discountType,
      discount_value: intOrNull(formData, "discount_value"),
      currency:
        discountType === "fixed_money"
          ? (nullableStr(formData, "currency")?.toUpperCase() ?? "GBP")
          : null,
      scope_type: scopeType,
      scope_category:
        scopeType === "category"
          ? nullableStr(formData, "scope_category")
          : null,
      max_redemptions: intOrNull(formData, "max_redemptions"),
      max_redemptions_per_user:
        intOrNull(formData, "max_redemptions_per_user") ?? 1,
      minimum_money_minor: intOrNull(formData, "minimum_money_minor"),
      minimum_remnants: intOrNull(formData, "minimum_remnants"),
      is_public: bool(formData, "is_public"),
      is_active: bool(formData, "is_active"),
      starts_at: nullableStr(formData, "starts_at"),
      ends_at: nullableStr(formData, "ends_at"),
    })
    .eq("id", id);

  if (error) throw new Error(`Unable to update discount: ${error.message}`);

  const { error: clearScopeError } = await admin
    .from("store_discount_code_products")
    .delete()
    .eq("discount_code_id", id);

  if (clearScopeError) {
    throw new Error(`Unable to update discount product scope: ${clearScopeError.message}`);
  }

  if (scopeType === "products") {
    const { error: scopeError } = await admin
      .from("store_discount_code_products")
      .insert(
        productIds.map((productId) => ({
          discount_code_id: id,
          product_id: productId,
        })),
      );

    if (scopeError) {
      throw new Error(`Unable to save discount product scope: ${scopeError.message}`);
    }
  }

  refresh();
}

export async function deleteStoreDiscount(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();
  const id = str(formData, "id");

  const { error: scopeError } = await admin
    .from("store_discount_code_products")
    .delete()
    .eq("discount_code_id", id);

  if (scopeError) throw new Error(`Unable to remove discount scope: ${scopeError.message}`);

  const { error } = await admin
    .from("store_discount_codes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Unable to delete discount: ${error.message}`);
  refresh();
}

export async function toggleStoreDiscount(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_discount_codes")
    .update({ is_active: str(formData, "next") === "true" })
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to update discount: ${error.message}`);
  refresh();
}


export async function createStorePostPurchaseOffer'''

actions = replace_once(actions, actions_anchor, actions_replacement, "Discount update/delete server actions")
actions_path.write_text(actions, encoding="utf-8")

# 3) Admin page: load scopes + editable discount cards.
page_path = ROOT / "app" / "(portal)" / "admin" / "store" / "page.tsx"
page = page_path.read_text(encoding="utf-8")

page = replace_once(page,
'''  deleteStoreGrant,
  deleteStorePrice,
  deleteStoreProduct,
  saveStorePrice,''',
'''  deleteStoreDiscount,
  deleteStoreGrant,
  deleteStorePrice,
  deleteStoreProduct,
  saveStorePrice,''',
"Import deleteStoreDiscount")

page = replace_once(page,
'''  syncExistingPremiumCatalogueToStore,
  toggleStoreDiscount,
  updateStoreProduct,''',
'''  syncExistingPremiumCatalogueToStore,
  toggleStoreDiscount,
  updateStoreDiscount,
  updateStoreProduct,''',
"Import updateStoreDiscount")

page = replace_once(page,
'''    musicResult,
    discountsResult,
  ] = await Promise.all([''',
'''    musicResult,
    discountsResult,
    discountProductScopesResult,
  ] = await Promise.all([''',
"Add discount scope result variable")

page = replace_once(page,
'''    admin.from("store_discount_codes").select("*").order("created_at", { ascending: false }),
  ]);''',
'''    admin.from("store_discount_codes").select("*").order("created_at", { ascending: false }),
    admin.from("store_discount_code_products").select("discount_code_id, product_id"),
  ]);''',
"Load discount product scopes")

page = replace_once(page,
'''    musicResult,
    discountsResult,
  ]) {''',
'''    musicResult,
    discountsResult,
    discountProductScopesResult,
  ]) {''',
"Validate discount product scopes result")

page = replace_once(page,
'''  const discounts = discountsResult.data ?? [];

  const skinById''',
'''  const discounts = discountsResult.data ?? [];
  const discountProductScopes = discountProductScopesResult.data ?? [];

  const productIdsByDiscount = new Map<string, Set<string>>();
  for (const row of discountProductScopes) {
    const current =
      productIdsByDiscount.get(String(row.discount_code_id)) ??
      new Set<string>();
    current.add(String(row.product_id));
    productIdsByDiscount.set(String(row.discount_code_id), current);
  }

  const skinById''',
"Build discount scope lookup")

old_list = '''          <div className="mt-5 space-y-2">
            {discounts.map((discount) => (
              <div key={discount.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 px-3 py-3">
                <div>
                  <p className="text-sm text-[rgb(var(--sep-skin-c1,169_138_96))]">
                    {discount.code ?? discount.name}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                    {discount.discount_type} · {discount.discount_value}
                    {discount.is_active ? " · active" : " · disabled"}
                  </p>
                </div>

                <AdminActionForm action={toggleStoreDiscount} successMessage="Discount updated.">
                  <input type="hidden" name="id" value={discount.id} />
                  <input type="hidden" name="next" value={discount.is_active ? "false" : "true"} />
                  <button className={button}>
                    {discount.is_active ? "Disable" : "Enable"}
                  </button>
                </AdminActionForm>
              </div>
            ))}
          </div>'''

new_list = '''          <div className="mt-5 space-y-2">
            {discounts.map((discount) => {
              const selectedProductIds =
                productIdsByDiscount.get(String(discount.id)) ??
                new Set<string>();

              return (
                <details
                  key={discount.id}
                  className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/20"
                >
                  <summary className="cursor-pointer px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-[rgb(var(--sep-skin-c1,169_138_96))]">
                          {discount.code ?? discount.name}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                          {discount.discount_type} · {discount.discount_value}
                          {discount.is_active ? " · active" : " · disabled"}
                        </p>
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                        Edit
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-3 sm:p-4">
                    <AdminActionForm
                      action={updateStoreDiscount}
                      successMessage="Discount saved."
                      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                    >
                      <input type="hidden" name="id" value={discount.id} />

                      <label><span className={label}>Name</span><input name="name" required defaultValue={discount.name ?? ""} className={field} /></label>
                      <label><span className={label}>Code</span><input name="code" defaultValue={discount.code ?? ""} className={field} /></label>
                      <label><span className={label}>Type</span><select name="discount_type" defaultValue={discount.discount_type} className={field}><option value="percentage">Percentage</option><option value="fixed_money">Fixed real money</option><option value="fixed_remnants">Fixed Remnants</option></select></label>
                      <label><span className={label}>Value</span><input name="discount_value" type="number" min="1" required defaultValue={discount.discount_value ?? ""} className={field} /></label>
                      <label><span className={label}>Currency</span><input name="currency" defaultValue={discount.currency ?? "GBP"} maxLength={3} className={field} /></label>
                      <label><span className={label}>Scope</span><select name="scope_type" defaultValue={discount.scope_type} className={field}><option value="all">Everything</option><option value="products">Selected products</option><option value="category">Category</option></select></label>
                      <label><span className={label}>Category scope</span><select name="scope_category" className={field} defaultValue={discount.scope_category ?? ""}><option value="">—</option><option value="skin">Skin</option><option value="cosmetic">Cosmetic</option><option value="music">Music</option><option value="friend_list">Friend List</option><option value="private_location">Private Location</option><option value="bundle">Bundle</option></select></label>
                      <label><span className={label}>Product scope</span><select name="product_ids" multiple size={5} className={field} defaultValue={[...selectedProductIds]}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                      <label><span className={label}>Minimum money (minor units)</span><input name="minimum_money_minor" type="number" min="0" defaultValue={discount.minimum_money_minor ?? ""} className={field} /></label>
                      <label><span className={label}>Minimum Remnants</span><input name="minimum_remnants" type="number" min="0" defaultValue={discount.minimum_remnants ?? ""} className={field} /></label>
                      <label><span className={label}>Max total uses</span><input name="max_redemptions" type="number" min="1" defaultValue={discount.max_redemptions ?? ""} className={field} /></label>
                      <label><span className={label}>Max uses / user</span><input name="max_redemptions_per_user" type="number" min="1" defaultValue={discount.max_redemptions_per_user ?? 1} className={field} /></label>
                      <label><span className={label}>Starts</span><input name="starts_at" type="datetime-local" defaultValue={discount.starts_at ? String(discount.starts_at).slice(0, 16) : ""} className={field} /></label>
                      <label><span className={label}>Ends</span><input name="ends_at" type="datetime-local" defaultValue={discount.ends_at ? String(discount.ends_at).slice(0, 16) : ""} className={field} /></label>

                      <div className="flex flex-wrap items-end gap-4">
                        <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]"><input name="is_public" type="checkbox" defaultChecked={discount.is_public} />Public code</label>
                        <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]"><input name="is_active" type="checkbox" defaultChecked={discount.is_active} />Active</label>
                      </div>

                      <div className="md:col-span-2 xl:col-span-4"><button className={button}>Save discount</button></div>
                    </AdminActionForm>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminActionForm action={toggleStoreDiscount} successMessage="Discount updated.">
                        <input type="hidden" name="id" value={discount.id} />
                        <input type="hidden" name="next" value={discount.is_active ? "false" : "true"} />
                        <button className={button}>{discount.is_active ? "Disable" : "Enable"}</button>
                      </AdminActionForm>

                      <AdminActionForm action={deleteStoreDiscount} successMessage="Discount deleted.">
                        <input type="hidden" name="id" value={discount.id} />
                        <button className={dangerButton}>Delete discount</button>
                      </AdminActionForm>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>'''

page = replace_once(page, old_list, new_list, "Editable discount list")
page_path.write_text(page, encoding="utf-8")

print("Patched:")
print(" - components/economy/ledger-entries.tsx")
print(" - app/(portal)/admin/store/actions.ts")
print(" - app/(portal)/admin/store/page.tsx")
print("Refunds now show +/green and filter as positive movements.")
print("Discount codes are expandable, editable, and deleteable.")
print("Run: npm run build")
