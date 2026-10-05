import { AdminActionForm } from "@/components/admin/admin-action-ui";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  addContributionPrice,
  cancelPendingContribution,
  createContributionProduct,
  deleteContributionPrice,
  deleteContributionProduct,
  refundContribution,
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

function dateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizedEnvironment(value: string | null | undefined) {
  const environment = (value ?? "").trim().toLowerCase();
  return environment === "live" || environment === "production"
    ? "live"
    : "test";
}

export default async function AdminContributionsPage() {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const [productsResult, pricesResult, contributionsResult] = await Promise.all([
    admin.from("support_contribution_products").select("*").order("sort_order").order("name"),
    admin.from("support_contribution_prices").select("*").order("sort_order").order("created_at"),
    admin
      .from("support_contributions")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (pricesResult.error) throw new Error(pricesResult.error.message);
  if (contributionsResult.error) throw new Error(contributionsResult.error.message);

  const products = productsResult.data ?? [];
  const prices = pricesResult.data ?? [];
  const contributions = contributionsResult.data ?? [];

  const characterIds = Array.from(
    new Set(
      contributions
        .map((contribution) => contribution.character_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: contributionCharacters, error: contributionCharactersError } =
    characterIds.length > 0
      ? await admin
          .from("characters")
          .select("id, display_name, first_name, surname")
          .in("id", characterIds)
      : { data: [], error: null };

  if (contributionCharactersError) {
    throw new Error(contributionCharactersError.message);
  }

  const characterNames = new Map(
    (contributionCharacters ?? []).map((character) => [
      character.id,
      character.display_name ||
        [character.first_name, character.surname].filter(Boolean).join(" ") ||
        "Unknown character",
    ]),
  );

  const currentStripeEnvironment = normalizedEnvironment(
    process.env.STRIPE_ENVIRONMENT,
  );

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

        <section
          id="admin-contribution-create"
          data-admin-contribution-create="true"
          className="mt-8 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-5"
        >
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
            <select name="pricing_mode" defaultValue="fixed" className={field}>
              <option value="fixed">Fixed price</option>
              <option value="custom">Choose your amount</option>
            </select>
            <input
              name="custom_min_amount"
              type="number"
              min="1"
              max="500"
              step="0.01"
              defaultValue="1"
              placeholder="Custom minimum (£)"
              className={field}
            />
            <input
              name="custom_max_amount"
              type="number"
              min="1"
              max="500"
              step="0.01"
              defaultValue="500"
              placeholder="Custom maximum (£)"
              className={field}
            />
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
              <details
                key={product.id}
                id={`admin-contribution-product-${product.id}`}
                data-admin-contribution-product="true"
                data-admin-contribution-product-id={product.id}
                data-admin-contribution-product-name={product.name}
                data-admin-contribution-product-slug={product.slug}
                data-admin-contribution-product-status={product.stripe_sync_status}
                data-admin-contribution-product-active={product.is_active ? "true" : "false"}
                className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-120e0b))]"
              >
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
                    <select
                      name="pricing_mode"
                      defaultValue={product.pricing_mode ?? "fixed"}
                      className={field}
                    >
                      <option value="fixed">Fixed price</option>
                      <option value="custom">Choose your amount</option>
                    </select>
                    <input
                      name="custom_min_amount"
                      type="number"
                      min="1"
                      max="500"
                      step="0.01"
                      defaultValue={
                        product.custom_min_amount_minor
                          ? Number(product.custom_min_amount_minor) / 100
                          : 1
                      }
                      placeholder="Custom minimum (£)"
                      className={field}
                    />
                    <input
                      name="custom_max_amount"
                      type="number"
                      min="1"
                      max="500"
                      step="0.01"
                      defaultValue={
                        product.custom_max_amount_minor
                          ? Number(product.custom_max_amount_minor) / 100
                          : 500
                      }
                      placeholder="Custom maximum (£)"
                      className={field}
                    />
                    <input name="sort_order" type="number" defaultValue={product.sort_order} className={field} />
                    <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                      <input name="is_active" type="checkbox" defaultChecked={product.is_active} /> Active
                    </label>
                    <div className="md:col-span-2">
                      <button className={button}>Save product</button>
                    </div>
                  </AdminActionForm>

                  <div className="mt-5 border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4">
                    <h3 className="font-serif text-lg text-[rgb(var(--sep-skin-c1,169_138_96))]">
                      {product.pricing_mode === "custom" ? "Choose your amount" : "Prices"}
                    </h3>

                    {product.pricing_mode === "custom" ? (
                      <p className="mt-3 text-xs leading-5 text-[rgb(var(--sep-skin-c2,211_194_170))]">
                        Players choose the amount at checkout. Allowed range:{" "}
                        {money(Number(product.custom_min_amount_minor ?? 100), "GBP")} –{" "}
                        {money(Number(product.custom_max_amount_minor ?? 50000), "GBP")}.
                        No fixed Stripe Price is required; Sync to Stripe creates or updates the persistent Product.
                      </p>
                    ) : (
                      <>
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
                      </>
                    )}
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

        <section
          id="admin-contributions-records"
          className="mt-8 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-5"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/20 pb-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Payment records
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
                All contributions
              </h2>
            </div>
            <p className="text-[10px] text-[rgb(var(--sep-skin-c2,211_194_170))]">
              {contributions.length} record{contributions.length === 1 ? "" : "s"}
            </p>
          </div>

          {contributions.length === 0 ? (
            <p className="py-5 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
              No contributions have been recorded yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/25 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
                    <th className="px-2 py-2 font-normal">When</th>
                    <th className="px-2 py-2 font-normal">By whom</th>
                    <th className="px-2 py-2 font-normal">Amount</th>
                    <th className="px-2 py-2 font-normal">Status</th>
                    <th className="px-2 py-2 font-normal">Environment</th>
                    <th className="px-2 py-2 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((contribution) => {
                    const sameEnvironment =
                      normalizedEnvironment(contribution.stripe_environment) ===
                      currentStripeEnvironment;
                    const characterName = contribution.character_id
                      ? characterNames.get(contribution.character_id) ?? null
                      : null;
                    const canCancel =
                      contribution.status === "pending" && sameEnvironment;
                    const canRefund =
                      (contribution.status === "paid" ||
                        contribution.status === "partially_refunded") &&
                      sameEnvironment &&
                      Boolean(
                        contribution.stripe_payment_intent_id ||
                          contribution.stripe_charge_id,
                      );

                    return (
                      <tr
                        key={contribution.id}
                        id={`admin-contribution-record-${contribution.id}`}
                        data-admin-contribution-record="true"
                        data-admin-contribution-record-id={contribution.id}
                        data-admin-contribution-email={contribution.customer_email ?? ""}
                        data-admin-contribution-character={characterName ?? ""}
                        data-admin-contribution-user={contribution.user_id ?? ""}
                        data-admin-contribution-status={String(contribution.status)}
                        data-admin-contribution-environment={normalizedEnvironment(
                          contribution.stripe_environment,
                        )}
                        data-admin-contribution-amount={money(
                          Number(contribution.amount_minor),
                          contribution.currency,
                        )}
                        className="border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/12 align-top text-[rgb(var(--sep-skin-c2,211_194_170))]"
                      >
                        <td className="whitespace-nowrap px-2 py-3">
                          {dateTime(contribution.paid_at ?? contribution.created_at)}
                        </td>
                        <td className="px-2 py-3">
                          <div className="max-w-[260px]">
                            <p className="break-all text-[11px] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                              {contribution.customer_email || "No email"}
                            </p>
                            {characterName ? (
                              <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-806b50))]">
                                Character: {characterName}
                              </p>
                            ) : null}
                            <p className="mt-1 break-all text-[8px] text-[rgb(var(--sep-colour-675c4d))]">
                              User: {contribution.user_id}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 font-serif text-sm text-[rgb(var(--sep-skin-c1,169_138_96))]">
                          {money(Number(contribution.amount_minor), contribution.currency)}
                        </td>
                        <td className="px-2 py-3 normal-case">
                          {String(contribution.status).replaceAll("_", " ")}
                        </td>
                        <td className="px-2 py-3">
                          {normalizedEnvironment(contribution.stripe_environment)}
                          {!sameEnvironment ? (
                            <span className="ml-1 text-[8px] text-amber-300">
                              (not current)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            {canCancel ? (
                              <AdminActionForm
                                action={cancelPendingContribution}
                                successMessage="Contribution checked against Stripe and updated."
                                pendingLabel="Checking..."
                              >
                                <input type="hidden" name="id" value={contribution.id} />
                                <button className={danger}>Cancel pending</button>
                              </AdminActionForm>
                            ) : null}
                            {canRefund ? (
                              <AdminActionForm
                                action={refundContribution}
                                successMessage="Stripe refund submitted."
                                pendingLabel="Refunding..."
                                busyCursor
                              >
                                <input type="hidden" name="id" value={contribution.id} />
                                <button className={danger}>Refund</button>
                              </AdminActionForm>
                            ) : null}
                            {!canCancel && !canRefund ? (
                              <span className="px-2 py-2 text-[8px] text-[rgb(var(--sep-colour-675c4d))]">
                                —
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
