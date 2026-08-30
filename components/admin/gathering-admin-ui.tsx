"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  addGatheringReward,
  createGatheringLocation,
  deleteGatheringReward,
  updateGatheringLocation,
  updateGatheringReward,
  type GatheringAdminActionResult,
} from "@/app/(portal)/admin/gathering/actions";

export type GatheringAdminRoom = {
  id: string;
  label: string;
};

export type GatheringAdminItem = {
  id: string;
  name: string;
  teachesRecipe: boolean;
};

export type GatheringAdminReward = {
  id: string;
  rewardType: "item" | "remnants";
  itemId: string | null;
  itemName: string | null;
  quantityMin: number | null;
  quantityMax: number | null;
  remnantsMin: number | null;
  remnantsMax: number | null;
  weight: number;
  active: boolean;
  sortOrder: number;
};

export type GatheringAdminLocation = {
  id: string;
  roomLabel: string;
  name: string;
  description: string;
  nothingChance: number;
  active: boolean;
  rewards: GatheringAdminReward[];
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const labelClass =
  "text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-8b765a))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-4 py-2.5 text-[9px] font-normal leading-[1.15] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-bca27b))] transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-ecd2a3))] disabled:cursor-not-allowed disabled:opacity-50";

const dangerButtonClass =
  "border border-red-900/55 bg-red-950/15 px-3 py-2 text-[9px] font-normal leading-[1.15] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50";

type Action = (formData: FormData) => Promise<GatheringAdminActionResult>;

function ActionForm({
  action,
  children,
  className = "",
  footerClassName = "",
  idleText,
  pendingText,
  buttonClassName = buttonClass,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  footerClassName?: string;
  idleText: string;
  pendingText: string;
  buttonClassName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || locked) return;

    const formData = new FormData(event.currentTarget);
    setFeedback(null);

    startTransition(async () => {
      const result = await action(formData);

      if (!result.ok) {
        setFeedback({ type: "error", message: result.message });
        timerRef.current = window.setTimeout(() => setFeedback(null), 5000);
        return;
      }

      setLocked(true);
      setFeedback({ type: "success", message: result.message });
      timerRef.current = window.setTimeout(() => {
        setFeedback(null);
        router.refresh();
      }, 5000);
    });
  }

  return (
    <form onSubmit={submit} className={className}>
      {children}
      <div className={["flex flex-wrap items-center gap-3", footerClassName].join(" ")}>
        {feedback ? (
          <span
            role={feedback.type === "error" ? "alert" : "status"}
            className={
              feedback.type === "success"
                ? "text-[9px] leading-4 text-[rgb(var(--sep-colour-b7c7a8))]"
                : "text-[9px] leading-4 text-[rgb(var(--sep-colour-c9a398))]"
            }
          >
            {feedback.message}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={pending || locked}
          aria-disabled={pending || locked}
          aria-busy={pending}
          className={buttonClassName}
        >
          {pending ? pendingText : idleText}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function GatheringCreateLocationForm({ rooms }: { rooms: GatheringAdminRoom[] }) {
  if (!rooms.length) {
    return (
      <p className="mt-4 text-[10px] text-[rgb(var(--sep-colour-807464))]">
        Every active Location is already configured for Gathering.
      </p>
    );
  }

  return (
    <ActionForm
      action={createGatheringLocation}
      className="mt-4 grid gap-3 lg:grid-cols-6"
      footerClassName="items-end justify-end lg:col-span-1"
      idleText="Enable Gathering"
      pendingText="Saving..."
    >
      <Field label="Location" className="lg:col-span-2">
        <select name="roomId" required className={inputClass} defaultValue="">
          <option value="" disabled>Choose Location</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>{room.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Panel name" className="lg:col-span-2">
        <input name="name" required defaultValue="Gathering" className={inputClass} />
      </Field>

      <Field label="Nothing chance %">
        <input name="nothingChance" type="number" min="0" max="10" step="0.01" required defaultValue="8" className={inputClass} />
      </Field>

      <label className="flex items-end gap-2 pb-2">
        <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]" />
        <span className={labelClass}>Active</span>
      </label>

      <Field label="Description" className="lg:col-span-5">
        <textarea name="description" rows={2} className={`${inputClass} resize-y`} />
      </Field>
    </ActionForm>
  );
}

export function GatheringLocationCard({
  location,
  items,
}: {
  location: GatheringAdminLocation;
  items: GatheringAdminItem[];
}) {
  const rewards = [...location.rewards].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const totalWeight = rewards.filter((reward) => reward.active).reduce((sum, reward) => sum + reward.weight, 0);

  return (
    <details
      id={`admin-gathering-${location.id}`}
      data-admin-gathering-card="true"
      data-admin-gathering-id={location.id}
      data-admin-gathering-name={location.name}
      data-admin-gathering-room={location.roomLabel}
      data-admin-gathering-description={location.description}
      data-admin-gathering-active={location.active ? "true" : "false"}
      data-sep-interaction-fixed="true"
      className="scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120d0a))]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="truncate text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            {location.roomLabel}
          </p>
          <h3 className="mt-1 truncate font-serif text-xl text-[rgb(var(--sep-colour-dbc396))]">
            {location.name}
          </h3>
          <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-756958))]">
            Active reward weight: {totalWeight.toFixed(4)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className={`border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${location.active ? "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-9dc294))]" : "border-[rgb(var(--sep-colour-6a5046))]/55 text-[rgb(var(--sep-colour-9a8178))]"}`}>
            {location.active ? "Active" : "Inactive"}
          </span>
          <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a88d65))]">
            Expand ▾
          </span>
        </div>
      </summary>

      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/30 p-4">
        <ActionForm
          action={updateGatheringLocation}
          className="grid gap-3 lg:grid-cols-6"
          footerClassName="justify-end lg:col-span-6"
          idleText="Save Location"
          pendingText="Saving..."
        >
          <input type="hidden" name="locationId" value={location.id} />
          <Field label="Panel name" className="lg:col-span-2">
            <input name="name" required defaultValue={location.name} className={inputClass} />
          </Field>
          <Field label="Description" className="lg:col-span-3">
            <input name="description" defaultValue={location.description} className={inputClass} />
          </Field>
          <Field label="Nothing chance %">
            <input name="nothingChance" type="number" min="0" max="10" step="0.01" required defaultValue={String(location.nothingChance)} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 lg:col-span-2">
            <input name="isActive" type="checkbox" defaultChecked={location.active} className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]" />
            <span className={labelClass}>Gathering active</span>
          </label>
        </ActionForm>

        <div className="mt-5 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">Reward Pool</p>
          <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
            Weights are relative. Recipe and Pattern Items are ordinary Item rewards and may be found more than once.
          </p>

          <div className="mt-3 space-y-2">
            {rewards.map((reward) => (
              <RewardEditor key={reward.id} reward={reward} items={items} />
            ))}
          </div>

          <AddRewardForm
            locationId={location.id}
            items={items}
            suggestedSortOrder={rewards.length ? Math.max(...rewards.map((reward) => reward.sortOrder)) + 10 : 10}
          />
        </div>
      </div>
    </details>
  );
}

