import { redirect } from "next/navigation";

import { ContributionCheckout } from "@/components/contributions/contribution-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export default async function ContributionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [productsResult, pricesResult] = await Promise.all([
    admin
      .from("support_contribution_products")
      .select("id, name, description, sort_order, pricing_mode, custom_min_amount_minor, custom_max_amount_minor")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    admin
      .from("support_contribution_prices")
      .select("id, product_id, amount_minor, currency, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (pricesResult.error) throw new Error(pricesResult.error.message);

  const products = productsResult.data ?? [];
  const prices = pricesResult.data ?? [];

  const fixedOptions = prices.flatMap((price) => {
    const product = products.find(
      (item) =>
        item.id === price.product_id &&
        (item.pricing_mode ?? "fixed") === "fixed",
    );
    if (!product) return [];

    return [{
      id: `fixed:${price.id}`,
      productId: product.id,
      priceId: price.id,
      pricingMode: "fixed" as const,
      productName: product.name,
      description: product.description,
      amountMinor: Number(price.amount_minor),
      currency: price.currency,
      minAmountMinor: null,
      maxAmountMinor: null,
      sortOrder: Number(product.sort_order ?? 0),
    }];
  });

  const customOptions = products
    .filter((product) => product.pricing_mode === "custom")
    .map((product) => ({
      id: `custom:${product.id}`,
      productId: product.id,
      priceId: null,
      pricingMode: "custom" as const,
      productName: product.name,
      description: product.description,
      amountMinor: null,
      currency: "GBP",
      minAmountMinor: Number(product.custom_min_amount_minor ?? 100),
      maxAmountMinor: Number(product.custom_max_amount_minor ?? 50000),
      sortOrder: Number(product.sort_order ?? 0),
    }));

  const options = [...fixedOptions, ...customOptions].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <main
      data-contribution-page
      className="flex h-full min-h-0 w-full flex-col p-2 sm:p-5 contribution_main"
    >
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[rgb(var(--sep-skin-c1))]/30 bg-[rgb(var(--sep-colour-15100d))]/82 shadow-[0_10px_26px_rgba(var(--sep-rgb-0-0-0),0.2)] contribution_section">
        <header className="shrink-0 border-b border-[rgb(var(--sep-skin-c1))]/25 bg-[rgb(var(--sep-colour-211a14))] px-4 py-4 sm:px-5 contribution_header">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-skin-c1))] contribution_p1">
            Support Sepulchria
          </p>
          <h1 className="mt-1 font-serif text-2xl normal-case text-[rgb(var(--sep-global-c2))] sm:text-3xl contribution_h1">
            Make a contribution
          </h1>
          <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-global-c1))] contribution_p2">
            Make a voluntary one-off contribution to help with the continued development and running of Sepulchria.
          </p>
        </header>

        <div data-portal-scroll className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 contribution_content">
          {options.length ? (
            <ContributionCheckout options={options} />
          ) : (
            <p className="border border-[rgb(var(--sep-skin-c1))]/25 bg-[rgb(var(--sep-colour-100c09))] p-4 text-[11px] text-[rgb(var(--sep-global-c1))] contribution_empty">
              No contribution options are currently available.
            </p>
          )}

          <p className="mt-5 border-t border-[rgb(var(--sep-skin-c1))]/20 pt-4 text-[9px] leading-5 text-[rgb(var(--sep-colour-756957))] contribution_payment_note">
            Payments are processed securely through Stripe Managed Payments.
          </p>
        </div>
      </section>
    </main>
  );
}
