"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COSMETIC_CATEGORIES, COSMETIC_LABELS, type CosmeticCategory } from "@/lib/cosmetics/catalogue";

export type CosmeticAdminRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  preview_image_url: string | null;
  asset_url: string | null;
  preview_storage_path: string | null;
  asset_storage_path: string | null;
  config_json: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const input = "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";
const button = "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-45";

function categoryLabel(category: CosmeticAdminRow["category"]) {
  return COSMETIC_LABELS[category];
}

async function responseJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {} as { error?: string; items?: CosmeticAdminRow[]; path?: string; token?: string };
  try {
    return JSON.parse(text) as { error?: string; items?: CosmeticAdminRow[]; path?: string; token?: string };
  } catch {
    return { error: response.ok ? "The server returned an invalid response." : `Request failed (${response.status}).` };
  }
}

export function CosmeticsFeatureManager({ initialItems }: { initialItems: CosmeticAdminRow[] }) {
  const router = useRouter();
  const assetRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function reload() {
    const response = await fetch("/api/admin/cosmetics", { cache: "no-store" });
    const data = await responseJson(response);
    if (!response.ok) throw new Error(data.error ?? "Unable to refresh Cosmetics.");
    setItems(data.items ?? []);
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("sepulchria:admin-data-changed"));
    });
    router.refresh();
  }

  function validateFile(file: File, kind: "asset" | "preview") {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(2)} MB. Cosmetic images must be 10 MB or smaller.`);
    }
    const types = kind === "asset"
      ? new Set(["image/png", "image/webp", "image/svg+xml"])
      : new Set(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]);
    if (!types.has(file.type)) {
      throw new Error(kind === "asset"
        ? "The actual cosmetic asset must be PNG, WebP or SVG."
        : "The preview must be PNG, WebP, JPEG or SVG.");
    }
  }

  async function uploadFile({ slug, file, kind }: { slug: string; file: File; kind: "asset" | "preview" }) {
    validateFile(file, kind);
    const ticket = await fetch("/api/admin/cosmetics/upload-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind, mime_type: file.type, file_size_bytes: file.size }),
    });
    const ticketData = await responseJson(ticket);
    if (!ticket.ok) throw new Error(ticketData.error ?? "Unable to authorise cosmetic upload.");

    const path = String(ticketData.path ?? "");
    const token = String(ticketData.token ?? "");
    if (!path || !token) throw new Error("The cosmetic upload ticket was incomplete.");

    const upload = await createClient().storage
      .from("cosmetics")
      .uploadToSignedUrl(path, token, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (upload.error) throw new Error(`Unable to store ${kind}: ${upload.error.message}`);
    return path;
  }

  async function create(formData: FormData) {
    const asset = formData.get("asset");
    const preview = formData.get("preview");

    if (!(asset instanceof File) || asset.size === 0) {
      setFailed(true);
      setMessage("Choose the actual transparent cosmetic asset.");
      return;
    }

    const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
    setBusy(true);
    setMessage("");
    setFailed(false);

    try {
      const assetPath = await uploadFile({ slug, file: asset, kind: "asset" });
      let previewPath: string | null = null;
      if (preview instanceof File && preview.size > 0) {
        previewPath = await uploadFile({ slug, file: preview, kind: "preview" });
      }

      const response = await fetch("/api/admin/cosmetics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          category: String(formData.get("category") ?? ""),
          sort_order: Number(formData.get("sort_order") ?? 0),
          is_active: formData.get("is_active") === "on",
          asset_storage_path: assetPath,
          preview_storage_path: previewPath,
        }),
      });

      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Unable to save cosmetic.");

      if (assetRef.current) assetRef.current.value = "";
      if (previewRef.current) previewRef.current.value = "";
      setMessage("Cosmetic created.");
      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to create cosmetic.");
    } finally {
      setBusy(false);
    }
  }

  async function update(item: CosmeticAdminRow, formData: FormData) {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/cosmetics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          sort_order: Number(formData.get("sort_order") ?? 0),
          is_active: formData.get("is_active") === "on",
        }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Unable to save cosmetic.");
      setMessage("Cosmetic saved.");
      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to save cosmetic.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CosmeticAdminRow) {
    if (!window.confirm(`Delete "${item.name}" permanently?`)) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch(`/api/admin/cosmetics?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Unable to delete cosmetic.");
      setMessage("Cosmetic deleted.");
      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to delete cosmetic.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))]">Collectible feature</p>
        <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Cosmetic Catalogue</h3>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          All character-facing and portal-facing cosmetic categories are supported. Transparent PNG is recommended for frames and overlays; PNG or WebP works well for backgrounds.
        </p>
      </header>

      {message ? (
        <div className={`mx-5 mt-5 border px-4 py-3 text-xs ${failed
          ? "border-red-800/55 text-red-200"
          : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]"}`}>
          {message}
        </div>
      ) : null}

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/30 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          id="cosmetic-new"
          className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void create(new FormData(event.currentTarget));
          }}
        >
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">Add Cosmetic</p>
          <div className="mt-4 space-y-3">
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="gilded-reliquary" className={input} />
            <input name="name" required placeholder="Gilded Reliquary" className={input} />
            <textarea name="description" rows={3} maxLength={1500} placeholder="Description" className={`${input} resize-y`} />

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Cosmetic type</span>
              <select name="category" defaultValue="sheet_frame" className={input}>
                {COSMETIC_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {COSMETIC_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Actual cosmetic asset</span>
              <input
                ref={assetRef}
                name="asset"
                type="file"
                required
                accept="image/png,image/webp,image/svg+xml,.png,.webp,.svg"
                className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]"
              />
            </label>
            <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
              PNG, WebP or SVG - max 10 MB. Transparent background recommended.
            </p>

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Store / admin preview (optional)</span>
              <input
                ref={previewRef}
                name="preview"
                type="file"
                accept="image/png,image/webp,image/jpeg,image/svg+xml,.png,.webp,.jpg,.jpeg,.svg"
                className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Sort order</span>
              <input name="sort_order" type="number" defaultValue={0} className={input} />
            </label>

            <label className="flex gap-2 text-xs">
              <input type="checkbox" name="is_active" defaultChecked />
              Active
            </label>

            <button type="submit" disabled={busy} className={button}>
              {busy ? "Working..." : "Upload Cosmetic"}
            </button>
          </div>
        </form>

        <div className="bg-[rgb(var(--sep-colour-120d0a))] p-5">
          <h4 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Cosmetics - {items.length}</h4>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <form
                key={item.id}
                id={`admin-cosmetic-${item.id}`}
                data-admin-cosmetic-id={item.id}
                data-admin-cosmetic-name={item.name}
                data-admin-cosmetic-category={item.category}
                data-admin-cosmetic-active={String(item.is_active)}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void update(item, new FormData(event.currentTarget));
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
                  <div className="flex min-h-28 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0a08))] p-2">
                    {item.preview_image_url ?? item.asset_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview_image_url ?? item.asset_url ?? ""} alt="" className="max-h-24 max-w-full object-contain" />
                    ) : (
                      <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-625747))]">No preview</span>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">{item.name}</p>
                        <p className="font-mono text-[9px] text-[rgb(var(--sep-colour-6f665b))]">{item.slug}</p>
                      </div>
                      <span className="border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b59b74))]">
                        {categoryLabel(item.category)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input name="name" required defaultValue={item.name} className={input} />
                      <label>
                        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Sort order</span>
                        <input name="sort_order" type="number" defaultValue={item.sort_order} className={input} />
                      </label>
                    </div>

                    <textarea name="description" rows={3} maxLength={1500} defaultValue={item.description} className={`${input} mt-3 resize-y`} />

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <label className="flex gap-2 text-xs">
                        <input type="checkbox" name="is_active" defaultChecked={item.is_active} />
                        Active
                      </label>
                      <button type="submit" disabled={busy} className={button}>Save</button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(item)}
                        className="border border-red-900/65 bg-red-950/20 px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-red-300 transition hover:border-red-700"
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-3 break-all text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                      Asset: {item.asset_storage_path ?? "missing"}
                    </p>
                  </div>
                </div>
              </form>
            ))}

            {items.length === 0 ? (
              <p className="border border-dashed border-[rgb(var(--sep-colour-59432c))]/40 px-4 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-706452))]">
                No cosmetics have been created yet.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
