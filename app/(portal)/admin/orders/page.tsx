import { AdminActionForm } from "@/components/admin/admin-action-form";
import Image from "next/image";

import { RichTextContent } from "@/components/editor/rich-text-content";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { OrderLevelStructure } from "@/components/admin/order-level-structure";
import { OrderMembershipManager } from "@/components/admin/order-membership-manager";
import { AdminOrderCollapsible } from "@/components/admin/admin-order-collapsible";

import {
  createOrder,
  deleteOrder,
  updateOrder,
} from "./actions";

type AssociationRow = {
  id: string;
  name: string;
};

type OrderRow = {
  id: string;
  association_id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  association:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type AdminOrdersPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function associationName(
  association:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null,
): string {
  if (
    Array.isArray(
      association,
    )
  ) {
    return (
      association[0]?.name ??
      "Unknown Association"
    );
  }

  return (
    association?.name ??
    "Unknown Association"
  );
}

function isValidColour(
  value: string | null,
): boolean {
  if (!value) {
    return false;
  }

  return /^#[0-9a-f]{6}$/i.test(
    value,
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  await requireStaff();

  const resolvedSearchParams =
    (await searchParams) ?? {};

  const supabase =
    await createClient();

  const {
    data: associationData,
    error: associationError,
  } = await supabase
    .from("associations")
    .select("id, name")
    .order("name", {
      ascending: true,
    });

  if (associationError) {
    throw new Error(
      `Unable to load associations: ${associationError.message}`,
    );
  }

  const associations =
    (associationData ??
      []) as AssociationRow[];

  const {
    data: orderData,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      association_id,
      name,
      slug,
      summary,
      description,
      image_url,
      banner_url,
      icon_url,
      colour,
      is_active,
      sort_order,
      created_at,
      updated_at,
      association:associations(name)
    `)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (orderError) {
    throw new Error(
      `Unable to load orders: ${orderError.message}`,
    );
  }

  const orders =
    (orderData ??
      []) as unknown as OrderRow[];

  const activeOrderCount =
    orders.filter(
      (order) =>
        order.is_active,
    ).length;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              Order Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Create and maintain the
              Orders operating beneath
              the Associations of
              Sepulchria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminCounter>
              {orders.length}{" "}
              {orders.length === 1
                ? "order"
                : "orders"}
            </AdminCounter>

            <AdminCounter>
              {activeOrderCount} active
            </AdminCounter>
          </div>
        </div>

        {resolvedSearchParams.success ? (
          <div className="mt-6 border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
            {
              resolvedSearchParams.success
            }
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {
              resolvedSearchParams.error
            }
          </div>
        ) : null}

        <section
          id="order-new"
          className="scroll-mt-24 mt-8 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            New Order
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create an Order
          </h3>

          <p className="mt-2 max-w-3xl text-xs leading-6 text-[#8f816e]">
            Every Order belongs to one
            Association. Characters will
            later become members of the
            Order rather than belonging
            directly to the Association.
          </p>

          {associations.length ===
          0 ? (
            <div className="mt-6 border border-amber-800/40 bg-amber-950/15 px-4 py-4 text-sm text-amber-300">
              You must create an
              Association before you can
              create an Order.
            </div>
          ) : (
            <AdminActionForm
              action={createOrder}
              className="mt-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Association">
                  <select
                    name="associationId"
                    required
                    defaultValue=""
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select an
                      Association
                    </option>

                    {associations.map(
                      (
                        association,
                      ) => (
                        <option
                          key={
                            association.id
                          }
                          value={
                            association.id
                          }
                        >
                          {
                            association.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </AdminField>

                <AdminField label="Name">
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={120}
                    placeholder="House of Healing"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Slug">
                  <input
                    type="text"
                    name="slug"
                    maxLength={100}
                    placeholder="Generated automatically"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Sort order">
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={0}
                    min={-9999}
                    max={9999}
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Colour">
                  <input
                    type="text"
                    name="colour"
                    maxLength={32}
                    placeholder="#8c704b"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>

                <div className="md:col-span-2">
                  <AdminField label="Summary">
                    <RichTextEditor
                      name="summary"
                      placeholder="A brief description of this Order."
                      maxTextLength={
                        1100
                      }
                      minHeight={150}
                      variant="lore"
                    />
                  </AdminField>
                </div>

                <div className="md:col-span-2">
                  <AdminField label="Full description">
                    <RichTextEditor
                      name="description"
                      placeholder="Describe the Order, its purpose, traditions, duties and place within its Association."
                      maxTextLength={
                        80000
                      }
                      minHeight={320}
                      variant="lore"
                    />
                  </AdminField>
                </div>

                <AdminField label="Main image URL">
                  <input
                    type="text"
                    name="imageUrl"
                    maxLength={2000}
                    placeholder="/images/orders/healing.jpg"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Banner URL">
                  <input
                    type="text"
                    name="bannerUrl"
                    maxLength={2000}
                    placeholder="/images/orders/healing-banner.jpg"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>

                <div className="md:col-span-2">
                  <AdminField label="Icon URL">
                    <input
                      type="text"
                      name="iconUrl"
                      maxLength={2000}
                      placeholder="/images/orders/healing-icon.png"
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                    />
                  </AdminField>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 accent-[#8b673d]"
                  />

                  Active
                </label>

                <button
                  type="submit"
                  className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
                >
                  Create Order
                </button>
              </div>
            </AdminActionForm>
          )}
        </section>

        <div className="mt-6 space-y-5">
          {orders.map(
            (order) => (
              <AdminOrderCollapsible
                key={order.id}
                id={`order-${order.slug}`}
                name={order.name}
                associationName={
                  associationName(
                    order.association,
                  )
                }
                isActive={order.is_active}
              >

                {order.banner_url ? (
                  <div className="relative h-44 border-b border-[#60482e]/40 bg-[#0b0807]">
                    <Image
                      src={
                        order.banner_url
                      }
                      alt={`${order.name} banner`}
                      fill
                      sizes="100vw"
                      className="object-cover opacity-70"
                      unoptimized
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-transparent to-black/20" />
                  </div>
                ) : null}

                <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
                  <aside className="border-b border-[#60482e]/35 bg-[#0f0b09] p-5 lg:border-b-0 lg:border-r">
                    <div
                      className="relative aspect-[4/3] overflow-hidden border border-[#765937]/55 bg-[#090706]"
                      style={
                        isValidColour(
                          order.colour,
                        )
                          ? {
                              borderColor:
                                order.colour ??
                                undefined,
                            }
                          : undefined
                      }
                    >
                      {order.image_url ? (
                        <Image
                          src={
                            order.image_url
                          }
                          alt={
                            order.name
                          }
                          fill
                          sizes="260px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : order.icon_url ? (
                        <div className="flex h-full items-center justify-center p-10">
                          <Image
                            src={
                              order.icon_url
                            }
                            alt={`${order.name} icon`}
                            width={110}
                            height={110}
                            className="max-h-full w-auto object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center font-serif text-5xl text-[#705334]">
                          {order.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-center">
                      <StatusBadge
                        isActive={
                          order.is_active
                        }
                      />

                      <p className="mt-3 font-serif text-lg text-[#d7c09a]">
                        {associationName(
                          order.association,
                        )}
                      </p>

                      <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-[#746652]">
                        Association
                      </p>

                      <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#887967]">
                        /{order.slug}
                      </p>

                      {order.colour ? (
                        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-[#817461]">
                          <span
                            className="h-3 w-3 rounded-full border border-white/15"
                            style={{
                              backgroundColor:
                                order.colour,
                            }}
                          />

                          {
                            order.colour
                          }
                        </div>
                      ) : null}

                      <div className="mt-5">
                        <InfoCounter
                          label="Sort order"
                          value={
                            order.sort_order
                          }
                        />
                      </div>

                      <p className="mt-4 text-[9px] text-[#756957]">
                        Updated{" "}
                        {formatDate(
                          order.updated_at,
                        )}
                      </p>
                    </div>
                  </aside>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#8c704b]">
                          {
                            associationName(
                              order.association,
                            )
                          }{" "}
                          · Order
                        </p>

                        <h3 className="mt-1 font-serif text-3xl text-[#e3cda5]">
                          {order.name}
                        </h3>
                      </div>

                      {order.icon_url ? (
                        <div className="relative h-16 w-16 border border-[#60482e]/45 bg-[#0b0807] p-2">
                          <Image
                            src={
                              order.icon_url
                            }
                            alt=""
                            fill
                            sizes="64px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                      ) : null}
                    </div>

                    {order.summary ? (
                      <RichTextContent
  body={
    order.summary
  }
  className="text-sm leading-7 text-[#b6a58d]"
/>

                      
                    ) : null}

                    <AdminActionForm
                      action={
                        updateOrder
                      }
                      className="mt-6"
                    >
                      <input
                        type="hidden"
                        name="orderId"
                        value={order.id}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Association">
                          <select
                            name="associationId"
                            required
                            defaultValue={
                              order.association_id
                            }
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          >
                            {associations.map(
                              (
                                association,
                              ) => (
                                <option
                                  key={
                                    association.id
                                  }
                                  value={
                                    association.id
                                  }
                                >
                                  {
                                    association.name
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        </AdminField>

                        <AdminField label="Name">
                          <input
                            type="text"
                            name="name"
                            required
                            defaultValue={
                              order.name
                            }
                            maxLength={
                              120
                            }
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <AdminField label="Slug">
                          <input
                            type="text"
                            name="slug"
                            defaultValue={
                              order.slug
                            }
                            maxLength={
                              100
                            }
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <AdminField label="Sort order">
                          <input
                            type="number"
                            name="sortOrder"
                            defaultValue={
                              order.sort_order
                            }
                            min={-9999}
                            max={9999}
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <AdminField label="Colour">
                          <input
                            type="text"
                            name="colour"
                            defaultValue={
                              order.colour ??
                              ""
                            }
                            maxLength={32}
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <div className="md:col-span-2">
                          <AdminField label="Summary">
                            <RichTextEditor
                              name="summary"
                              defaultValue={
                                order.summary
                              }
                              maxTextLength={
                                1100
                              }
                              minHeight={
                                150
                              }
                              variant="lore"
                            />
                          </AdminField>
                        </div>

                        <div className="md:col-span-2">
                          <AdminField label="Full description">
                            <RichTextEditor
                              name="description"
                              defaultValue={
                                order.description
                              }
                              maxTextLength={
                                80000
                              }
                              minHeight={
                                320
                              }
                              variant="lore"
                            />
                          </AdminField>
                        </div>

                        <AdminField label="Main image URL">
                          <input
                            type="text"
                            name="imageUrl"
                            defaultValue={
                              order.image_url ??
                              ""
                            }
                            maxLength={
                              2000
                            }
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <AdminField label="Banner URL">
                          <input
                            type="text"
                            name="bannerUrl"
                            defaultValue={
                              order.banner_url ??
                              ""
                            }
                            maxLength={
                              2000
                            }
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <div className="md:col-span-2">
                          <AdminField label="Icon URL">
                            <input
                              type="text"
                              name="iconUrl"
                              defaultValue={
                                order.icon_url ??
                                ""
                              }
                              maxLength={
                                2000
                              }
                              className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                            />
                          </AdminField>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                        <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={
                              order.is_active
                            }
                            className="h-4 w-4 accent-[#8b673d]"
                          />

                          Active
                        </label>

                        <button
                          type="submit"
                          className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
                        >
                          Save Order
                        </button>
                      </div>
                    </AdminActionForm>

                    <OrderLevelStructure orderId={order.id} />

                    <OrderMembershipManager orderId={order.id} />

                    <div className="mt-7 border-t border-[#60482e]/30 pt-5">
                      <details>
                        <summary className="cursor-pointer text-[9px] uppercase tracking-[0.2em] text-red-400">
                          Delete Order
                        </summary>

                        <AdminActionForm
                          action={
                            deleteOrder
                          }
                          className="mt-4 border border-red-900/40 bg-red-950/10 p-4"
                        >
                          <input
                            type="hidden"
                            name="orderId"
                            value={
                              order.id
                            }
                          />

                          <p className="text-xs leading-6 text-[#a88d83]">
                            Permanently
                            delete{" "}
                            <strong className="text-[#d9b4a7]">
                              {
                                order.name
                              }
                            </strong>
                            . Type DELETE
                            below to
                            confirm.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3">
                            <input
                              type="text"
                              name="confirmation"
                              required
                              placeholder="DELETE"
                              className="min-w-[180px] flex-1 border border-red-900/50 bg-[#100909] px-3 py-2 text-sm text-red-200 outline-none"
                            />

                            <button
                              type="submit"
                              className="border border-red-800/70 bg-red-950/30 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-900/30"
                            >
                              Delete
                              permanently
                            </button>
                          </div>
                        </AdminActionForm>
                      </details>
                    </div>
                  </div>
                </div>
              </AdminOrderCollapsible>
            ),
          )}

          {orders.length === 0 ? (
            <div className="border border-[#60482e]/40 bg-[#120e0b] px-5 py-10 text-center">
              <p className="font-serif text-xl italic text-[#9e8b70]">
                No Orders have yet
                been established.
              </p>

              <p className="mt-2 text-xs text-[#746957]">
                Create the first
                Order above and assign
                it to an Association.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-2 block text-[9px] uppercase tracking-[0.18em] text-[#8c7960]">
        {label}
      </span>

      {children}
    </div>
  );
}

function AdminCounter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="border border-[#60482e]/45 bg-[#17110d] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#a78c67]">
      {children}
    </span>
  );
}

function StatusBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  return (
    <span
      className={
        isActive
          ? "inline-block border border-emerald-800/50 bg-emerald-950/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-emerald-400"
          : "inline-block border border-[#5c5042] bg-[#17120e] px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-[#817462]"
      }
    >
      {isActive
        ? "Active"
        : "Inactive"}
    </span>
  );
}

function InfoCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[#60482e]/35 bg-[#15100c] px-3 py-3 text-center">
      <p className="font-serif text-xl text-[#d6bd94]">
        {value}
      </p>

      <p className="mt-1 text-[7px] uppercase tracking-[0.16em] text-[#756754]">
        {label}
      </p>
    </div>
  );
}