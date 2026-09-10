import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { CollapsibleRoomDescription } from "@/components/world/collapsible-room-description";
import { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";
import { LocationImageLightbox } from "@/components/world/location-image-lightbox";

import { createClient } from "@/lib/supabase/server";
import {
  getOrderHeadquartersAccess,
} from "@/lib/order-headquarters/access";
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

  if (slug === "private-locations") {
    notFound();
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: viewerCharacter,
  } = user
    ? await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const accessPairs =
    await Promise.all(
      safeRooms.map(async (room) => [
        room.id,
        viewerCharacter
          ? await getOrderHeadquartersAccess(
              room.id,
              viewerCharacter.id,
            )
          : null,
      ] as const),
    );

  const headquartersAccess =
    new Map(accessPairs);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4 lg:p-5 areas_slug_page_div_container">
      <section className="overflow-hidden border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] areas_slug_page_section_section">
        {safeArea.image_url ? (
          <div className="relative h-[clamp(180px,28dvh,300px)] overflow-hidden areas_slug_page_div_container_2">
            <LocationAtmosphericImage
              src={safeArea.image_url}
              alt={safeArea.name}
              priority
              sizes="(max-width: 1024px) 100vw, 70vw"
              objectFit="cover"
            />

            <LocationImageLightbox
              src={safeArea.image_url}
              name={safeArea.name}
            />

            <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[rgb(var(--sep-colour-17110d))]/72 via-[rgb(var(--sep-colour-17110d))]/12 to-transparent areas_slug_page_div_container_3" />

            
          </div>
        ) : (
          <div className="p-4 sm:p-5 areas_slug_page_div_container_4">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8f7757))] areas_slug_page_p_text">
              District of Sepulchria
            </p>

            <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))] sm:text-3xl areas_slug_page_h1_title">
              {safeArea.name}
            </h1>
          </div>
        )}

        <div className="border-t border-[rgb(var(--sep-colour-6a5032))]/35 px-4 py-3 sm:px-5 sm:py-4 areas_slug_page_div_container_5">
  <h1 className="mb-2 font-serif text-2xl leading-tight text-[rgb(var(--sep-skin-c2))] sm:text-3xl areas_slug_page_h1_title_2">
  {safeArea.name}
</h1>

  {safeArea.description ? (
    <RichTextContentClient
      body={safeArea.description}
      className="max-full text-[13px] leading-6 text-[rgb(var(--sep-colour-b7a58c))] [&_p]:my-2"
    />
  ) : null}
</div>
      </section>

      <section className="border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-3 sm:p-4 areas_slug_page_section_section_2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 areas_slug_page_div_container_6">
          <div className="areas_slug_page_div_container_7">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8f7757))] areas_slug_page_p_text_2">
              Available locations
            </p>
          </div>

          <Link
            href="/?map=sepulchria"
            className="inline-flex items-center justify-center border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-e0b86a))] transition hover:border-[rgb(var(--sep-colour-b28b55))] hover:bg-[rgb(var(--sep-colour-302217))] hover:text-[rgb(var(--sep-colour-f4d89b))]"
          >
            ← Return to Sepulchria
          </Link>
        </div>

        {safeRooms.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 areas_slug_page_div_container_8">
            {safeRooms.map((room) => {
              const access =
                headquartersAccess.get(
                  room.id,
                );

              const canSeeDetails =
                !access?.isHeadquarters ||
                access.allowed;

              return (
                <article
                  key={room.id}
                  id={`location-${room.slug}`}
                  className="scroll-mt-4 overflow-hidden border border-[rgb(var(--sep-colour-584128))]/60 bg-[rgb(var(--sep-colour-120e0b))] areas_slug_page_article_article"
                >
                  {room.image_url ? (
                    <div className="relative aspect-[16/7] w-full overflow-hidden border-b border-[rgb(var(--sep-colour-584128))]/45 bg-[rgb(var(--sep-colour-0b0806))] areas_slug_page_div_container_9">
                      <LocationAtmosphericImage
                        src={room.image_url}
                        alt={room.name}
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        objectFit="cover"
                        isOutdoors={room.is_outdoors}
                      />

                      <LocationImageLightbox
                        src={room.image_url}
                        name={room.name}
                      />

                      <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[rgb(var(--sep-colour-120e0b))]/65 via-transparent to-transparent areas_slug_page_div_container_10" />
                    </div>
                  ) : null}

                  <div className="flex min-h-0 flex-col p-3 areas_slug_page_div_container_11">
                    <h3 className="font-serif text-base leading-tight text-[rgb(var(--sep-skin-c2))] areas_slug_page_h3_heading">
  {room.name}
</h3>

                    {canSeeDetails &&
                    room.description ? (
                      <CollapsibleRoomDescription
                        body={room.description}
                      />
                    ) : null}

                    {canSeeDetails ? (
                      <form
                        action={
                          enterRoomFromMap
                        }
                        className="mt-3 areas_slug_page_form_form"
                      >
                        <input className="areas_slug_page_input_room_id"
                          type="hidden"
                          name="roomId"
                          value={room.id}
                        />

                        <button
                          type="submit"
                          className="w-full border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:border-[rgb(var(--sep-colour-b28b55))] hover:bg-[rgb(var(--sep-colour-302217))] hover:text-white areas_slug_page_button_enter"
                        >
                          Enter
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-9e907d))] areas_slug_page_p_text_3">
            No active rooms are available in this area.
          </p>
        )}
      </section>
    </div>
  );
}