function RewardEditor({ reward, items }: { reward: GatheringAdminReward; items: GatheringAdminItem[] }) {
  return (
    <div data-sep-interaction-fixed="true" className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <ActionForm
        action={updateGatheringReward}
        className="grid gap-3 xl:grid-cols-12 xl:items-end"
        footerClassName="justify-end xl:col-span-12"
        idleText="Save Reward"
        pendingText="Saving..."
      >
        <input type="hidden" name="rewardId" value={reward.id} />
        <Field label="Type" className="xl:col-span-2">
          <select name="rewardType" defaultValue={reward.rewardType} className={inputClass}>
            <option value="item">Item</option>
            <option value="remnants">Remnants</option>
          </select>
        </Field>
        <Field label="Item" className="xl:col-span-3">
          <select name="itemId" defaultValue={reward.itemId ?? ""} className={inputClass}>
            <option value="">Not an Item reward</option>
            {reward.itemId && !items.some((item) => item.id === reward.itemId) ? (
              <option value={reward.itemId}>{reward.itemName ?? "Current Item"}</option>
            ) : null}
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.teachesRecipe ? " · Recipe Item" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Item min"><input name="quantityMin" type="number" min="1" max="9999" defaultValue={reward.quantityMin ?? 1} className={inputClass} /></Field>
        <Field label="Item max"><input name="quantityMax" type="number" min="1" max="9999" defaultValue={reward.quantityMax ?? 1} className={inputClass} /></Field>
        <Field label="Remnants min"><input name="remnantsMin" type="number" min="1" defaultValue={reward.remnantsMin ?? 1} className={inputClass} /></Field>
        <Field label="Remnants max"><input name="remnantsMax" type="number" min="1" defaultValue={reward.remnantsMax ?? 1} className={inputClass} /></Field>
        <Field label="Weight"><input name="weight" type="number" min="0.0001" step="0.0001" required defaultValue={String(reward.weight)} className={inputClass} /></Field>
        <Field label="Order"><input name="sortOrder" type="number" min="0" required defaultValue={reward.sortOrder} className={inputClass} /></Field>
        <label className="flex items-center gap-2 pb-2">
          <input name="isActive" type="checkbox" defaultChecked={reward.active} className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]" />
          <span className={labelClass}>Active</span>
        </label>
      </ActionForm>

      <ActionForm
        action={deleteGatheringReward}
        className="mt-2"
        footerClassName="justify-end"
        idleText="Delete Reward"
        pendingText="Deleting..."
        buttonClassName={dangerButtonClass}
      >
        <input type="hidden" name="rewardId" value={reward.id} />
      </ActionForm>
    </div>
  );
}

