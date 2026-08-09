import Image from "next/image";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { requireStaff } from "@/lib/auth/require-staff";
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
  await requireStaff();

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
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              Area Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Create and organise the districts
              that contain Sepulchria&apos;s locations.
            </p>
          </div>

          <span className="border border-[#60482e]/45 bg-[#15100d] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#a99069]">
            {areas.length} areas
          </span>
        </div>

        <section className="mt-8 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            New area
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create an area
          </h3>

          <form
            action={createArea}
            className="mt-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Name">
                <input
                  type="text"
                  name="name"
                  required
                  maxLength={120}
                  placeholder="Centro di Sepulchria"
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

              <AdminField label="Image path or URL">
  <input
    type="text"
    name="imageUrl"
    maxLength={2000}
    placeholder="/places/Central-Square.png"
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
            </div>

            <div className="mt-4">
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

            <label className="mt-4 flex items-center gap-3 text-sm text-[#bbaa90]">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 accent-[#8b673d]"
              />

              Active
            </label>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
              >
                Create area
              </button>
            </div>
          </form>
        </section>

        <div className="mt-6 space-y-5">
          {areas.map((area) => (
            <section
              key={area.id}
              className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]"
            >
              <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-b border-[#60482e]/35 bg-[#0f0b09] p-5 lg:border-b-0 lg:border-r">
                  <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#765937]/55 bg-[#090706]">
                    {area.image_url ? (
                      <Image
                        src={area.image_url}
                        alt={area.name}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-4xl text-[#705334]">
                        {area.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-center">
                    <StatusBadge
                      isActive={area.is_active}
                    />

                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#756957]">
                      {area.room_count}{" "}
                      {area.room_count === 1
                        ? "room"
                        : "rooms"}
                    </p>

                    <p className="text-[9px] text-[#756957]">
                      Updated{" "}
                      {formatDate(area.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div>
                    <h3 className="font-serif text-2xl text-[#e3cda5]">
                      {area.name}
                    </h3>

                    <p className="mt-1 text-[10px] text-[#887967]">
                      /{area.slug}
                    </p>
                  </div>

                  <form
                    action={updateArea}
                    className="mt-6"
                  >
                    <input
                      type="hidden"
                      name="areaId"
                      value={area.id}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminField label="Name">
                        <input
                          type="text"
                          name="name"
                          required
                          maxLength={120}
                          defaultValue={area.name}
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <AdminField label="Slug">
                        <input
                          type="text"
                          name="slug"
                          required
                          maxLength={100}
                          defaultValue={area.slug}
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <AdminField label="Image path or URL">
  <input
    type="text"
    name="imageUrl"
    maxLength={2000}
    defaultValue={area.image_url ?? ""}
    placeholder="/places/Central-Square.png"
    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
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
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </AdminField>
                    </div>

                    <div className="mt-4">
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

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={
                            area.is_active
                          }
                          className="h-4 w-4 accent-[#8b673d]"
                        />

                        Active
                      </label>

                      <button
                        type="submit"
                        className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>

                  <form
                    action={deleteArea}
                    className="mt-6 border-t border-[#60482e]/30 pt-5"
                  >
                    <input
                      type="hidden"
                      name="areaId"
                      value={area.id}
                    />

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        type="text"
                        name="confirmation"
                        placeholder='Type "DELETE"'
                        className="w-full border border-red-900/50 bg-[#100909] px-3 py-3 text-sm text-red-200 outline-none placeholder:text-red-900/70 focus:border-red-700"
                      />

                      <button
                        type="submit"
                        className="border border-red-900/60 bg-red-950/20 px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-red-500 transition hover:border-red-700 hover:bg-red-950/40"
                      >
                        Delete area
                      </button>
                    </div>

                    {area.room_count > 0 ? (
                      <p className="mt-3 text-[10px] leading-5 text-[#8e7462]">
                        Deletion is blocked while
                        this area still contains
                        rooms.
                      </p>
                    ) : null}
                  </form>
                </div>
              </div>
            </section>
          ))}

          {areas.length === 0 ? (
            <section className="border border-[#60482e]/45 bg-[#15100d] p-10 text-center">
              <p className="font-serif text-xl text-[#b9a88f]">
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
    <div className="block">
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
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
      className={
        isActive
          ? "inline-block border border-emerald-800/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-500"
          : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}