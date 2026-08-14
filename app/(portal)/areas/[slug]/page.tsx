import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";
import { LocationImageLightbox } from "@/components/world/location-image-lightbox";

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
  is_outdoors: boolean;
};

export default async function AreaPage({
  params,
}: Props) {
  const { slug } =
    await params;

  const supabase =
    await createClient();

  const {
    data: area,
    error: areaError,
  } = await supabase
    .from("areas")
    .select(
      "id, name, slug, description, image_url",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (areaError) {
    throw new Error(
      `Unable to load area: ${areaError.message}`,
    );
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
  "id, name, slug, description, image_url, sort_order, is_outdoors",
)
    .eq("area_id", area.id)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (roomsError) {
    throw new Error(
      `Unable to load locations: ${roomsError.message}`,
    );
  }

  const safeArea =
    area as Area;

  const safeRooms =
    (rooms ?? []) as Room[];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4 lg:p-5">
      <section className="overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
        {safeArea.image_url ? (
          <div className="relative h-[clamp(180px,28dvh,300px)] overflow-hidden">
            <LocationAtmosphericImage
              src={
                safeArea.image_url
              }
              alt={
                safeArea.name
              }
              sizes="(max-width: 1024px) 100vw, 70vw"
              objectFit="cover"
            />

            <LocationImageLightbox
              src={
                safeArea.image_url
              }
              name={
                safeArea.name
              }
            />

            <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[#17110d]/72 via-[#17110d]/12 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5">
              <h1 className="mt-1 font-serif text-2xl leading-tight text-[#d9bd82] [text-shadow:0_2px_5px_rgba(0,0,0,0.95)] sm:text-3xl">
                {safeArea.name}
              </h1>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#8f7757]">
              District of Sepulchria
            </p>

            <h1 className="mt-1 font-serif text-2xl text-[#dec69a] sm:text-3xl">
              {safeArea.name}
            </h1>
          </div>
        )}

        {safeArea.description ? (
          <div className="border-t border-[#6a5032]/35 px-4 py-3 sm:px-5 sm:py-4">
            <RichTextContentClient
              body={
                safeArea.description
              }
              className="max-full text-[13px] leading-6 text-[#b7a58c] [&_p]:my-2"
            />
          </div>
        ) : null}
      </section>

      <section className="border border-[#6a5032]/50 bg-[#17110d] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#8f7757]">
              Available locations
            </p>
          </div>

          <Link
            href="/?map=sepulchria"
            className="inline-flex items-center justify-center border border-[#80613b] bg-[#241a12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e0b86a] transition hover:border-[#b28b55] hover:bg-[#302217] hover:text-[#f4d89b]"
          >
            ← Return to Sepulchria
          </Link>
        </div>

        {safeRooms.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {safeRooms.map(
              
              (room) => (
                <article
                  key={room.id}
                  id={`location-${room.slug}`}
                  className="scroll-mt-4 overflow-hidden border border-[#584128]/60 bg-[#120e0b]"
                >
                  {room.image_url ? (
                    <div className="relative aspect-[16/7] w-full overflow-hidden border-b border-[#584128]/45 bg-[#0b0806]">
                      <LocationAtmosphericImage
  src={room.image_url}
  alt={room.name}
  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
  objectFit="cover"
  isOutdoors={room.is_outdoors}
/>

                      <LocationImageLightbox
                        src={
                          room.image_url
                        }
                        name={
                          room.name
                        }
                      />

                      <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[#120e0b]/65 via-transparent to-transparent" />
                    </div>
                  ) : null}

                  <div className="flex min-h-0 flex-col p-3">
                    <h3 className="font-serif text-base leading-tight text-[#d9bd82]">
                      {room.name}
                    </h3>

                    {room.description ? (
                      <RichTextContentClient
                        body={
                          room.description
                        }
                        className="mt-1 text-[11px] leading-5 text-[#9e907d] [&_p]:m-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_img]:hidden [&_table]:hidden"
                      />
                    ) : null}

                    <form
                      action={
                        enterRoomFromMap
                      }
                      className="mt-3"
                    >
                      <input
                        type="hidden"
                        name="roomId"
                        value={
                          room.id
                        }
                      />

                      <button
                        type="submit"
                        className="w-full border border-[#80613b] bg-[#241a12] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#efd4a0] transition hover:border-[#b28b55] hover:bg-[#302217] hover:text-white"
                      >
                        Enter
                      </button>
                    </form>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <p className="text-xs text-[#9e907d]">
            No active rooms are available in this area.
          </p>
        )}
      </section>
    </div>
  );
}