function AddRewardForm({
  locationId,
  items,
  suggestedSortOrder,
}: {
  locationId: string;
  items: GatheringAdminItem[];
  suggestedSortOrder: number;
}) {
  return (
    <ActionForm
      action={addGatheringReward}
      className="mt-3 grid gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3 xl:grid-cols-12 xl:items-end"
      footerClassName="justify-end xl:col-span-12"
      idleText="Add Reward"
      pendingText="Saving..."
    >
      <input type="hidden" name="locationId" value={locationId} />
      <Field label="New reward type" className="xl:col-span-2">
        <select name="rewardType" defaultValue="item" className={inputClass}>
          <option value="item">Item</option>
          <option value="remnants">Remnants</option>
        </select>
      </Field>
      <Field label="Item" className="xl:col-span-3">
        <select name="itemId" defaultValue={items[0]?.id ?? ""} className={inputClass}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}{item.teachesRecipe ? " · Recipe Item" : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Item min"><input name="quantityMin" type="number" min="1" max="9999" defaultValue="1" className={inputClass} /></Field>
      <Field label="Item max"><input name="quantityMax" type="number" min="1" max="9999" defaultValue="1" className={inputClass} /></Field>
      <Field label="Remnants min"><input name="remnantsMin" type="number" min="1" defaultValue="1" className={inputClass} /></Field>
      <Field label="Remnants max"><input name="remnantsMax" type="number" min="1" defaultValue="1" className={inputClass} /></Field>
      <Field label="Weight"><input name="weight" type="number" min="0.0001" step="0.0001" required defaultValue="1" className={inputClass} /></Field>
      <Field label="Order"><input name="sortOrder" type="number" min="0" required defaultValue={suggestedSortOrder} className={inputClass} /></Field>
      <label className="flex items-center gap-2 pb-2">
        <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]" />
        <span className={labelClass}>Active</span>
      </label>
    </ActionForm>
  );
}
