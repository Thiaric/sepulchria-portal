import { setUserPortalSkinEntitlement } from "@/app/(portal)/admin/users/actions";

export type AdminPortalSkin = {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
};

export type AdminPortalSkinEntitlement = {
  skin_id: string;
  enabled: boolean;
  source: "paid" | "staff";
  note: string | null;
};

export function AdminUserPortalSkins({
  userId,
  skins,
  entitlements,
}: {
  userId: string;
  skins: AdminPortalSkin[];
  entitlements: AdminPortalSkinEntitlement[];
}) {
  const bySkin = new Map(
    entitlements.map((entry) => [entry.skin_id, entry]),
  );

  const premiumSkins =
    skins.filter((skin) => !skin.is_default);

  if (premiumSkins.length === 0) {
    return null;
  }

  return (
    <details className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
      <summary className="cursor-pointer list-none text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        Portal skins ▾
      </summary>

      <div className="mt-3 space-y-3">
        {premiumSkins.map((skin) => {
          const entitlement = bySkin.get(skin.id);
          const enabled = entitlement?.enabled === true;

          return (
            <form
              key={skin.id}
              action={setUserPortalSkinEntitlement}
              className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3"
            >
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="skinId" value={skin.id} />

              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-sm text-[rgb(var(--sep-colour-dfc79c))]">
                  {skin.name}
                </span>
                <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a99069))]">
                  {enabled ? "Unlocked" : "Locked"}
                </span>
              </div>

              <div className="mt-2 grid gap-2">
                <select
                  name="enabled"
                  defaultValue={enabled ? "true" : "false"}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0c0907))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="false">Locked</option>
                  <option value="true">Unlocked</option>
                </select>

                <select
                  name="source"
                  defaultValue={entitlement?.source ?? "staff"}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0c0907))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="paid">Real-money purchase</option>
                  <option value="staff">Staff grant</option>
                </select>

                <input
                  name="note"
                  maxLength={1000}
                  defaultValue={entitlement?.note ?? ""}
                  placeholder="Payment reference or grant reason"
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0c0907))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))]"
                />

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))]"
                >
                  Save skin access
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </details>
  );
}
