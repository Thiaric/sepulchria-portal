import { redirect } from "next/navigation";

import { ContributionCheckout } from "@/components/contributions/contribution-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ContributionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <main className="flex min-h-full w-full items-start justify-center p-3 sm:p-6 lg:p-8">
      <section className="w-full max-w-3xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))]/90">
        <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-211a14))] px-5 py-5 sm:px-7 sm:py-6">
          <p className="normal-case text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-876a46))]">
            Sepulchria · contribution
          </p>
          <h1 className="mt-2 font-serif text-3xl normal-case text-[rgb(var(--sep-colour-e5cfa6))]">
            Support Sepulchria
          </h1>
          <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
            Make a voluntary one-off contribution to support Sepulchria.
          </p>
        </header>

        <div className="px-5 py-6 sm:px-7">
          {options.length ? (
            <ContributionCheckout options={options} />
          ) : (
            <p className="text-sm text-[rgb(var(--sep-colour-a99b89))]">
              No contribution options are currently available.
            </p>
          )}

          <p className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5 text-[10px] text-[rgb(var(--sep-colour-756957))]">
            Payments are processed through Stripe Managed Payments.
          </p>
        </div>
      </section>
    </main>
  );
}
