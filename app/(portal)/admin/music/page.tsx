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

  const { data, error } = await admin
    .from("music_tracks")
    .select("id, track_key, name, description, storage_path, original_file_name, mime_type, file_size_bytes, is_active, is_personal_selectable, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Unable to load Background Music: ${error.message}`);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Administration</p>
        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Music</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">Manage location music and collectible personal tracks.</p>
        <MusicFeatureManager initialTracks={(data ?? []) as MusicTrackAdminRow[]} />
      </div>
    </main>
  );
}
