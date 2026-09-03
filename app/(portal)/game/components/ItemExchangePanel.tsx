"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatRemnants,
} from "@/lib/economy/currency";
import type { PresentRoomCharacter } from "@/types/game";

type InventoryRecord = {
  record_kind: "standard" | "unique";
  record_id: string;
  item_id: string;
  name: string;
  quantity: number;
  reference_value: number | null;
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
  character_one_remnants: number;
  character_two_remnants: number;
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
  "w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))]";
const button =
  "border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-40";

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
  const [remnantTarget, setRemnantTarget] = useState("");
  const [remnantAmount, setRemnantAmount] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tradeTarget, setTradeTarget] = useState("");
  const [offerChoice, setOfferChoice] = useState("");
  const [offerQuantity, setOfferQuantity] = useState(1);
  const [tradeRemnantAmount, setTradeRemnantAmount] = useState(0);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);
  const activeTradeIdRef = useRef<string | null>(null);
  const remnantInputTradeIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data: id, error: idError } = await supabase.rpc("my_character_id");
    if (idError || !id) {
      setOk(false);
      setMessage(idError?.message ?? "Unable to identify your character.");
      return;
    }

    const characterId = String(id);
    setMyId(characterId);

    const [meResult, invResult, tradeResult, walletResult] = await Promise.all([
      supabase.from("characters").select("display_name").eq("id", characterId).maybeSingle(),
      supabase.rpc("get_public_character_inventory", { p_character_id: characterId }),
      supabase
        .from("item_trades")
        .select("id,character_one_id,character_two_id,character_one_confirmed,character_two_confirmed,character_one_remnants,character_two_remnants,status")
        .eq("status", "open")
        .or(`character_one_id.eq.${characterId},character_two_id.eq.${characterId}`)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("character_wallets")
        .select("balance")
        .eq("character_id", characterId)
        .maybeSingle(),
    ]);

    if (meResult.data?.display_name) setMyName(meResult.data.display_name);
    setWalletBalance(Number(walletResult.data?.balance ?? 0));

    const rawOwnRows =
      (invResult.data ?? []) as Omit<
        InventoryRecord,
        "reference_value"
      >[];

    const ownItemIds = [
      ...new Set(
        rawOwnRows.map(
          (row) => row.item_id,
        ),
      ),
    ];

    const {
      data: ownValueRows,
      error: ownValueError,
    } = ownItemIds.length
      ? await supabase
          .from("items")
          .select(
            "id, reference_value",
          )
          .in("id", ownItemIds)
      : {
          data: [],
          error: null,
        };

    if (ownValueError) {
      throw new Error(
        ownValueError.message,
      );
    }

    const ownValues =
      new Map(
        (ownValueRows ?? []).map(
          (row) => [
            row.id,
            row.reference_value === null
              ? null
              : Number(
                  row.reference_value,
                ),
          ],
        ),
      );

    const ownRows =
      rawOwnRows
        .filter(
          (row) =>
            !row.parent_container_id &&
            !row.is_equipped &&
            row.transfer_policy ===
              "free" &&
            !row.is_quest_item,
        )
        .map((row) => ({
          ...row,
          reference_value:
            ownValues.get(
              row.item_id,
            ) ?? null,
        }));

    setInventory(ownRows);

    const currentTrade = (tradeResult.data?.[0] ?? null) as Trade | null;
    const previousTradeId = activeTradeIdRef.current;

    setTrade(currentTrade);

    if (currentTrade) {
      // Initialise from DB only when entering a different trade.
      // Realtime/polling refreshes must not overwrite what is being typed.
      if (remnantInputTradeIdRef.current !== currentTrade.id) {
        setTradeRemnantAmount(
          Number(
            currentTrade.character_one_id === characterId
              ? currentTrade.character_one_remnants
              : currentTrade.character_two_remnants,
          ) || 0,
        );
        remnantInputTradeIdRef.current = currentTrade.id;
      }
    } else {
      setTradeRemnantAmount(0);
      remnantInputTradeIdRef.current = null;
    }

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

    const rawPartnerRows =
      (partnerInvResult.data ?? []) as Omit<
        InventoryRecord,
        "reference_value"
      >[];

    const partnerItemIds = [
      ...new Set(
        rawPartnerRows.map(
          (row) => row.item_id,
        ),
      ),
    ];

    const {
      data: partnerValueRows,
      error: partnerValueError,
    } = partnerItemIds.length
      ? await supabase
          .from("items")
          .select(
            "id, reference_value",
          )
          .in(
            "id",
            partnerItemIds,
          )
      : {
          data: [],
          error: null,
        };

    if (partnerValueError) {
      throw new Error(
        partnerValueError.message,
      );
    }

    const partnerValues =
      new Map(
        (
          partnerValueRows ?? []
        ).map((row) => [
          row.id,
          row.reference_value ===
          null
            ? null
            : Number(
                row.reference_value,
              ),
        ]),
      );

    setPartnerName(
      partnerResult.data
        ?.display_name ??
        "Other Character",
    );
    setOffers(
      (offersResult.data ??
        []) as Offer[],
    );
    setPartnerInventory(
      rawPartnerRows.map(
        (row) => ({
          ...row,
          reference_value:
            partnerValues.get(
              row.item_id,
            ) ?? null,
        }),
      ),
    );
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

  const inventoryRecords =
    useMemo(() => {
      const map =
        new Map<
          string,
          InventoryRecord
        >();

      for (const row of [
        ...inventory,
        ...partnerInventory,
      ]) {
        map.set(
          `${row.record_kind}:${row.record_id}`,
          row,
        );
      }

      return map;
    }, [
      inventory,
      partnerInventory,
    ]);

  const offerReferenceTotal = (
    list: Offer[],
  ) =>
    list.reduce(
      (total, offer) => {
        const row =
          inventoryRecords.get(
            `${offer.record_kind}:${offer.record_id}`,
          );

        return (
          total +
          Number(
            row?.reference_value ??
              0,
          ) *
            offer.quantity
        );
      },
      0,
    );

  const mine = offers.filter((offer) => offer.character_id === myId);
  const theirs = offers.filter((offer) => offer.character_id !== myId);

  const mineRemnants =
    trade && myId
      ? Number(trade.character_one_id === myId ? trade.character_one_remnants : trade.character_two_remnants) || 0
      : 0;

  const theirsRemnants =
    trade && myId
      ? Number(trade.character_one_id === myId ? trade.character_two_remnants : trade.character_one_remnants) || 0
      : 0;

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
      const { error } = await supabase.rpc(
        "give_own_inventory_record_normalized",
        {
          k: kind,
          r: id,
          target: giveTarget,
          q: giveQuantity,
        },
      );
      if (error) throw new Error(error.message);

      setOk(true);
      setMessage("Item given successfully.");
      setGiveChoice("");
      setGiveQuantity(1);
    });
  }

  async function giveRemnants() {
    if (!remnantTarget) {
      setOk(false);
      setMessage("Choose a character.");
      return;
    }

    if (!Number.isSafeInteger(remnantAmount) || remnantAmount < 1) {
      setOk(false);
      setMessage("Enter a positive whole Remnant amount.");
      return;
    }

    if (remnantAmount > walletBalance) {
      setOk(false);
      setMessage("You do not have enough Remnants.");
      return;
    }

    await mutate(async () => {
      const { error } = await supabase.rpc(
        "give_remnants_same_location",
        {
          p_target_character_id: remnantTarget,
          p_amount: remnantAmount,
        },
      );

      if (error) throw new Error(error.message);

      setOk(true);
      setMessage("Remnants given successfully.");
      setRemnantTarget("");
      setRemnantAmount(1);
    });
  }

  async function startExchange() {
    if (!tradeTarget) return;

    await mutate(async () => {
      const response =
        await fetch(
          "/api/item-exchange/start",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              other: tradeTarget,
            }),
          },
        );

      const payload =
        (await response.json().catch(
          () => null,
        )) as
          | {
              tradeId?: string;
              error?: string;
            }
          | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Unable to open Item Exchange.",
        );
      }

      setOk(true);
      setMessage(
        "Item Exchange opened. The other character has been notified.",
      );
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

  async function setRemnantsOffer() {
    if (!trade) return;

    if (!Number.isSafeInteger(tradeRemnantAmount) || tradeRemnantAmount < 0) {
      setOk(false);
      setMessage("Enter a whole Remnant amount of 0 or more.");
      return;
    }

    if (tradeRemnantAmount > walletBalance) {
      setOk(false);
      setMessage("You do not have enough Remnants for that offer.");
      return;
    }

    await mutate(async () => {
      const { error } = await supabase.rpc("set_item_trade_remnants", {
        tid: trade.id,
        p_amount: tradeRemnantAmount,
      });
      if (error) throw new Error(error.message);
      setOk(true);
      setMessage("Remnants offer updated. Both confirmations reset.");
    });
  }

  async function confirmExchange() {
    if (!trade) return;
    await mutate(async () => {
      const { data, error } = await supabase.rpc("confirm_item_trade_with_remnants", {
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
    remnants: number,
    confirmed: boolean,
    own: boolean,
  ) => (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-0f0b08))] p-3">
      <div className="flex justify-between gap-2">
        <p className="font-serif text-base text-[rgb(var(--sep-colour-d7bf94))]">{title}</p>
        <span className={confirmed ? "text-[7px] uppercase text-emerald-400" : "text-[7px] uppercase text-[rgb(var(--sep-colour-756958))]"}>
          {confirmed ? "Confirmed" : "Not confirmed"}
        </span>
      </div>
      <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {list.length ? list.map((offer) => (
          <div key={offer.id} className="flex items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/25 px-3 py-2">
            <span className="text-[10px] text-[rgb(var(--sep-colour-cdb894))]">
              {inventoryRecords.get(
                `${offer.record_kind}:${offer.record_id}`,
              )?.name ?? "Item"}
              {offer.quantity > 1
                ? ` ×${offer.quantity}`
                : ""}
              {(() => {
                const value =
                  inventoryRecords.get(
                    `${offer.record_kind}:${offer.record_id}`,
                  )?.reference_value;

                return value ===
                  null ||
                  value ===
                    undefined
                  ? ""
                  : ` · ${formatRemnants(
                      value,
                    )} each`;
              })()}
            </span>
            {own ? (
              <button type="button" disabled={pending} onClick={() => void removeOffer(offer.id)} className="text-[7px] uppercase text-red-400">
                Remove
              </button>
            ) : null}
          </div>
        )) : (
          <p className="text-[9px] italic text-[rgb(var(--sep-colour-756958))]">No Items offered yet.</p>
        )}
      </div>
      <div className="mt-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
            Items · Reference Value
          </span>
          <strong className="font-serif text-sm text-[rgb(var(--sep-colour-d1b17d))]">
            {formatRemnants(
              offerReferenceTotal(
                list,
              ),
            )}
          </strong>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
            Remnants offered
          </span>
          <strong className="font-serif text-sm text-[rgb(var(--sep-colour-e4c589))]">
            {formatRemnants(
              remnants,
            )}
          </strong>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2">
          <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a18b6c))]">
            Total offered value
          </span>
          <strong className="font-serif text-base text-[rgb(var(--sep-colour-efd09a))]">
            {formatRemnants(
              offerReferenceTotal(
                list,
              ) + remnants,
            )}
          </strong>
        </div>
      </div>
    </div>
  );

  return (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 pb-3">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Location Utility</p>
          <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">Item Exchange</h3>
          
        </div>
        <button type="button" onClick={onClose} className={button}>Back to Chat</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {!trade ? (
          <>
        <section className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3">
          <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">Give Item as a Gift</p>
          <div className="mt-2 grid gap-1">
            <select className={field} value={giveChoice} onChange={(e) => setGiveChoice(e.target.value)}>
              <option value="">Choose Item...</option>
              {inventory.map((row) => (
                <option key={encoded(row)} value={encoded(row)}>
                  {row.name}
                  {row.quantity > 1
                    ? ` ×${row.quantity}`
                    : ""}
                  {row.reference_value !==
                  null
                    ? ` · Ref ${formatRemnants(
                        row.reference_value,
                      )}`
                    : ""}
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

            {giveChoice ? (() => {
              const { kind, id } =
                decode(giveChoice);
              const selected =
                inventoryRecords.get(
                  `${kind}:${id}`,
                );
              const value =
                selected?.reference_value;

              return value ===
                null ||
                value === undefined
                ? null
                : (
                  <p className="border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b8768))]">
                    Reference Value being given:{" "}
                    <strong className="text-[rgb(var(--sep-colour-e1bd79))]">
                      {formatRemnants(
                        value *
                          giveQuantity,
                      )}
                    </strong>
                  </p>
                );
            })() : null}
          </div>
        </section>

        <section className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">Give Remnants</p>
              <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-756958))]">
                Give Remnants to another character currently in this location.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">Wallet</p>
              <p className="font-serif text-sm text-[rgb(var(--sep-colour-e4c589))]">
                {walletBalance.toLocaleString("en-GB")} R
              </p>
            </div>
          </div>

          <div className="mt-2 grid gap-1">
            <select
              className={field}
              value={remnantTarget}
              onChange={(e) => setRemnantTarget(e.target.value)}
            >
              <option value="">Give to...</option>
              {presentCharacters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.display_name}
                </option>
              ))}
            </select>

            <input
              className={field}
              type="number"
              min={1}
              step={1}
              max={Math.max(1, walletBalance)}
              value={remnantAmount}
              onChange={(e) =>
                setRemnantAmount(
                  Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1),
                )
              }
            />

            <button
              type="button"
              className={button}
              disabled={
                pending ||
                !remnantTarget ||
                remnantAmount < 1 ||
                remnantAmount > walletBalance
              }
              onClick={() => void giveRemnants()}
            >
              Give Remnants
            </button>
          </div>
        </section>
          </>
        ) : null}

        <section className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3 lg:col-span-2">
          <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">Exchange Items</p>
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
            <p className="mt-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-9b8768))]">
              Live exchange with <strong className="text-[rgb(var(--sep-colour-d7bf94))]">{partnerName}</strong>. Changes update automatically.
            </p>
          )}
        </section>
      </div>

      {trade ? (
        <section className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            {offerBox(`${myName}'s Offer`, mine, mineRemnants, mineConfirmed, true)}
            {offerBox(`${partnerName}'s Offer`, theirs, theirsRemnants, theirsConfirmed, false)}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_100px_auto]">
            <select className={field} value={offerChoice} onChange={(e) => setOfferChoice(e.target.value)}>
              <option value="">Add one of your Items...</option>
              {inventory.map((row) => (
                <option key={encoded(row)} value={encoded(row)}>
                  {row.name}
                  {row.quantity > 1
                    ? ` ×${row.quantity}`
                    : ""}
                  {row.reference_value !==
                  null
                    ? ` · Ref ${formatRemnants(
                        row.reference_value,
                      )}`
                    : ""}
                </option>
              ))}
            </select>
            <input className={field} type="number" min={1} value={offerQuantity} onChange={(e) => setOfferQuantity(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))} />
            <button type="button" className={button} disabled={pending || !offerChoice} onClick={() => void addOffer()}>Add to Offer</button>
          </div>

          <div className="mt-3 grid gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label className="mb-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                Your Remnants offer · Wallet {walletBalance.toLocaleString("en-GB")} R
              </label>
              <input
                className={field}
                type="number"
                min={0}
                step={1}
                max={Math.max(0, walletBalance)}
                value={tradeRemnantAmount}
                onChange={(e) =>
                  setTradeRemnantAmount(
                    Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0),
                  )
                }
              />
            </div>
            <button
              type="button"
              className={`${button} self-end`}
              disabled={
                pending ||
                tradeRemnantAmount < 0 ||
                tradeRemnantAmount > walletBalance ||
                tradeRemnantAmount === mineRemnants
              }
              onClick={() => void setRemnantsOffer()}
            >
              Update Remnants Offer
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8271))]">
              You: <strong className={mineConfirmed ? "text-emerald-400" : "text-[rgb(var(--sep-colour-b9a386))]"}>{mineConfirmed ? "Confirmed" : "Waiting"}</strong>
              {" · "}{partnerName}: <strong className={theirsConfirmed ? "text-emerald-400" : "text-[rgb(var(--sep-colour-b9a386))]"}>{theirsConfirmed ? "Confirmed" : "Waiting"}</strong>
            </p>
            <div className="flex gap-2">
              <button type="button" className={`${button} border-red-900/55 text-red-300`} disabled={pending} onClick={() => void cancelExchange()}>Cancel</button>
              <button type="button" className={`${button} border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] text-[rgb(var(--sep-colour-efd4a0))]`} disabled={pending || mineConfirmed} onClick={() => void confirmExchange()}>
                {mineConfirmed ? "Confirmed" : "Confirm Exchange"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {message ? (
        <p className={ok ? "mt-3 text-xs text-emerald-400" : "mt-3 text-xs text-red-400"}>{message}</p>
      ) : null}

      <p className="mt-3 text-[8px] leading-4 text-[rgb(var(--sep-colour-756958))]">
        Only loose, unequipped, freely transferable, non-Quest Items can be given or exchanged. Item and Remnants offers are completed together. Changing either Items or Remnants resets both confirmations.
      </p>
    </div>
  );
}
