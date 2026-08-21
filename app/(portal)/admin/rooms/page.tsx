import { AdminActionForm } from "@/components/admin/admin-action-form";
import Image from "next/image";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createRoom,
  createRoomConnection,
  deleteRoom,
  deleteRoomConnection,
  updateRoom,
  updateRoomConnection,
} from "./actions";

type AreaRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type RoomRow = {
  id: string;
  area_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_outdoors: boolean;
  chat_enabled: boolean;
  created_at: string;
  updated_at: string;
  area: AreaRow | null;
  character_count: number;
  presence_count: number;
  message_count: number;
};

type RoomQueryRow = {
  id: string;
  area_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_outdoors: boolean;
  chat_enabled: boolean;
  created_at: string;
  updated_at: string;
  area:
    | AreaRow
    | AreaRow[]
    | null;
  characters:
    | {
        count: number;
      }[]
    | null;
  character_presence:
    | {
        count: number;
      }[]
    | null;
  room_messages:
    | {
        count: number;
      }[]
    | null;
};

type ConnectionRow = {
  id: string;
  from_room_id: string;
  to_room_id: string;
  connection_name: string | null;
  is_two_way: boolean;
  sort_order: number;
  created_at: string;
  from_room: {
    id: string;
    name: string;
    slug: string;
  } | null;
  to_room: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type ConnectionQueryRow = {
  id: string;
  from_room_id: string;
  to_room_id: string;
  connection_name: string | null;
  is_two_way: boolean;
  sort_order: number;
  created_at: string;
  from_room:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
  to_room:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

function getSingleRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getCount(
  value:
    | {
        count: number;
      }[]
    | null,
): number {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value[0]?.count ?? 0;
}

function formatDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function getRoomDependencies(
  room: RoomRow,
): number {
  return (
    room.character_count +
    room.presence_count +
    room.message_count
  );
}

export default async function AdminRoomsPage() {
  await requireStaff();

  const supabase = await createClient();

  const [
    areasResult,
    roomsResult,
    connectionsResult,
  ] = await Promise.all([
    supabase
      .from("areas")
      .select(`
        id,
        name,
        slug,
        is_active
      `)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("rooms")
      .select(`
        id,
        area_id,
        name,
        slug,
        description,
        image_url,
        sort_order,
is_active,
is_outdoors,
chat_enabled,
created_at,
        updated_at,
        area:areas (
          id,
          name,
          slug,
          is_active
        ),
        characters(count),
        character_presence(count),
        room_messages(count)
      `)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("room_connections")
      .select(`
        id,
        from_room_id,
        to_room_id,
        connection_name,
        is_two_way,
        sort_order,
        created_at,
        from_room:rooms!room_connections_from_room_id_fkey (
          id,
          name,
          slug
        ),
        to_room:rooms!room_connections_to_room_id_fkey (
          id,
          name,
          slug
        )
      `)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (areasResult.error) {
    throw new Error(
      `Unable to load areas: ${areasResult.error.message}`,
    );
  }

  if (roomsResult.error) {
    throw new Error(
      `Unable to load rooms: ${roomsResult.error.message}`,
    );
  }

  if (connectionsResult.error) {
    throw new Error(
      `Unable to load room connections: ${connectionsResult.error.message}`,
    );
  }

  const areas =
    (areasResult.data ?? []) as AreaRow[];

  const rooms = (
    (roomsResult.data ??
      []) as unknown as RoomQueryRow[]
  ).map(
    (room): RoomRow => ({
      id: room.id,
      area_id: room.area_id,
      name: room.name,
      slug: room.slug,
      description: room.description,
      image_url: room.image_url,
      sort_order: room.sort_order,
      is_active: room.is_active,
is_outdoors: room.is_outdoors,
chat_enabled: room.chat_enabled,
created_at: room.created_at,
      updated_at: room.updated_at,
      area: getSingleRelation(
        room.area,
      ),
      character_count: getCount(
        room.characters,
      ),
      presence_count: getCount(
        room.character_presence,
      ),
      message_count: getCount(
        room.room_messages,
      ),
    }),
  );

  const connections = (
    (connectionsResult.data ??
      []) as unknown as ConnectionQueryRow[]
  ).map(
    (
      connection,
    ): ConnectionRow => ({
      id: connection.id,
      from_room_id:
        connection.from_room_id,
      to_room_id:
        connection.to_room_id,
      connection_name:
        connection.connection_name,
      is_two_way:
        connection.is_two_way,
      sort_order:
        connection.sort_order,
      created_at:
        connection.created_at,
      from_room: getSingleRelation(
        connection.from_room,
      ),
      to_room: getSingleRelation(
        connection.to_room,
      ),
    }),
  );

  const connectionsByRoom =
    new Map<string, number>();

  for (const connection of connections) {
    connectionsByRoom.set(
      connection.from_room_id,
      (connectionsByRoom.get(
        connection.from_room_id,
      ) ?? 0) + 1,
    );

    connectionsByRoom.set(
      connection.to_room_id,
      (connectionsByRoom.get(
        connection.to_room_id,
      ) ?? 0) + 1,
    );
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Room Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
              Create locations, move them
              between areas and control the
              paths connecting Sepulchria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminCounter>
              {rooms.length}{" "}
              {rooms.length === 1
                ? "Location"
                : "Locations"}
            </AdminCounter>

            <AdminCounter>
              {connections.length}{" "}
              {connections.length === 1
                ? "connection"
                : "connections"}
            </AdminCounter>
          </div>
        </div>

        <section className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            New room
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
            Create a room
          </h3>

          {areas.length > 0 ? (
            <AdminActionForm
              action={createRoom}
              className="mt-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Name">
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={120}
                    placeholder="The Ashen Market"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <AdminField label="Area">
                  <select
                    name="areaId"
                    required
                    defaultValue=""
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select an area
                    </option>

                    {areas.map((area) => (
                      <option
                        key={area.id}
                        value={area.id}
                      >
                        {area.name}
                        {!area.is_active
                          ? " — inactive"
                          : ""}
                      </option>
                    ))}
                  </select>
                </AdminField>

                <AdminField label="Slug">
                  <input
                    type="text"
                    name="slug"
                    maxLength={100}
                    placeholder="Generated automatically"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <AdminField label="Sort order">
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={0}
                    min={-9999}
                    max={9999}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <div className="md:col-span-2">
                  <AdminField label="Image URL">
                    <input
                      type="text"
                      name="imageUrl"
                      maxLength={2000}
                      placeholder="/images/rooms/room-name.jpg"
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                    />
                  </AdminField>
                </div>
              </div>

              <div className="mt-4">
                <AdminField label="Description">
                  <RichTextEditor
                            name="description"
                            placeholder="Describe the location, atmosphere and notable details."
                            maxTextLength={10000}
                            minHeight={280}
                            variant="lore"
                          />
                </AdminField>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
  <div className="flex flex-wrap items-center gap-6">
    <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
      <input
        type="checkbox"
        name="isActive"
        defaultChecked
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
      />

      Active
    </label>

    <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
      <input
        type="checkbox"
        name="isOutdoors"
        defaultChecked
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
      />

      Outdoor location
    </label>

    <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
      <input
        type="checkbox"
        name="chatEnabled"
        defaultChecked
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
      />

      Chat enabled
    </label>
  </div>

  <button
    type="submit"
    className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
  >
    Create location
  </button>
</div>
            </AdminActionForm>
          ) : (
            <p className="mt-5 border border-amber-900/40 bg-amber-950/10 p-4 text-sm leading-6 text-amber-500">
              Create at least one area
              before creating locations.
            </p>
          )}
        </section>

        <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Paths
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
            Create a location connection
          </h3>

          {rooms.length >= 2 ? (
            <AdminActionForm
              action={
                createRoomConnection
              }
              className="mt-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Starting room">
  <select
    name="fromRoomId"
    required
    defaultValue=""
    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
  >
    <option value="" disabled>
      Select a room
    </option>

    {[...rooms]
  .sort((a, b) => {
    const areaA = a.area?.name ?? "";
    const areaB = b.area?.name ?? "";

    const areaComparison = areaA.localeCompare(areaB);

    if (areaComparison !== 0) {
      return areaComparison;
    }

    return a.name.localeCompare(b.name);
  })
  .map((room) => (
    <option
      key={room.id}
      value={room.id}
    >
      {room.area?.name
        ? `${room.area.name} — `
        : ""}
      {room.name}
    </option>
  ))}
  </select>
</AdminField>

                <AdminField label="Destination room">
  <select
    name="toRoomId"
    required
    defaultValue=""
    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
  >
    <option value="" disabled>
      Select a room
    </option>

    {[...rooms]
      .sort((a, b) => {
        const areaA = a.area?.name ?? "";
        const areaB = b.area?.name ?? "";

        const areaComparison = areaA.localeCompare(areaB);

        if (areaComparison !== 0) {
          return areaComparison;
        }

        return a.name.localeCompare(b.name);
      })
      .map((room) => (
        <option
          key={room.id}
          value={room.id}
        >
          {room.area?.name
            ? `${room.area.name} — `
            : ""}
          {room.name}
        </option>
      ))}
  </select>
</AdminField>

                <AdminField label="Connection name">
                  <input
                    type="text"
                    name="connectionName"
                    maxLength={120}
                    placeholder="Stone staircase"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <AdminField label="Sort order">
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={0}
                    min={-9999}
                    max={9999}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
                  <input
                    type="checkbox"
                    name="isTwoWay"
                    defaultChecked
                    className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
                  />

                  Two-way connection
                </label>

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
                >
                  Create connection
                </button>
              </div>
            </AdminActionForm>
          ) : (
            <p className="mt-5 border border-amber-900/40 bg-amber-950/10 p-4 text-sm leading-6 text-amber-500">
              At least two locations are
              required to create a
              connection.
            </p>
          )}
        </section>

        <div className="mt-6 space-y-5">
          {rooms.map((room) => {
            const connectionCount =
              connectionsByRoom.get(
                room.id,
              ) ?? 0;

            const dependencyCount =
              getRoomDependencies(room);

            return (
              <section
                key={room.id}
                className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
              >
                <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0f0b09))] p-5 lg:border-b-0 lg:border-r">
                    <div className="relative aspect-[4/3] w-full overflow-hidden border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-090706))]">
                      {room.image_url ? (
                        <Image
                          src={
                            room.image_url
                          }
                          alt={room.name}
                          fill
                          sizes="240px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-serif text-4xl text-[rgb(var(--sep-colour-705334))]">
                          {room.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-center">
                      <StatusBadge
                        isActive={
                          room.is_active
                        }
                      />

                      <p className="text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-887967))]">
                        {room.area?.name ??
                          "No area"}
                      </p>

                      <p className="text-[9px] text-[rgb(var(--sep-colour-756957))]">
                        {connectionCount}{" "}
                        {connectionCount === 1
                          ? "connection"
                          : "connections"}
                      </p>

                      <p className="text-[9px] text-[rgb(var(--sep-colour-756957))]">
                        Updated{" "}
                        {formatDate(
                          room.updated_at,
                        )}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <DependencyCounter
                        label="Characters"
                        value={
                          room.character_count
                        }
                      />

                      <DependencyCounter
                        label="Present"
                        value={
                          room.presence_count
                        }
                      />

                      <DependencyCounter
                        label="Messages"
                        value={
                          room.message_count
                        }
                      />
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div>
                      <h3 className="font-serif text-2xl text-[rgb(var(--sep-colour-e3cda5))]">
                        {room.name}
                      </h3>

                      <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-887967))]">
                        /{room.slug}
                      </p>
                    </div>

                    <AdminActionForm
                      action={updateRoom}
                      className="mt-6"
                    >
                      <input
                        type="hidden"
                        name="roomId"
                        value={room.id}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Name">
                          <input
                            type="text"
                            name="name"
                            required
                            maxLength={120}
                            defaultValue={
                              room.name
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                          />
                        </AdminField>

                        <AdminField label="Area">
                          <select
                            name="areaId"
                            required
                            defaultValue={
                              room.area_id
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                          >
                            {areas.map(
                              (area) => (
                                <option
                                  key={
                                    area.id
                                  }
                                  value={
                                    area.id
                                  }
                                >
                                  {
                                    area.name
                                  }
                                  {!area.is_active
                                    ? " — inactive"
                                    : ""}
                                </option>
                              ),
                            )}
                          </select>
                        </AdminField>

                        <AdminField label="Slug">
                          <input
                            type="text"
                            name="slug"
                            required
                            maxLength={100}
                            defaultValue={
                              room.slug
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                          />
                        </AdminField>

                        <AdminField label="Sort order">
                          <input
                            type="number"
                            name="sortOrder"
                            min={-9999}
                            max={9999}
                            defaultValue={
                              room.sort_order
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                          />
                        </AdminField>

                        <div className="md:col-span-2">
                          <AdminField label="Image URL">
                            <input
                              type="text"
                              name="imageUrl"
                              maxLength={
                                2000
                              }
                              defaultValue={
                                room.image_url ??
                                ""
                              }
                              placeholder="/images/rooms/room-name.jpg"
                              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                            />
                          </AdminField>
                        </div>
                      </div>

                      <div className="mt-4">
                        <AdminField label="Description">
                          <RichTextEditor
                            name="description"
                            defaultValue={room.description ??
                              ""}
                            maxTextLength={10000}
                            minHeight={280}
                            variant="lore"
                          />
                        </AdminField>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
  <div className="flex flex-wrap items-center gap-6">
    <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
      <input
        type="checkbox"
        name="isActive"
        defaultChecked={room.is_active}
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
      />

      Active
    </label>

    <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
      <input
        type="checkbox"
        name="isOutdoors"
        defaultChecked={room.is_outdoors}
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
      />

      Outdoor location
    </label>

    <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
      <input
        type="checkbox"
        name="chatEnabled"
        defaultChecked={room.chat_enabled}
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
      />

      Chat enabled
    </label>
  </div>

  <button
    type="submit"
    className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
  >
    Save location
  </button>
</div>
                    </AdminActionForm>

                    <AdminActionForm
                      action={deleteRoom}
                      className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5"
                    >
                      <input
                        type="hidden"
                        name="roomId"
                        value={room.id}
                      />

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="text"
                          name="confirmation"
                          placeholder='Type "DELETE"'
                          className="w-full border border-red-900/50 bg-[rgb(var(--sep-colour-100909))] px-3 py-3 text-sm text-red-200 outline-none placeholder:text-red-900/70 focus:border-red-700"
                        />

                        <button
                          type="submit"
                          className="border border-red-900/60 bg-red-950/20 px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-red-500 transition hover:border-red-700 hover:bg-red-950/40"
                        >
                          Delete room
                        </button>
                      </div>

                      {dependencyCount > 0 ||
                      connectionCount >
                        0 ? (
                        <p className="mt-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-8e7462))]">
                          Deletion is
                          blocked while
                          characters,
                          presence records,
                          messages or
                          connections still
                          refer to this room.
                        </p>
                      ) : null}
                    </AdminActionForm>
                  </div>
                </div>
              </section>
            );
          })}

          {rooms.length === 0 ? (
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-10 text-center">
              <p className="font-serif text-xl text-[rgb(var(--sep-colour-b9a88f))]">
                No locations were found.
              </p>
            </section>
          ) : null}
        </div>

        <section
          id="room-connections"
          className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
                Existing paths
              </p>

              <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
                Room connections
              </h3>
            </div>

            <AdminCounter>
              {connections.length}
            </AdminCounter>
          </div>

          <div className="mt-6 space-y-3">
            {connections.map(
              (connection) => (
                <details
                  key={connection.id}
                  className="group border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))]"
                >
                  <summary className="cursor-pointer list-none px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
                          {connection
                            .from_room
                            ?.name ??
                            "Unknown room"}

                          <span className="mx-3 text-[rgb(var(--sep-colour-7d6040))]">
                            {connection.is_two_way
                              ? "↔"
                              : "→"}
                          </span>

                          {connection
                            .to_room
                            ?.name ??
                            "Unknown room"}
                        </p>

                        <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-817461))]">
                          {connection.connection_name ??
                            "Unnamed connection"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="border border-[rgb(var(--sep-colour-60482e))]/50 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9e8969))]">
                          {connection.is_two_way
                            ? "Two-way"
                            : "One-way"}
                        </span>

                        <span
                          title="Expand connection"
                          className="text-sm text-[rgb(var(--sep-colour-9a7445))] transition-transform duration-200 group-open:rotate-180"
                        >
                          ▾
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-colour-60482e))]/30 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                    <AdminActionForm
                      action={
                        updateRoomConnection
                      }
                    >
                      <input
                        type="hidden"
                        name="connectionId"
                        value={connection.id}
                      />

                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                        <AdminField label="Connection name">
                          <input
                            type="text"
                            name="connectionName"
                            maxLength={120}
                            defaultValue={
                              connection.connection_name ??
                              ""
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                          />
                        </AdminField>

                        <AdminField label="Sort order">
                          <input
                            type="number"
                            name="sortOrder"
                            min={-9999}
                            max={9999}
                            defaultValue={
                              connection.sort_order
                            }
                            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                          />
                        </AdminField>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
                          <input
                            type="checkbox"
                            name="isTwoWay"
                            defaultChecked={
                              connection.is_two_way
                            }
                            className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
                          />

                          Two-way connection
                        </label>

                        <button
                          type="submit"
                          className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
                        >
                          Save connection
                        </button>
                      </div>
                    </AdminActionForm>

                    <AdminActionForm
                      action={
                        deleteRoomConnection
                      }
                      className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-4 text-right"
                    >
                      <input
                        type="hidden"
                        name="connectionId"
                        value={connection.id}
                      />

                      <button
                        type="submit"
                        className="border border-red-900/60 bg-red-950/20 px-4 py-2.5 text-[8px] uppercase tracking-[0.18em] text-red-500 transition hover:border-red-700 hover:bg-red-950/40"
                      >
                        Delete connection
                      </button>
                    </AdminActionForm>
                  </div>
                </details>
              ),
            )}

            {connections.length === 0 ? (
              <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-8 text-center">
                <p className="text-sm text-[rgb(var(--sep-colour-92836f))]">
                  No room connections
                  have been created yet.
                </p>
              </div>
            ) : null}
          </div>
        </section>
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
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </div>

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
    <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a99069))]">
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
          ? "inline-block border border-emerald-800/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-500"
          : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400"
      }
    >
      {isActive
        ? "Active"
        : "Inactive"}
    </span>
  );
}

function DependencyCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-15100d))] px-2 py-3 text-center">
      <p className="font-serif text-lg text-[rgb(var(--sep-colour-c9ad82))]">
        {value}
      </p>

      <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
        {label}
      </p>
    </div>
  );
}