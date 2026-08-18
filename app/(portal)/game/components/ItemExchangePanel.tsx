"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresentRoomCharacter } from "@/types/game";

type InventoryRecord = {
  record_kind: "standard" | "unique";
  record_id: string;
  name: string;
  quantity: number;
  parent_container_id: string | null;
  is_equipped: boolean;
  transfer_policy: string;
  is_quest_item: boolean;
};

type Trade = {
  id: string;
  character_one_id: string;
  character_two_id: string;
  character_one_confirmed: boolean;
  character_two_confirmed: boolean;
  status: string;
};

type Offer = {
  id: string;
  character_id: string;
  record_kind: "standard" | "unique";
  record_id: string;
  quantity: number;
};

const field =
  "w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] text-[#d8c29b] outline-none focus:border-[#a17a45]";
const button =
  "border border-[#765937] bg-[#21190f] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[#d6bb8d] transition hover:border-[#a17a49] disabled:cursor-not-allowed disabled:opacity-40";

function encoded(row: InventoryRecord) {
  return `${row.record_kind}|${row.record_id}`;
}

function decode(value: string) {
  const [kind, id] = value.split("|");
  return { kind, id };
}

export function ItemExchangePanel({
  presentCharacters,
  onClose,
}: {
  presentCharacters: PresentRoomCharacter[];
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("You");
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [partnerName, setPartnerName] = useState("Other Character");
  const [partnerInventory, setPartnerInventory] = useState<InventoryRecord[]>([]);
  const [giveChoice, setGiveChoice] = useState("");
  const [giveTarget, setGiveTarget] = useState("");
  const [giveQuantity, setGiveQuantity] = useState(1);
  const [tradeTarget, setTradeTarget] = useState("");
  const [offerChoice, setOfferChoice] = useState("");
  const [offerQuantity, setOfferQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);
  const activeTradeIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data: id, error: idError } = await supabase.rpc("my_character_id");
    if (idError || !id) {
      setOk(false);
      setMessage(idError?.message ?? "Unable to identify your character.");
      return;
    }

    const characterId = String(id);
    setMyId(characterId);

    const [meResult, invResult, tradeResult] = await Promise.all([
      supabase.from("characters").select("display_name").eq("id", characterId).maybeSingle(),
      supabase.rpc("get_public_character_inventory", { p_character_id: characterId }),
      supabase
        .from("item_trades")
        .select("id,character_one_id,character_two_id,character_one_confirmed,character_two_confirmed,status")
        .eq("status", "open")
        .or(`character_one_id.eq.${characterId},character_two_id.eq.${characterId}`)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (meResult.data?.display_name) setMyName(meResult.data.display_name);

    const ownRows = ((invResult.data ?? []) as InventoryRecord[]).filter(
      (row) =>
        !row.parent_container_id &&
        !row.is_equipped &&
        row.transfer_policy === "free" &&
        !row.is_quest_item,
    );
    setInventory(ownRows);

    const currentTrade = (tradeResult.data?.[0] ?? null) as Trade | null;
    const previousTradeId = activeTradeIdRef.current;

    setTrade(currentTrade);

    if (!currentTrade) {
      setOffers([]);
      setPartnerInventory([]);
      setPartnerName("Other Character");

      if (previousTradeId) {
        const { data: finishedTrade } = await supabase
          .from("item_trades")
          .select("status")
          .eq("id", previousTradeId)
          .maybeSingle();

        if (finishedTrade?.status === "completed") {
          setOk(true);
          setMessage("Exchange completed successfully.");
        } else if (finishedTrade?.status === "cancelled") {
          setOk(true);
          setMessage("Exchange cancelled.");
        }

        activeTradeIdRef.current = null;
      }

      return;
    }

    activeTradeIdRef.current = currentTrade.id;

    const partnerId =
      currentTrade.character_one_id === characterId
        ? currentTrade.character_two_id
        : currentTrade.character_one_id;

    const [partnerResult, offersResult, partnerInvResult] = await Promise.all([
      supabase.from("characters").select("display_name").eq("id", partnerId).maybeSingle(),
      supabase
        .from("item_trade_offers")
        .select("id,character_id,record_kind,record_id,quantity")
        .eq("trade_id", currentTrade.id)
        .order("created_at"),
      supabase.rpc("get_public_character_inventory", { p_character_id: partnerId }),
    ]);

    setPartnerName(partnerResult.data?.display_name ?? "Other Character");
    setOffers((offersResult.data ?? []) as Offer[]);
    setPartnerInventory((partnerInvResult.data ?? []) as InventoryRecord[]);
  }, [supabase]);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel(`item-exchange-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "item_trades" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_trade_offers" }, () => void load())
      .subscribe();

    const fallback = window.setInterval(() => void load(), 2500);

    return () => {
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [load, supabase]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of [...inventory, ...partnerInventory]) {
      map.set(`${row.record_kind}:${row.record_id}`, row.name);
    }
    return map;
  }, [inventory, partnerInventory]);

  const mine = offers.filter((offer) => offer.character_id === myId);
  const theirs = offers.filter((offer) => offer.character_id !== myId);

  const mineConfirmed =
    trade && myId
      ? trade.character_one_id === myId
        ? trade.character_one_confirmed
        : trade.character_two_confirmed
      : false;

  const theirsConfirmed =
    trade && myId
      ? trade.character_one_id === myId
        ? trade.character_two_confirmed
        : trade.character_one_confirmed
      : false;

  async function mutate(task: () => Promise<void>) {
    setPending(true);
    setMessage("");
    try {
      await task();
      await load();
    } catch (error) {
      setOk(false);
      setMessage(error instanceof Error ? error.message : "Unable to complete Item action.");
    } finally {
      setPending(false);
    }
  }

  async function give() {
    const { kind, id } = decode(giveChoice);
    if (!kind || !id || !giveTarget) {
      setOk(false);
      setMessage("Choose an Item and a character.");
      return;
    }

    await mutate(async () => {
      const { error } = await supabase.rpc("give_own_inventory_record", {
        k: kind,
        r: id,
        target: giveTarget,
        q: giveQuantity,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage("Item given successfully.");
      setGiveChoice("");
      setGiveQuantity(1);
    });
  }

  async function startExchange() {
    if (!tradeTarget) return;

    await mutate(async () => {
      const { error } = await supabase.rpc("create_item_trade", {
        other: tradeTarget,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage("Item Exchange opened.");
      setTradeTarget("");
    });
  }

  async function addOffer() {
    if (!trade) return;
    const { kind, id } = decode(offerChoice);

    await mutate(async () => {
      const { error } = await supabase.rpc("add_item_trade_offer", {
        tid: trade.id,
        k: kind,
        r: id,
        q: offerQuantity,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage("Offer updated. Both confirmations reset.");
      setOfferChoice("");
      setOfferQuantity(1);
    });
  }

  async function removeOffer(offerId: string) {
    if (!trade) return;
    await mutate(async () => {
      const { error } = await supabase.rpc("remove_item_trade_offer", {
        tid: trade.id,
        oid: offerId,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage("Item removed. Both confirmations reset.");
    });
  }

  async function confirmExchange() {
    if (!trade) return;
    await mutate(async () => {
      const { data, error } = await supabase.rpc("confirm_item_trade", {
        tid: trade.id,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage(
        Boolean(data)
          ? "Exchange completed successfully."
          : "Your side is confirmed. Waiting for the other character.",
      );
    });
  }

  async function cancelExchange() {
    if (!trade) return;
    await mutate(async () => {
      const { error } = await supabase.rpc("cancel_item_trade", {
        tid: trade.id,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage("Exchange cancelled.");
    });
  }

  const offerBox = (
    title: string,
    list: Offer[],
    confirmed: boolean,
    own: boolean,
  ) => (
    <div className="border border-[#59432c]/35 bg-[#0f0b08] p-3">
      <div className="flex justify-between gap-2">
        <p className="font-serif text-base text-[#d7bf94]">{title}</p>
        <span className={confirmed ? "text-[7px] uppercase text-emerald-400" : "text-[7px] uppercase text-[#756958]"}>
          {confirmed ? "Confirmed" : "Not confirmed"}
        </span>
      </div>
      <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {list.length ? list.map((offer) => (
          <div key={offer.id} className="flex items-center justify-between gap-2 border border-[#59432c]/25 px-3 py-2">
            <span className="text-[10px] text-[#cdb894]">
              {names.get(`${offer.record_kind}:${offer.record_id}`) ?? "Item"}
              {offer.quantity > 1 ? ` ×${offer.quantity}` : ""}
            </span>
            {own ? (
              <button type="button" disabled={pending} onClick={() => void removeOffer(offer.id)} className="text-[7px] uppercase text-red-400">
                Remove
              </button>
            ) : null}
          </div>
        )) : (
          <p className="text-[9px] italic text-[#756958]">No Items offered yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="border border-[#59432c]/35 bg-[#100c09] p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#59432c]/30 pb-3">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">Location Utility</p>
          <h3 className="mt-1 font-serif text-lg text-[#dec89f]">Item Exchange</h3>
          
        </div>
        <button type="button" onClick={onClose} className={button}>Back to Chat</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="border border-[#59432c]/30 bg-[#15100d] p-3">
          <p className="font-serif text-base text-[#dec89f]">Give Item as a Gift</p>
          <div className="mt-2 grid gap-1">
            <select className={field} value={giveChoice} onChange={(e) => setGiveChoice(e.target.value)}>
              <option value="">Choose Item...</option>
              {inventory.map((row) => (
                <option key={encoded(row)} value={encoded(row)}>
                  {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ""}
                </option>
              ))}
            </select>
            <select className={field} value={giveTarget} onChange={(e) => setGiveTarget(e.target.value)}>
              <option value="">Give to...</option>
              {presentCharacters.map((character) => (
                <option key={character.id} value={character.id}>{character.display_name}</option>
              ))}
            </select>
            <input className={field} type="number" min={1} value={giveQuantity} onChange={(e) => setGiveQuantity(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))} />
            <button type="button" className={button} disabled={pending || !giveChoice || !giveTarget} onClick={() => void give()}>Give Item</button>
          </div>
        </section>

        <section className="border border-[#59432c]/30 bg-[#15100d] p-3">
          <p className="font-serif text-base text-[#dec89f]">Exchange Items</p>
          {!trade ? (
            <div className="mt-3 grid gap-2">
              <select className={field} value={tradeTarget} onChange={(e) => setTradeTarget(e.target.value)}>
                <option value="">Exchange with...</option>
                {presentCharacters.map((character) => (
                  <option key={character.id} value={character.id}>{character.display_name}</option>
                ))}
              </select>
              <button type="button" className={button} disabled={pending || !tradeTarget} onClick={() => void startExchange()}>
                Start Exchange
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[9px] leading-5 text-[#9b8768]">
              Live exchange with <strong className="text-[#d7bf94]">{partnerName}</strong>. Changes update automatically.
            </p>
          )}
        </section>
      </div>

      {trade ? (
        <section className="mt-3 border border-[#59432c]/30 bg-[#15100d] p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            {offerBox(`${myName}'s Offer`, mine, mineConfirmed, true)}
            {offerBox(`${partnerName}'s Offer`, theirs, theirsConfirmed, false)}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_100px_auto]">
            <select className={field} value={offerChoice} onChange={(e) => setOfferChoice(e.target.value)}>
              <option value="">Add one of your Items...</option>
              {inventory.map((row) => (
                <option key={encoded(row)} value={encoded(row)}>
                  {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ""}
                </option>
              ))}
            </select>
            <input className={field} type="number" min={1} value={offerQuantity} onChange={(e) => setOfferQuantity(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))} />
            <button type="button" className={button} disabled={pending || !offerChoice} onClick={() => void addOffer()}>Add to Offer</button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#59432c]/30 pt-3">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[#8f8271]">
              You: <strong className={mineConfirmed ? "text-emerald-400" : "text-[#b9a386]"}>{mineConfirmed ? "Confirmed" : "Waiting"}</strong>
              {" · "}{partnerName}: <strong className={theirsConfirmed ? "text-emerald-400" : "text-[#b9a386]"}>{theirsConfirmed ? "Confirmed" : "Waiting"}</strong>
            </p>
            <div className="flex gap-2">
              <button type="button" className={`${button} border-red-900/55 text-red-300`} disabled={pending} onClick={() => void cancelExchange()}>Cancel</button>
              <button type="button" className={`${button} border-[#85653c] bg-[#342617] text-[#efd4a0]`} disabled={pending || mineConfirmed} onClick={() => void confirmExchange()}>
                {mineConfirmed ? "Confirmed" : "Confirm Exchange"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {message ? (
        <p className={ok ? "mt-3 text-xs text-emerald-400" : "mt-3 text-xs text-red-400"}>{message}</p>
      ) : null}

      <p className="mt-3 text-[8px] leading-4 text-[#756958]">
        Only loose, unequipped, freely transferable, non-Quest Items can be given or exchanged. Changing either offer resets both confirmations.
      </p>
    </div>
  );
}
