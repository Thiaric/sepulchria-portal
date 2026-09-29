
import { AdminActionForm } from "@/components/admin/admin-action-form";
import Image from "next/image";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
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

type HeadquartersAreaRow = {
  id: string;
  name: string;
  is_active: boolean;
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
  await requireAdminSection("orders");

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
    data: headquartersAreaData,
    error: headquartersAreaError,
  } = await supabase
    .from("areas")
    .select("id, name, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (headquartersAreaError) {
    throw new Error(
      `Unable to load Headquarters Areas: ${headquartersAreaError.message}`,
    );
  }

  const headquartersAreas =
    (headquartersAreaData ?? []) as HeadquartersAreaRow[];

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
    <main className="p-5 sm:p-7 lg:p-9 admin_orders_page_main_main">
      <div className="mx-auto max-w-7xl admin_orders_page_div_container">
        <div className="flex flex-wrap items-end justify-between gap-4 admin_orders_page_div_container_2">
          <div className="admin_orders_page_div_order_management">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_orders_page_p_order_management">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_orders_page_h2_order_management">
              Order Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_orders_page_p_order_management_2">
              Create and maintain the
              Orders operating beneath
              the Associations of
              Sepulchria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 admin_orders_page_div_container_3">
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
          <div className="mt-6 border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400 admin_orders_page_div_container_4">
            {
              resolvedSearchParams.success
            }
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400 admin_orders_page_div_container_5">
            {
              resolvedSearchParams.error
            }
          </div>
        ) : null}

        <section
          id="order-new"
          className="scroll-mt-24 mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_orders_page_section_order_new"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_orders_page_p_order_new">
            New Order
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_orders_page_h3_order_new">
            Create an Order
          </h3>

          <p className="mt-2 max-w-3xl text-xs leading-6 text-[rgb(var(--sep-colour-8f816e))] admin_orders_page_p_order_new_2">
            Every Order belongs to one
            Association. Characters will
            later become members of the
            Order rather than belonging
            directly to the Association.
          </p>

          {associations.length ===
          0 ? (
            <div className="mt-6 border border-amber-800/40 bg-amber-950/15 px-4 py-4 text-sm text-amber-300 admin_orders_page_div_order_new">
              You must create an
              Association before you can
              create an Order.
            </div>
          ) : (
            <AdminActionForm
              action={createOrder}
              className="mt-6"
            >
              <div className="grid gap-4 md:grid-cols-2 admin_orders_page_div_container_6">
                <AdminField label="Association">
                  <select
                    name="associationId"
                    required
                    defaultValue=""
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_select_association_id"
                  >
                    <option className="admin_orders_page_option_association_id"
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
                        <option className="admin_orders_page_option_option"
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

                <AdminField label="Headquarters Area">
                  <select
                    name="headquartersAreaId"
                    required
                    defaultValue=""
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_select_headquarters_area_id"
                  >
                    <option className="admin_orders_page_option_headquarters_area_id" value="" disabled>Select Headquarters Area</option>
                    {headquartersAreas.map((area) => (
                      <option className="admin_orders_page_option_option_2" key={area.id} value={area.id}>
                        {area.name}{!area.is_active ? " — inactive" : ""}
                      </option>
                    ))}
                  </select>
                </AdminField>

                <AdminField label="Headquarters environment">
                  <select
                    name="headquartersOutdoors"
                    required
                    defaultValue=""
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_select_headquarters_outdoors"
                  >
                    <option className="admin_orders_page_option_headquarters_outdoors" value="" disabled>Choose Indoor or Outdoor</option>
                    <option className="admin_orders_page_option_headquarters_outdoors_2" value="false">Indoor</option>
                    <option className="admin_orders_page_option_headquarters_outdoors_3" value="true">Outdoor</option>
                  </select>
                </AdminField>

                <AdminField label="Name">
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={120}
                    placeholder="House of Healing"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_name"
                  />
                </AdminField>

                <AdminField label="Slug">
                  <input
                    type="text"
                    name="slug"
                    maxLength={100}
                    placeholder="Generated automatically"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_slug"
                  />
                </AdminField>

                <AdminField label="Sort order">
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={0}
                    min={-9999}
                    max={9999}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_sort_order"
                  />
                </AdminField>

                <div className="md:col-span-2 admin_orders_page_div_container_7">
                  <AdminField label="Monthly pay by Level (Remnants)">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 admin_orders_page_div_container_8">
                      {[1, 2, 3, 4, 5, 6].map((level) => (
                        <label className="admin_orders_page_label_label" key={level}>
                          <span className="mb-1 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] admin_orders_page_span_text">
                            Level {level}
                          </span>
                          <input
                            type="number"
                            name={`monthlyPay${level}`}
                            min={0}
                            step={1}
                            defaultValue={0}
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_field"
                          />
                        </label>
                      ))}
                    </div>
                  </AdminField>
                </div>

                <AdminField label="Colour">
                  <input
                    type="text"
                    name="colour"
                    maxLength={32}
                    placeholder="#8c704b"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_colour"
                  />
                </AdminField>

                <div className="md:col-span-2 admin_orders_page_div_container_9">
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

                <div className="md:col-span-2 admin_orders_page_div_container_10">
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
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_image_url"
                  />
                </AdminField>

                <AdminField label="Banner URL">
                  <input
                    type="text"
                    name="bannerUrl"
                    maxLength={2000}
                    placeholder="/images/orders/healing-banner.jpg"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_banner_url"
                  />
                </AdminField>

                <div className="md:col-span-2 admin_orders_page_div_container_11">
                  <AdminField label="Icon URL">
                    <input
                      type="text"
                      name="iconUrl"
                      maxLength={2000}
                      placeholder="/images/orders/healing-icon.png"
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_icon_url"
                    />
                  </AdminField>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 admin_orders_page_div_active">
                <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_orders_page_label_active">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_orders_page_input_active"
                  />

                  Active
                </label>

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_orders_page_button_create_order"
                >
                  Create Order
                </button>
              </div>
            </AdminActionForm>
          )}
        </section>

        <div className="mt-6 space-y-5 admin_orders_page_div_container_12">
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

                

                <div className="admin_orders_page_div_container_13">
                  <aside className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0f0b09))] p-4 admin_orders_page_aside_sidebar">
                    <div className="flex items-start justify-start gap-8 pl-2 admin_orders_page_div_container_14">
                      <div className="w-[280px] shrink-0 admin_orders_page_div_container_15">
                        <div
                          className="relative aspect-[4/3] w-full overflow-hidden border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-090706))] admin_orders_page_div_container_16"
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
                              sizes="280px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : order.icon_url ? (
                            <div className="flex h-full items-center justify-center p-10 admin_orders_page_div_container_17">
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
                            <div className="flex h-full items-center justify-center font-serif text-5xl text-[rgb(var(--sep-colour-705334))] admin_orders_page_div_container_18">
                              {order.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        
                      </div>

                      <div className="min-w-0 text-left admin_orders_page_div_container_19">
                        <p className="font-serif text-2xl text-[rgb(var(--sep-colour-d7c09a))] admin_orders_page_p_text">
                          {associationName(
                            order.association,
                          )}
                        </p>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-746652))] admin_orders_page_p_text_2">
                          Association
                        </p>

                        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-887967))] admin_orders_page_p_text_3">
                          /{order.slug}
                        </p>

                        {order.colour ? (
                          <div className="mt-3 flex items-center gap-2 text-[9px] text-[rgb(var(--sep-colour-817461))] admin_orders_page_div_container_20">
                            <span
                              className="h-3 w-3 rounded-full border border-white/15 admin_orders_page_span_text_2"
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

                        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3 admin_orders_page_div_container_21">
                          <div className="admin_orders_page_div_container_22">
                            

                            <p className="mt-1 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756754))] admin_orders_page_p_text_4">
                              Sort order : {order.sort_order}
                            </p>
                          </div>

                          <p className="pb-0.5 text-[9px] text-[rgb(var(--sep-colour-756957))] admin_orders_page_p_text_5">
                            Updated{" "}
                            {formatDate(
                              order.updated_at,
                            )}
                          </p>
                          
                        </div><div className="mt-3 text-center admin_orders_page_div_container_23">
                          <StatusBadge
                            isActive={
                              order.is_active
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="p-5 sm:p-6 admin_orders_page_div_container_24">
                    <div className="flex flex-wrap items-start justify-between gap-4 admin_orders_page_div_container_25">
                      <div className="admin_orders_page_div_container_26">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))] admin_orders_page_p_text_6">
                          {
                            associationName(
                              order.association,
                            )
                          }{" "}
                          · Order
                        </p>

                        <h3 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e3cda5))] admin_orders_page_h3_heading">
                          {order.name}
                        </h3>
                      </div>

                      {order.icon_url ? (
                        <div className="relative h-16 w-16 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0b0807))] p-2 admin_orders_page_div_container_27">
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
  className="text-sm leading-7 text-[rgb(var(--sep-colour-b6a58d))]"
/>

                      
                    ) : null}

                    <AdminActionForm
                      action={
                        updateOrder
                      }
                      className="mt-6"
                    >
                      <input className="admin_orders_page_input_order_id"
                        type="hidden"
                        name="orderId"
                        value={order.id}
                      />

                      <div className="grid gap-4 md:grid-cols-2 admin_orders_page_div_container_28">
                        <AdminField label="Association">
                          <select
                            name="associationId"
                            required
                            defaultValue={
                              order.association_id
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_select_association_id_2"
                          >
                            {associations.map(
                              (
                                association,
                              ) => (
                                <option className="admin_orders_page_option_option_3"
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
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_name_2"
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
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_slug_2"
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
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_sort_order_2"
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
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_colour_2"
                          />
                        </AdminField>

                        <div className="md:col-span-2 admin_orders_page_div_container_29">
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

                        <div className="md:col-span-2 admin_orders_page_div_container_30">
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
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_image_url_2"
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
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_banner_url_2"
                          />
                        </AdminField>

                        <div className="md:col-span-2 admin_orders_page_div_container_31">
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
                              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_orders_page_input_icon_url_2"
                            />
                          </AdminField>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 admin_orders_page_div_active_2">
                        <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_orders_page_label_active_2">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={
                              order.is_active
                            }
                            className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_orders_page_input_active_2"
                          />

                          Active
                        </label>

                        <button
                          type="submit"
                          className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_orders_page_button_save_order"
                        >
                          Save Order
                        </button>
                      </div>
                    </AdminActionForm>

                    <OrderLevelStructure orderId={order.id} />

                    <OrderMembershipManager orderId={order.id} />

                    <div className="mt-7 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5 admin_orders_page_div_container_32">
                      <details className="admin_orders_page_details_delete_order">
                        <summary className="cursor-pointer text-[9px] uppercase tracking-[0.2em] text-red-400 admin_orders_page_summary_delete_order">
                          Delete Order
                        </summary>

                        <AdminActionForm
                          action={
                            deleteOrder
                          }
                          className="mt-4 border border-red-900/40 bg-red-950/10 p-4"
                        >
                          <input className="admin_orders_page_input_order_id_2"
                            type="hidden"
                            name="orderId"
                            value={
                              order.id
                            }
                          />

                          <p className="text-xs leading-6 text-[rgb(var(--sep-colour-a88d83))] admin_orders_page_p_delete_order">
                            Permanently
                            delete{" "}
                            <strong className="text-[rgb(var(--sep-colour-d9b4a7))] admin_orders_page_strong_delete_order">
                              {
                                order.name
                              }
                            </strong>
                            . Type DELETE
                            below to
                            confirm.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3 admin_orders_page_div_delete_order">
                            <input
                              type="text"
                              name="confirmation"
                              required
                              placeholder="DELETE"
                              className="min-w-[180px] flex-1 border border-red-900/50 bg-[rgb(var(--sep-colour-100909))] px-3 py-2 text-sm text-red-200 outline-none admin_orders_page_input_confirmation"
                            />

                            <button
                              type="submit"
                              className="border border-red-800/70 bg-red-950/30 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-900/30 admin_orders_page_button_delete_permanently"
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
            <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] px-5 py-10 text-center admin_orders_page_div_container_33">
              <p className="font-serif text-xl italic text-[rgb(var(--sep-colour-9e8b70))] admin_orders_page_p_text_7">
                No Orders have yet
                been established.
              </p>

              <p className="mt-2 text-xs text-[rgb(var(--sep-colour-746957))] admin_orders_page_p_text_8">
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
    <div className="block admin_orders_page_div_container_34">
      <span className="mb-2 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8c7960))] admin_orders_page_span_text_3">
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
    <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a78c67))] admin_orders_page_span_text_4">
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
      className={[((isActive
          ? "inline-block border border-emerald-800/50 bg-emerald-950/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-emerald-400"
          : "inline-block border border-[rgb(var(--sep-colour-5c5042))] bg-[rgb(var(--sep-colour-17120e))] px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-817462))]")), "admin_orders_page_span_text_5"].filter(Boolean).join(" ")}
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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100c))] px-3 py-3 text-center admin_orders_page_div_container_35">
      <p className="font-serif text-xl text-[rgb(var(--sep-colour-d6bd94))] admin_orders_page_p_text_9">
        {value}
      </p>

      <p className="mt-1 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756754))] admin_orders_page_p_text_10">
        {label}
      </p>
    </div>
  );
}