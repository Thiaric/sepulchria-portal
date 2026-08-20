import Link from "next/link";

import { requireStaff } from "@/lib/auth/require-staff";
import {
  assignVaultItemToCharacter,
  createUniqueItemInVault,
  destroyVaultItem,
} from "@/lib/items/admin-inventory-actions";
import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type MasterItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type Character = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
};

type VaultRow = {
  id: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  quality_override: string | null;
  item: Relation<{
    name: string;
    quality: string;
    image_url: string | null;
  }>;
  history: {
    id: string;
    event_type: string;
    details: string;
    created_at: string;
  }[] | null;
};

type DestroyedHistoryEntry = {
  event_type?: string;
  details?: string;
  created_at?: string;
};

type DestroyedArchiveRow = {
  id: string;
  original_instance_id: string;
  item_name: string;
  display_name: string;
  description: string | null;
  image_url: string | null;
  quality: string | null;
  destruction_reason: string;
  destroyed_at: string;
  provenance_snapshot: DestroyedHistoryEntry[] | null;
};

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function characterName(character: Character) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

const inputClass =
  "w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]";

const buttonClass =
  "border border-[#987344] bg-[#3b2919] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[#efd6a8]";

export default async function AdminItemVaultPage({
  searchParams,
}: Props) {
  await requireStaff();

  const params = (await searchParams) ?? {};
  const supabase = await createClient();

  const [itemsResult, charactersResult, vaultResult, destroyedResult] =
    await Promise.all([
    supabase
      .from("items")
      .select("id, name, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("characters")
      .select("id, display_name, first_name, surname")
      .order("display_name", { ascending: true }),

    supabase
      .from("character_item_instances")
      .select(`
        id,
        custom_name,
        custom_description,
        custom_image_url,
        quality_override,
        item:items(
          name,
          quality,
          image_url
        ),
        history:item_instance_history(
          id,
          event_type,
          details,
          created_at
        )
      `)
      .eq("vault_status", "admin_vault")
      .is("owner_character_id", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("destroyed_item_instances")
      .select(`
        id,
        original_instance_id,
        item_name,
        display_name,
        description,
        image_url,
        quality,
        destruction_reason,
        destroyed_at,
        provenance_snapshot
      `)
      .order("destroyed_at", { ascending: false })
      .limit(100),
  ]);

  const firstError =
    itemsResult.error ??
    charactersResult.error ??
    vaultResult.error ??
    destroyedResult.error;

  if (firstError) {
    throw new Error(`Unable to load Admin Vault: ${firstError.message}`);
  }

  const items = (itemsResult.data ?? []) as MasterItem[];
  const characters = (charactersResult.data ?? []) as Character[];
  const vault = (vaultResult.data ?? []) as unknown as VaultRow[];
  const destroyed = (destroyedResult.data ?? []) as unknown as DestroyedArchiveRow[];

  const returnTo = "/admin/items/vault";

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Administration
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              Admin Vault
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Ownerless Unique Items remain here until staff assigns them,
              reuses them in a plot, or deliberately destroys them.
            </p>
          </div>

          <Link
            href="/admin/items"
            className="border border-[#60482e]/55 bg-[#15100d] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#ac9879]"
          >
            Item catalogue
          </Link>
        </div>

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {params.error}
          </div>
        ) : null}

        <section className="mt-7 border border-[#60482e]/45 bg-[#15100d] p-5">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            New individual Item
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
            Create directly in Vault
          </h2>

          <form
            action={createUniqueItemInVault}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input type="hidden" name="returnTo" value={returnTo} />

            <select name="itemId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select master Item
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {!item.is_active ? " (inactive)" : ""}
                </option>
              ))}
            </select>

            <input
              name="customName"
              placeholder="Custom name (optional)"
              className={inputClass}
            />

            <textarea
              name="customDescription"
              rows={3}
              placeholder="Custom description (optional)"
              className={`${inputClass} md:col-span-2`}
            />

            <input
              type="url"
              name="customImageUrl"
              placeholder="Custom image URL (optional)"
              className={inputClass}
            />

            <select name="qualityOverride" defaultValue="" className={inputClass}>
              <option value="">Inherit quality</option>
              <option value="poor">Poor</option>
              <option value="average">Average</option>
              <option value="fine">Fine</option>
              <option value="superior">Superior</option>
              <option value="flawless">Flawless</option>
              <option value="peerless">Peerless</option>
            </select>

            <select
              name="transferPolicyOverride"
              defaultValue=""
              className={inputClass}
            >
              <option value="">Inherit transfer policy</option>
              <option value="free">Free</option>
              <option value="restricted">Restricted</option>
              <option value="bound">Bound</option>
            </select>

            <select
              name="questOverride"
              defaultValue="inherit"
              className={inputClass}
            >
              <option value="inherit">Inherit Quest status</option>
              <option value="yes">Quest Item: Yes</option>
              <option value="no">Quest Item: No</option>
            </select>

            <textarea
              name="notes"
              rows={2}
              placeholder="Private staff notes (optional)"
              className={inputClass}
            />

            <div className="md:col-span-2">
              <button type="submit" className={buttonClass}>
                Create in Vault
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                Stored Items
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
                Vault contents
              </h2>
            </div>

            <p className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
              {vault.length} Item{vault.length === 1 ? "" : "s"}
            </p>
          </div>

          {vault.length ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {vault.map((row) => {
                const master = one(row.item);
                const name =
                  row.custom_name?.trim() || master?.name || "Unknown Item";
                const quality = row.quality_override ?? master?.quality ?? "average";
                const image = row.custom_image_url ?? master?.image_url ?? null;

                const history = [...(row.history ?? [])].sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                );

                return (
                  <article
                    key={row.id}
                    className="border border-[#59432c]/40 bg-[#100c09] p-4"
                  >
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#60482e]/45 bg-[#0d0907]">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-serif text-[#756247]">
                            ◇
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-serif text-lg text-[#d8bf91]">
                          {name}
                        </p>
                        <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[#756958]">
                          Unique · {quality}
                        </p>
                      </div>
                    </div>

                    {row.custom_description?.trim() ? (
                      <p className="mt-3 text-xs leading-6 text-[#8f8271]">
                        {row.custom_description}
                      </p>
                    ) : null}

                    <form
                      action={assignVaultItemToCharacter}
                      className="mt-4 flex gap-2"
                    >
                      <input type="hidden" name="instanceId" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />

                      <select
                        name="characterId"
                        required
                        defaultValue=""
                        className={`${inputClass} min-w-0 flex-1`}
                      >
                        <option value="" disabled>
                          Assign to character
                        </option>
                        {characters.map((character) => (
                          <option key={character.id} value={character.id}>
                            {characterName(character)}
                          </option>
                        ))}
                      </select>

                      <button type="submit" className={buttonClass}>
                        Assign
                      </button>
                    </form>

                    {history.length ? (
                      <details className="mt-4 border border-[#59432c]/35 bg-[#15100d]">
                        <summary className="cursor-pointer list-none px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#9b8768]">
                          Provenance
                        </summary>

                        <div className="space-y-2 border-t border-[#59432c]/30 p-3">
                          {history.slice(0, 8).map((entry) => (
                            <div
                              key={entry.id}
                              className="border-l border-[#765937]/55 pl-3"
                            >
                              <p className="text-[8px] uppercase tracking-[0.12em] text-[#a68a61]">
                                {entry.event_type.replace(/_/g, " ")}
                              </p>
                              <p className="mt-1 text-[10px] leading-5 text-[#817565]">
                                {entry.details}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    <form
                      action={destroyVaultItem}
                      className="mt-4 border-t border-[#59432c]/35 pt-4"
                    >
                      <input type="hidden" name="instanceId" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />

                      <label className="block">
                        <span className="text-[8px] uppercase tracking-[0.14em] text-[#8f7154]">
                          Destruction reason
                        </span>
                        <textarea
                          name="destructionReason"
                          required
                          maxLength={1000}
                          rows={2}
                          placeholder="Why is this individual Item being permanently destroyed?"
                          className={`${inputClass} mt-2`}
                        />
                      </label>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="submit"
                          className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                        >
                          Archive & destroy
                        </button>
                      </div>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 border border-[#59432c]/40 bg-[#100c09] p-6 text-sm italic text-[#817565]">
              The Admin Vault is empty.
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-[#60482e]/35 pt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                Audit archive
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
                Destroyed Unique Items
              </h2>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-[#817565]">
                Destroyed Items no longer exist in live inventory, but their final
                state, destruction reason, and complete provenance are retained here.
              </p>
            </div>
            <p className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
              {destroyed.length} archived
            </p>
          </div>

          {destroyed.length ? (
            <div className="mt-4 space-y-3">
              {destroyed.map((row) => {
                const history = Array.isArray(row.provenance_snapshot)
                  ? row.provenance_snapshot
                  : [];
                const destroyedAt = new Date(row.destroyed_at).toLocaleString(
                  "en-GB",
                  {
                    timeZone: "UTC",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                return (
                  <article
                    key={row.id}
                    className="border border-red-950/45 bg-[#100c09] p-4"
                  >
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#60482e]/45 bg-[#0d0907] opacity-70">
                        {row.image_url ? (
                          <img
                            src={row.image_url}
                            alt=""
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-serif text-[#756247]">
                            ◇
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-serif text-lg text-[#bfa98a]">
                              {row.display_name || row.item_name}
                            </p>
                            <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[#756958]">
                              Destroyed · {row.quality ?? "unknown quality"}
                            </p>
                          </div>
                          <p className="text-[8px] uppercase tracking-[0.12em] text-[#6f6254]">
                            {destroyedAt} UTC
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border border-red-950/35 bg-red-950/10 px-3 py-2">
                      <p className="text-[8px] uppercase tracking-[0.13em] text-red-300/80">
                        Destruction reason
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#9c8e7c]">
                        {row.destruction_reason}
                      </p>
                    </div>

                    {row.description?.trim() ? (
                      <p className="mt-3 text-xs leading-6 text-[#817565]">
                        {row.description}
                      </p>
                    ) : null}

                    <details className="mt-3 border border-[#59432c]/35 bg-[#15100d]">
                      <summary className="cursor-pointer list-none px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#9b8768]">
                        Retained provenance · {history.length} event
                        {history.length === 1 ? "" : "s"}
                      </summary>
                      <div className="space-y-2 border-t border-[#59432c]/30 p-3">
                        {history.length ? (
                          history.map((entry, index) => (
                            <div
                              key={`${row.id}-${index}`}
                              className="border-l border-[#765937]/55 pl-3"
                            >
                              <p className="text-[8px] uppercase tracking-[0.12em] text-[#a68a61]">
                                {(entry.event_type ?? "unknown event").replace(/_/g, " ")}
                              </p>
                              {entry.details ? (
                                <p className="mt-1 text-[10px] leading-5 text-[#817565]">
                                  {entry.details}
                                </p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs italic text-[#756958]">
                            No prior provenance records were present.
                          </p>
                        )}
                      </div>
                    </details>

                    <p className="mt-3 font-mono text-[9px] text-[#5f5549]">
                      Original instance: {row.original_instance_id}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 border border-[#59432c]/40 bg-[#100c09] p-6 text-sm italic text-[#817565]">
              No Unique Items have been destroyed since the archive was enabled.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
