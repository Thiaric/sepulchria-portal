import Link from "next/link";
import { notFound } from "next/navigation";
import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { AtmosphericImage } from "@/components/world/atmospheric-image";

import { createClient } from "@/lib/supabase/server";
import { enterRoomFromMap } from "../../game/actions";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

type Area = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
};

type Room = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
};

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: area,
    error: areaError,
  } = await supabase
    .from("areas")
    .select("id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (areaError) {
    throw new Error(`Unable to load area: ${areaError.message}`);
  }

  if (!area) {
    notFound();
  }

  const {
    data: rooms,
    error: roomsError,
  } = await supabase
    .from("rooms")
    .select(
      "id, name, slug, description, image_url, sort_order",
    )
    .eq("area_id", area.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (roomsError) {
    throw new Error(`Unable to load locations: ${roomsError.message}`);
  }

  const safeArea = area as Area;
  const safeRooms = (rooms ?? []) as Room[];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <section className="overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
        {safeArea.image_url ? (
          <div className="relative min-h-64 overflow-hidden">
            <AtmosphericImage
              src={safeArea.image_url}
              alt={safeArea.name}
              sizes="(max-width: 1024px) 100vw, 70vw"
            />
            <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[#17110d] via-[#17110d]/20 to-transparent" />
          </div>
        ) : null}

        <div className="p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[#8f7757]">
            District of Sepulchria
          </p>

          <h1 className="mt-2 font-serif text-3xl text-[#dec69a] sm:text-4xl">
            {safeArea.name}
          </h1>

          {safeArea.description ? (
  <RichTextContentClient
    body={safeArea.description}
    className="mt-4 max-w-3xl text-sm leading-7 text-[#b7a58c]"
  />
) : null}
        </div>
      </section>

      <section className="border border-[#6a5032]/50 bg-[#17110d] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#8f7757]">
              Available locations
            </p>

            
          </div>

          <Link
  href="/?map=sepulchria"
  className="
    inline-flex
    items-center
    justify-center
    gap-3

    border border-[#80613b]
    bg-[#241a12]

    px-8
    py-4

    text-sm
    font-semibold
    uppercase
    tracking-[0.22em]

    text-[#e0b86a]

    transition-all
    duration-200

    hover:bg-[#302217]
    hover:border-[#b28b55]
    hover:text-[#f4d89b]
  "
>
  ← Return to Sepulchria
</Link>
        </div>

        {safeRooms.length > 0 ? (
          <div className="grid gap-3">
            {safeRooms.map((room) => (
              <article
                key={room.id}
                className="flex flex-col gap-4 border border-[#584128]/60 bg-[#120e0b] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-serif text-xl text-[#ddc397]">
                    {room.name}
                  </h3>

                  {room.description ? (
  <RichTextContentClient
    body={room.description}
    className="mt-2 text-sm leading-6 text-[#9e907d]"
  />
) : null}
                </div>

                <form
  action={enterRoomFromMap}
  className="shrink-0"
>
                  <input
                    type="hidden"
                    name="roomId"
                    value={room.id}
                  />

                  <button
                    type="submit"
                    className="border border-[#80613b] bg-[#241a12] px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#efd4a0] transition hover:border-[#b28b55] hover:bg-[#302217] hover:text-white"
                  >
                    Enter
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9e907d]">
            No active rooms are available in this area.
          </p>
        )}
      </section>
    </div>
  );
}