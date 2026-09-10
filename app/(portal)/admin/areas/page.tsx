

import { AdminActionForm } from "@/components/admin/admin-action-form";
import Image from "next/image";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createArea,
  deleteArea,
  updateArea,
} from "./actions";

type AreaRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  room_count: number;
};

type AreaQueryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rooms:
    | {
        count: number;
      }[]
    | null;
};

function getRoomCount(
  rooms: AreaQueryRow["rooms"],
): number {
  if (!Array.isArray(rooms)) {
    return 0;
  }

  return rooms[0]?.count ?? 0;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminAreasPage() {
  await requireAdminSection("areas");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("areas")
    .select(`
      id,
      name,
      slug,
      description,
      image_url,
      sort_order,
      is_active,
      created_at,
      updated_at,
      rooms(count)
    `)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load areas: ${error.message}`,
    );
  }

  const areas = (
    (data ?? []) as unknown as AreaQueryRow[]
  ).map(
    (area): AreaRow => ({
      id: area.id,
      name: area.name,
      slug: area.slug,
      description: area.description,
      image_url: area.image_url,
      sort_order: area.sort_order,
      is_active: area.is_active,
      created_at: area.created_at,
      updated_at: area.updated_at,
      room_count: getRoomCount(area.rooms),
    }),
  );

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_areas_page_main_main">
      <div className="mx-auto max-w-6xl admin_areas_page_div_container">
        <div className="flex flex-wrap items-end justify-between gap-4 admin_areas_page_div_container_2">
          <div className="admin_areas_page_div_area_management">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_areas_page_p_area_management">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_areas_page_h2_area_management">
              Area Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_areas_page_p_area_management_2">
              Create and organise the districts
              that contain Sepulchria&apos;s locations.
            </p>
          </div>

          <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a99069))] admin_areas_page_span_text">
            {areas.length} areas
          </span>
        </div>

        <section className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_areas_page_section_create_area">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_areas_page_p_create_area">
            New area
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_areas_page_h3_create_area">
            Create an area
          </h3>

          <AdminActionForm
            action={createArea}
            className="mt-6"
          >
            <div className="grid gap-4 md:grid-cols-2 admin_areas_page_div_create_area">
              <AdminField label="Name">
                <input
                  type="text"
                  name="name"
                  required
                  maxLength={120}
                  placeholder="Centro di Sepulchria"
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_name"
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  type="text"
                  name="slug"
                  maxLength={100}
                  placeholder="Generated automatically"
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_slug"
                />
              </AdminField>

              <AdminField label="Image path or URL">
  <input
    type="text"
    name="imageUrl"
    maxLength={2000}
    placeholder="/places/Central-Square.png"
    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_image_url"
  />
</AdminField>

              <AdminField label="Sort order">
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={0}
                  min={-9999}
                  max={9999}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_sort_order"
                />
              </AdminField>
            </div>

            <div className="mt-4 admin_areas_page_div_create_area_2">
              <AdminField label="Description">
                <RichTextEditor
                            name="description"
                            placeholder="Describe this area."
                            maxTextLength={5000}
                            minHeight={260}
                            variant="lore"
                          />
              </AdminField>
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_areas_page_label_create_area">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_areas_page_input_active"
              />

              Active
            </label>

            <div className="mt-5 flex justify-end admin_areas_page_div_create_area_3">
              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_areas_page_button_create_area"
              >
                Create area
              </button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-5 admin_areas_page_div_container_3">
          {areas.map((area) => (
            <section
              key={area.id}
              className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_areas_page_section_section"
            >
              <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] admin_areas_page_div_container_4">
                <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0f0b09))] p-5 lg:border-b-0 lg:border-r admin_areas_page_div_container_5">
                  <div className="relative aspect-[4/3] w-full overflow-hidden border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-090706))] admin_areas_page_div_container_6">
                    {area.image_url ? (
                      <Image
                        src={
  area.image_url.startsWith("/") ||
  area.image_url.startsWith("http://") ||
  area.image_url.startsWith("https://")
    ? area.image_url
    : `/${area.image_url}`
}
                        alt={area.name}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-4xl text-[rgb(var(--sep-colour-705334))] admin_areas_page_div_container_7">
                        {area.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-center admin_areas_page_div_container_8">
                    <StatusBadge
                      isActive={area.is_active}
                    />

                    <p className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756957))] admin_areas_page_p_text">
                      {area.room_count}{" "}
                      {area.room_count === 1
                        ? "room"
                        : "rooms"}
                    </p>

                    <p className="text-[9px] text-[rgb(var(--sep-colour-756957))] admin_areas_page_p_text_2">
                      Updated{" "}
                      {formatDate(area.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6 admin_areas_page_div_container_9">
                  <div className="admin_areas_page_div_container_10">
                    <h3 className="font-serif text-2xl text-[rgb(var(--sep-colour-e3cda5))] admin_areas_page_h3_heading">
                      {area.name}
                    </h3>

                    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-887967))] admin_areas_page_p_text_3">
                      /{area.slug}
                    </p>
                  </div>

                  <AdminActionForm
                    action={updateArea}
                    className="mt-6"
                  >
                    <input className="admin_areas_page_input_area_id"
                      type="hidden"
                      name="areaId"
                      value={area.id}
                    />

                    <div className="grid gap-4 md:grid-cols-2 admin_areas_page_div_container_11">
                      <AdminField label="Name">
                        <input
                          type="text"
                          name="name"
                          required
                          maxLength={120}
                          defaultValue={area.name}
                          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_name_2"
                        />
                      </AdminField>

                      <AdminField label="Slug">
                        <input
                          type="text"
                          name="slug"
                          required
                          maxLength={100}
                          defaultValue={area.slug}
                          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_slug_2"
                        />
                      </AdminField>

                      <AdminField label="Image path or URL">
  <input
    type="text"
    name="imageUrl"
    maxLength={2000}
    defaultValue={area.image_url ?? ""}
    placeholder="/places/Central-Square.png"
    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_image_url_2"
  />
</AdminField>

                      <AdminField label="Sort order">
                        <input
                          type="number"
                          name="sortOrder"
                          min={-9999}
                          max={9999}
                          defaultValue={
                            area.sort_order
                          }
                          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_areas_page_input_sort_order_2"
                        />
                      </AdminField>
                    </div>

                    <div className="mt-4 admin_areas_page_div_container_12">
                      <AdminField label="Description">
                        <RichTextEditor
                            name="description"
                            defaultValue={area.description ?? ""}
                            maxTextLength={5000}
                            minHeight={260}
                            variant="lore"
                          />
                      </AdminField>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 admin_areas_page_div_active">
                      <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_areas_page_label_active">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={
                            area.is_active
                          }
                          className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_areas_page_input_active_2"
                        />

                        Active
                      </label>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_areas_page_button_save_changes"
                      >
                        Save changes
                      </button>
                    </div>
                  </AdminActionForm>

                  <AdminActionForm
                    action={deleteArea}
                    className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5"
                  >
                    <input className="admin_areas_page_input_area_id_2"
                      type="hidden"
                      name="areaId"
                      value={area.id}
                    />

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] admin_areas_page_div_container_13">
                      <input
                        type="text"
                        name="confirmation"
                        placeholder='Type "DELETE"'
                        className="w-full border border-red-900/50 bg-[rgb(var(--sep-colour-100909))] px-3 py-3 text-sm text-red-200 outline-none placeholder:text-red-900/70 focus:border-red-700 admin_areas_page_input_confirmation"
                      />

                      <button
                        type="submit"
                        className="border border-red-900/60 bg-red-950/20 px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-red-500 transition hover:border-red-700 hover:bg-red-950/40 admin_areas_page_button_delete_area"
                      >
                        Delete area
                      </button>
                    </div>

                    {area.room_count > 0 ? (
                      <p className="mt-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-8e7462))] admin_areas_page_p_text_4">
                        Deletion is blocked while
                        this area still contains
                        rooms.
                      </p>
                    ) : null}
                  </AdminActionForm>
                </div>
              </div>
            </section>
          ))}

          {areas.length === 0 ? (
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-10 text-center admin_areas_page_section_section_2">
              <p className="font-serif text-xl text-[rgb(var(--sep-colour-b9a88f))] admin_areas_page_p_text_5">
                No areas were found.
              </p>
            </section>
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
    <div className="block admin_areas_page_div_container_14">
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_areas_page_div_container_15">
        {label}
      </div>

      {children}
    </div>
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
          ? "inline-block border border-emerald-800/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-500"
          : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400")), "admin_areas_page_span_text_2"].filter(Boolean).join(" ")}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}