

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminVaultFilters } from "@/components/admin/admin-vault-filters";
import Link from "next/link";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  assignVaultItemToCharacter,
  createUniqueItemInVault,
  destroyVaultItem,
  updateVaultUniqueItem,
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
  transfer_policy_override: string | null;
  is_quest_item_override: boolean | null;
  notes: string | null;
  item: Relation<{
    name: string;
    quality: string;
    image_url: string | null;
    transfer_policy: string;
    is_quest_item: boolean;
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
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))]";

export default async function AdminItemVaultPage({
  searchParams,
}: Props) {
  await requireAdminSection("items");

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
        transfer_policy_override,
        is_quest_item_override,
        notes,
        item:items(
          name,
          quality,
          image_url,
          transfer_policy,
          is_quest_item
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
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Administration
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Admin Vault
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
              Ownerless Unique Items remain here until staff assigns them,
              reuses them in a plot, or deliberately destroys them.
            </p>
          </div>

          <Link
            href="/admin/items"
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-ac9879))]"
          >
            Item catalogue
          </Link>
        </div>

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {params.error}
          </div>
        ) : null}

        <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            New individual Item
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
            Create directly in Vault
          </h2>

          <AdminActionForm
            action={createUniqueItemInVault}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="liveAction" value="1" />

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
          </AdminActionForm>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Stored Items
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
                Vault contents
              </h2>
            </div>

            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              {vault.length} Item{vault.length === 1 ? "" : "s"}
            </p>
          </div>

          {vault.length ? (
            <AdminVaultFilters scope="live" total={vault.length} />
          ) : null}

          {vault.length ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {vault.map((row) => {
                const master = one(row.item);
                const name =
                  row.custom_name?.trim() || master?.name || "Unknown Item";
                const quality = row.quality_override ?? master?.quality ?? "average";
                const image = row.custom_image_url ?? master?.image_url ?? null;
                const transfer =
                  row.transfer_policy_override ??
                  master?.transfer_policy ??
                  "free";
                const quest =
                  row.is_quest_item_override ??
                  master?.is_quest_item ??
                  false;
                const searchText = [
                  name,
                  master?.name ?? "",
                  row.custom_description ?? "",
                  row.notes ?? "",
                ]
                  .join(" ")
                  .toLowerCase();

                const history = [...(row.history ?? [])].sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                );

                return (
                  <article
                    key={row.id}
                    data-vault-scope="live"
                    data-search={searchText}
                    data-quality={quality}
                    data-transfer={transfer}
                    data-quest={quest ? "yes" : "no"}
                    className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4"
                  >
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-serif text-[rgb(var(--sep-colour-756247))]">
                            ◇
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">
                          {name}
                        </p>
                        <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756958))]">
                          Unique · {quality} · {transfer}
                          {quest ? " · Quest" : ""}
                        </p>
                      </div>
                    </div>

                    {row.custom_description?.trim() ? (
                      <p className="mt-3 text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
                        {row.custom_description}
                      </p>
                    ) : null}

                    <details className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))]">
                      <summary className="cursor-pointer list-none px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))]">
                        Edit Vault Item
                      </summary>

                      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3">
                        <AdminActionForm
                          action={updateVaultUniqueItem}
                          className="grid gap-3 md:grid-cols-2"
                        >
                          <input type="hidden" name="instanceId" value={row.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="liveAction" value="1" />

                          <input
                            name="customName"
                            defaultValue={row.custom_name ?? ""}
                            placeholder="Custom name"
                            className={inputClass}
                          />

                          <input
                            type="url"
                            name="customImageUrl"
                            defaultValue={row.custom_image_url ?? ""}
                            placeholder="Custom image URL"
                            className={inputClass}
                          />

                          <textarea
                            name="customDescription"
                            rows={3}
                            defaultValue={row.custom_description ?? ""}
                            placeholder="Custom description"
                            className={`${inputClass} md:col-span-2`}
                          />

                          <select
                            name="qualityOverride"
                            defaultValue={row.quality_override ?? ""}
                            className={inputClass}
                          >
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
                            defaultValue={row.transfer_policy_override ?? ""}
                            className={inputClass}
                          >
                            <option value="">Inherit transfer policy</option>
                            <option value="free">Free</option>
                            <option value="restricted">Restricted</option>
                            <option value="bound">Bound</option>
                          </select>

                          <select
                            name="questOverride"
                            defaultValue={
                              row.is_quest_item_override === null
                                ? "inherit"
                                : row.is_quest_item_override
                                  ? "yes"
                                  : "no"
                            }
                            className={inputClass}
                          >
                            <option value="inherit">Inherit Quest status</option>
                            <option value="yes">Quest Item: Yes</option>
                            <option value="no">Quest Item: No</option>
                          </select>

                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={row.notes ?? ""}
                            placeholder="Private staff notes"
                            className={inputClass}
                          />

                          <div className="md:col-span-2 flex justify-end">
                            <button type="submit" className={buttonClass}>
                              Save Vault Item
                            </button>
                          </div>
                        </AdminActionForm>
                      </div>
                    </details>

                    <AdminActionForm
                      action={assignVaultItemToCharacter}
                      className="mt-4 flex gap-2"
                    >
                      <input type="hidden" name="instanceId" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="liveAction" value="1" />

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
                    </AdminActionForm>

                    {history.length ? (
                      <details className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))]">
                        <summary className="cursor-pointer list-none px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))]">
                          Provenance
                        </summary>

                        <div className="space-y-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3">
                          {history.slice(0, 8).map((entry) => (
                            <div
                              key={entry.id}
                              className="border-l border-[rgb(var(--sep-colour-765937))]/55 pl-3"
                            >
                              <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a68a61))]">
                                {entry.event_type.replace(/_/g, " ")}
                              </p>
                              <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-817565))]">
                                {entry.details}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    <AdminActionForm
                      action={destroyVaultItem}
                      confirmMessage={`Permanently destroy ${name}? The live Item will be removed, while its audit archive and provenance are retained.`}
                      className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4"
                    >
                      <input type="hidden" name="instanceId" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="liveAction" value="1" />

                      <label className="block">
                        <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7154))]">
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
                    </AdminActionForm>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-6 text-sm italic text-[rgb(var(--sep-colour-817565))]">
              The Admin Vault is empty.
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Audit archive
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
                Destroyed Unique Items
              </h2>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-[rgb(var(--sep-colour-817565))]">
                Destroyed Items no longer exist in live inventory, but their final
                state, destruction reason, and complete provenance are retained here.
              </p>
            </div>
            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              {destroyed.length} archived
            </p>
          </div>

          {destroyed.length ? (
            <AdminVaultFilters scope="archive" total={destroyed.length} />
          ) : null}

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
                    data-vault-scope="archive"
                    data-search={[
                      row.display_name,
                      row.item_name,
                      row.description ?? "",
                      row.destruction_reason,
                      row.original_instance_id,
                    ]
                      .join(" ")
                      .toLowerCase()}
                    data-quality={row.quality ?? ""}
                    className="border border-red-950/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
                  >
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] opacity-70">
                        {row.image_url ? (
                          <img
                            src={row.image_url}
                            alt=""
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-serif text-[rgb(var(--sep-colour-756247))]">
                            ◇
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-serif text-lg text-[rgb(var(--sep-colour-bfa98a))]">
                              {row.display_name || row.item_name}
                            </p>
                            <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756958))]">
                              Destroyed · {row.quality ?? "unknown quality"}
                            </p>
                          </div>
                          <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6254))]">
                            {destroyedAt} UTC
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border border-red-950/35 bg-red-950/10 px-3 py-2">
                      <p className="text-[8px] uppercase tracking-[0.13em] text-red-300/80">
                        Destruction reason
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-9c8e7c))]">
                        {row.destruction_reason}
                      </p>
                    </div>

                    {row.description?.trim() ? (
                      <p className="mt-3 text-xs leading-6 text-[rgb(var(--sep-colour-817565))]">
                        {row.description}
                      </p>
                    ) : null}

                    <details className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))]">
                      <summary className="cursor-pointer list-none px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))]">
                        Retained provenance · {history.length} event
                        {history.length === 1 ? "" : "s"}
                      </summary>
                      <div className="space-y-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3">
                        {history.length ? (
                          history.map((entry, index) => (
                            <div
                              key={`${row.id}-${index}`}
                              className="border-l border-[rgb(var(--sep-colour-765937))]/55 pl-3"
                            >
                              <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a68a61))]">
                                {(entry.event_type ?? "unknown event").replace(/_/g, " ")}
                              </p>
                              {entry.details ? (
                                <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-817565))]">
                                  {entry.details}
                                </p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs italic text-[rgb(var(--sep-colour-756958))]">
                            No prior provenance records were present.
                          </p>
                        )}
                      </div>
                    </details>

                    <p className="mt-3 font-mono text-[9px] text-[rgb(var(--sep-colour-5f5549))]">
                      Original instance: {row.original_instance_id}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-6 text-sm italic text-[rgb(var(--sep-colour-817565))]">
              No Unique Items have been destroyed since the archive was enabled.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
