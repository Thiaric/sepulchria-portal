import { AdminActionForm } from "@/components/admin/admin-action-ui";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  addContributionPrice,
  createContributionProduct,
  deleteContributionPrice,
  deleteContributionProduct,
  syncContributionProduct,
  updateContributionProduct,
} from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))]";
const button =
  "border border-[rgb(var(--sep-skin-c1,169_138_96))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c1,169_138_96))]";
const danger =
  "border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export default async function AdminContributionsPage() {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const [productsResult, pricesResult] = await Promise.all([
    admin.from("support_contribution_products").select("*").order("sort_order").order("name"),
    admin.from("support_contribution_prices").select("*").order("sort_order").order("created_at"),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (pricesResult.error) throw new Error(pricesResult.error.message);

  const products = productsResult.data ?? [];
  const prices = pricesResult.data ?? [];

  return (
    <main className="admin-compact h-full overflow-y-auto p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Administration
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Contributions
        </h1>
        <p className="mt-3 text-sm text-[rgb(var(--sep-skin-c2,211_194_170))]">
          Separate Contribution catalogue synced to Stripe and used with Managed Payments.
        </p>

        <section className="mt-8 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-5">
          <h2 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
            Create product
          </h2>

          <AdminActionForm
            action={createContributionProduct}
            successMessage="Contribution product created."
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <input name="name" required placeholder="Name" className={field} />
            <input name="slug" required placeholder="Slug" className={field} />
            <textarea name="description" rows={3} placeholder="Description" className={`${field} md:col-span-2`} />
            <input name="image_url" placeholder="Image URL" className={field} />
            <input name="tax_code" required placeholder="Stripe tax code: txcd_..." className={field} />
            <input name="sort_order" type="number" defaultValue="0" className={field} />
            <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
              <input name="is_active" type="checkbox" defaultChecked /> Active
            </label>
            <div className="md:col-span-2">
              <button className={button}>Create product</button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-4">
          {products.map((product) => {
            const productPrices = prices.filter((price) => price.product_id === product.id);

            return (
              <details key={product.id} className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-120e0b))]">
                <summary className="cursor-pointer px-4 py-4">
                  <span className="font-serif text-xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
                    {product.name}
                  </span>
                  <span className="ml-3 text-[8px] uppercase text-[rgb(var(--sep-skin-c2,211_194_170))]">
                    {product.stripe_sync_status}
                  </span>
                </summary>

                <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4">
                  <AdminActionForm
                    action={updateContributionProduct}
                    successMessage="Contribution product saved."
                    className="grid gap-3 md:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={product.id} />
                    <input name="name" defaultValue={product.name} required className={field} />
                    <input name="slug" defaultValue={product.slug} required className={field} />
                    <textarea name="description" rows={3} defaultValue={product.description} className={`${field} md:col-span-2`} />
                    <input name="image_url" defaultValue={product.image_url ?? ""} className={field} />
                    <input name="tax_code" defaultValue={product.tax_code} required className={field} />
                    <input name="sort_order" type="number" defaultValue={product.sort_order} className={field} />
                    <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                      <input name="is_active" type="checkbox" defaultChecked={product.is_active} /> Active
                    </label>
                    <div className="md:col-span-2">
                      <button className={button}>Save product</button>
                    </div>
                  </AdminActionForm>

                  <div className="mt-5 border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4">
                    <h3 className="font-serif text-lg text-[rgb(var(--sep-skin-c1,169_138_96))]">Prices</h3>

                    <div className="mt-3 space-y-2">
                      {productPrices.map((price) => (
                        <div key={price.id} className="flex items-center justify-between text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                          <span>{money(Number(price.amount_minor), price.currency)} · {price.stripe_sync_status}</span>
                          <AdminActionForm action={deleteContributionPrice} successMessage="Price removed.">
                            <input type="hidden" name="id" value={price.id} />
                            <button className={danger}>Remove</button>
                          </AdminActionForm>
                        </div>
                      ))}
                    </div>

                    <AdminActionForm
                      action={addContributionPrice}
                      successMessage="Price added."
                      className="mt-4 grid gap-3 sm:grid-cols-4"
                    >
                      <input type="hidden" name="product_id" value={product.id} />
                      <input name="amount" type="number" min="0.50" step="0.01" required placeholder="Amount" className={field} />
                      <input name="currency" defaultValue="GBP" required className={field} />
                      <input name="sort_order" type="number" defaultValue="0" className={field} />
                      <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                        <input name="is_active" type="checkbox" defaultChecked /> Active
                      </label>
                      <div className="sm:col-span-4">
                        <button className={button}>Add price</button>
                      </div>
                    </AdminActionForm>
                  </div>

                  {product.stripe_sync_error ? (
                    <p className="mt-4 text-xs text-red-300">
                      Stripe sync error: {product.stripe_sync_error}
                    </p>
                  ) : null}

                  <div className="mt-5 flex gap-3">
                    <AdminActionForm action={syncContributionProduct} successMessage="Synced to Stripe.">
                      <input type="hidden" name="id" value={product.id} />
                      <button className={button}>Sync to Stripe</button>
                    </AdminActionForm>

                    <AdminActionForm action={deleteContributionProduct} successMessage="Contribution product deleted.">
                      <input type="hidden" name="id" value={product.id} />
                      <button className={danger}>Delete product</button>
                    </AdminActionForm>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </main>
  );
}
