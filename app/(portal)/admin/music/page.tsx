import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MusicFeatureManager,
  type MusicTrackAdminRow,
} from "@/components/admin/music-feature-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMusicPage() {
  await requireAdminSection("music");
  const admin = createAdminClient();

  const [
    trackResult,
    roomResult,
  ] = await Promise.all([
    admin
      .from("music_tracks")
      .select("id, track_key, name, description, storage_path, original_file_name, mime_type, file_size_bytes, is_active, is_personal_selectable, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    admin
      .from("rooms")
      .select("id, name, music_track_id")
      .not("music_track_id", "is", null)
      .order("name", { ascending: true }),
  ]);

  if (trackResult.error) {
    throw new Error(
      `Unable to load Background Music: ${trackResult.error.message}`,
    );
  }

  if (roomResult.error) {
    throw new Error(
      `Unable to load music locations: ${roomResult.error.message}`,
    );
  }

  const locationsByTrack: Record<
    string,
    { id: string; name: string }[]
  > = {};

  for (const room of roomResult.data ?? []) {
    if (!room.music_track_id) continue;

    (
      locationsByTrack[
        room.music_track_id
      ] ??= []
    ).push({
      id: room.id,
      name: room.name,
    });
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Administration</p>
        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Music</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">Manage location music and collectible personal tracks.</p>
        <MusicFeatureManager
          initialTracks={
            (trackResult.data ?? []) as MusicTrackAdminRow[]
          }
          initialLocationsByTrack={
            locationsByTrack
          }
        />
      </div>
    </main>
  );
}
