"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { syncContributionProductToStripe } from "@/lib/contributions/stripe-server";
import { createAdminClient } from "@/lib/supabase/admin";

function read(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function number(fd: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(read(fd, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function amountMinor(fd: FormData) {
  const raw = read(fd, "amount");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Enter a valid amount.");
  }
  const value = Math.round(Number(raw) * 100);
  if (value <= 0) throw new Error("Amount must be greater than zero.");
  return value;
}

async function auth() {
  await requireAdminSection("store");
}

function refresh() {
  revalidatePath("/admin/contributions");
  revalidatePath("/contribution");
}

export async function createContributionProduct(fd: FormData) {
  await auth();
  const admin = createAdminClient();

  const { error } = await admin.from("support_contribution_products").insert({
    name: read(fd, "name"),
    slug: read(fd, "slug"),
    description: read(fd, "description"),
    image_url: read(fd, "image_url") || null,
    tax_code: read(fd, "tax_code"),
    sort_order: number(fd, "sort_order"),
    is_active: fd.get("is_active") === "on",
  });

  if (error) throw new Error(error.message);
  refresh();
}

export async function updateContributionProduct(fd: FormData) {
  await auth();
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_contribution_products")
    .update({
      name: read(fd, "name"),
      slug: read(fd, "slug"),
      description: read(fd, "description"),
      image_url: read(fd, "image_url") || null,
      tax_code: read(fd, "tax_code"),
      sort_order: number(fd, "sort_order"),
      is_active: fd.get("is_active") === "on",
      stripe_sync_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", read(fd, "id"));

  if (error) throw new Error(error.message);
  refresh();
}

export async function addContributionPrice(fd: FormData) {
  await auth();
  const admin = createAdminClient();

  const { error } = await admin.from("support_contribution_prices").insert({
    product_id: read(fd, "product_id"),
    currency: (read(fd, "currency") || "GBP").toUpperCase(),
    amount_minor: amountMinor(fd),
    sort_order: number(fd, "sort_order"),
    is_active: fd.get("is_active") === "on",
  });

  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteContributionPrice(fd: FormData) {
  await auth();
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_contribution_prices")
    .delete()
    .eq("id", read(fd, "id"));

  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteContributionProduct(fd: FormData) {
  await auth();
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_contribution_products")
    .delete()
    .eq("id", read(fd, "id"));

  if (error) throw new Error(error.message);
  refresh();
}

export async function syncContributionProduct(fd: FormData) {
  await auth();
  await syncContributionProductToStripe(read(fd, "id"));
  refresh();
}
