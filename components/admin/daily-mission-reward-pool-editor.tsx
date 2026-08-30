"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  deleteDailyMissionRewardPoolEntry,
  saveDailyMissionRewardPoolEntry,
  type RewardPoolOwner,
} from "@/app/(portal)/admin/missions/actions";

type ItemOption = {
  id: string;
  name: string;
};

type PoolEntry = {
  id: string;
  item_id: string;
  chance_pct: number;
  quantity: number;
  sort_order: number;
  is_active: boolean;
};

type Feedback = {
  ok: boolean;
  message: string;
} | null;

function PoolRow({
  owner,
  items,
  entry,
  index,
}: {
  owner: RewardPoolOwner;
  items: ItemOption[];
  entry: PoolEntry;
  index: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [itemId, setItemId] = useState(entry.item_id);
  const [chancePct, setChancePct] = useState(entry.chance_pct);
  const [quantity, setQuantity] = useState(entry.quantity);
  const [isActive, setIsActive] = useState(entry.is_active);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function showFeedback(next: Feedback) {
    setFeedback(next);
    window.setTimeout(() => setFeedback(null), 5000);
  }

  function save() {
    startTransition(async () => {
      const result = await saveDailyMissionRewardPoolEntry({
        id: entry.id,
        owner,
        itemId,
        chancePct,
        quantity,
        sortOrder: entry.sort_order,
        isActive,
      });

      showFeedback(result);
      if (result.ok) router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result =
        await deleteDailyMissionRewardPoolEntry(entry.id);

      showFeedback(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <div className="grid gap-3 md:grid-cols-[1fr_100px_100px_auto_auto_auto] md:items-end">
        <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
          Item {index + 1}
          <select
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className="mt-1 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 normal-case tracking-normal text-sm text-[rgb(var(--sep-colour-c0af95))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
          Chance %
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={chancePct}
            onChange={(event) =>
              setChancePct(Number(event.target.value))
            }
            className="mt-1 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 normal-case tracking-normal text-sm text-[rgb(var(--sep-colour-c0af95))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
          />
        </label>

        <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
          Quantity
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) =>
              setQuantity(Number(event.target.value))
            }
            className="mt-1 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 normal-case tracking-normal text-sm text-[rgb(var(--sep-colour-c0af95))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) =>
              setIsActive(event.target.checked)
            }
          />
          Active
        </label>

        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] enabled:hover:border-[rgb(var(--sep-colour-a07945))] disabled:cursor-wait disabled:opacity-55"
        >
          {isPending ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={remove}
          className="border border-red-900/60 bg-red-950/20 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-red-300 enabled:hover:bg-red-950/35 disabled:cursor-wait disabled:opacity-55"
        >
          Remove
        </button>
      </div>

      {feedback ? (
        <p
          className={[
            "mt-2 text-right text-[10px]",
            feedback.ok
              ? "text-[rgb(var(--sep-colour-bfa471))]"
              : "text-red-400",
          ].join(" ")}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

export function DailyMissionRewardPoolEditor({
  owner,
  items,
  entries,
}: {
  owner: RewardPoolOwner;
  items: ItemOption[];
  entries: PoolEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function addItem() {
    if (items.length === 0) {
      setFeedback({
        ok: false,
        message: "There are no active Items available.",
      });
      return;
    }

    startTransition(async () => {
      const nextSort =
        entries.length > 0
          ? Math.max(...entries.map((entry) => entry.sort_order)) + 10
          : 10;

      const result = await saveDailyMissionRewardPoolEntry({
        owner,
        itemId: items[0].id,
        chancePct: 100,
        quantity: 1,
        sortOrder: nextSort,
        isActive: true,
      });

      setFeedback(result);
      window.setTimeout(() => setFeedback(null), 5000);

      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-806b50))]">
            Curated secondary Item pool
          </p>

          <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-938673))]">
            Evaluated from top to bottom. Each row gets its own chance roll;
            the first successful Item wins. At most one secondary Item is awarded.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={addItem}
          className="shrink-0 border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] enabled:hover:border-[rgb(var(--sep-colour-a07945))] disabled:cursor-wait disabled:opacity-55"
        >
          {isPending ? "Adding..." : "+ Add Item"}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="border border-dashed border-[rgb(var(--sep-colour-59432c))]/35 px-3 py-3 text-sm text-[rgb(var(--sep-colour-938673))]">
            No secondary Items configured.
          </p>
        ) : (
          entries.map((entry, index) => (
            <PoolRow
              key={entry.id}
              owner={owner}
              items={items}
              entry={entry}
              index={index}
            />
          ))
        )}
      </div>

      {feedback ? (
        <p
          className={[
            "mt-2 text-right text-[10px]",
            feedback.ok
              ? "text-[rgb(var(--sep-colour-bfa471))]"
              : "text-red-400",
          ].join(" ")}
        >
          {feedback.message}
        </p>
      ) : null}

      <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-938673))]">
        Pool changes affect future UTC Daily Mission snapshots only.
        A fixed Reward Item above takes priority over this pool.
      </p>
    </div>
  );
}
