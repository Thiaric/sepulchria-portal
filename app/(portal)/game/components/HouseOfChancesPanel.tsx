"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ItemImageFrame,
} from "@/components/items/item-image-frame";
import {
  playHouseOfChances,
  type HouseOfChancesPlayResult,
} from "../house-of-chances-actions";
import { formatRemnants } from "@/lib/economy/currency";
import { usePortalSkin } from "@/components/portal/portal-skin-provider";

export type HouseOfChancesStateRow = {
  is_open: boolean;
  play_cost: number;
  daily_play_limit: number;
  plays_used: number;
  plays_remaining: number;
  wallet_balance: number;
  room_slug: string;
};

type ReelValues = [number | null, number | null, number | null];

const HOUSE_SKIN_ACCENTS: Record<string, string> = {
  sepulchria: "#b68b4f",
  vellum: "#6b2332",
  starfall: "#7fa9dc",
  "rose-nocturne": "#c67c69",
  "pioneers-land": "#d6ad5b",
  "verdant-reliquary": "#93c988",
  "amethyst-veil": "#c99a4c",
  moonlit: "#b58a4c",
  emberforge: "#d27b35",
  deepwater: "#efb67f",
  "blood-court": "#d88888",
  ashen: "#174b38",
  "ivory-archive": "#a9b7c2",
  "aelari-dawn": "#8d271c",
  "dwarven-deep": "#5b3823",
  "mortal-hearth": "#563627",
  "wolfs-moon": "#d9bd78",
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomD100() {
  return Math.floor(Math.random() * 100) + 1;
}

function rewardLabel(
  reward: HouseOfChancesPlayResult["reward_snapshot"][number],
) {
  if (reward.type === "remnants") {
    return `+${formatRemnants(Number(reward.amount))}`;
  }

  return `${reward.name} × ${reward.quantity}`;
}

export function HouseOfChancesPanel({
  state,
}: {
  state: HouseOfChancesStateRow;
}) {
  const router = useRouter();
  const { skin } = usePortalSkin();
  const skinAccent =
    HOUSE_SKIN_ACCENTS[skin] ?? HOUSE_SKIN_ACCENTS.sepulchria;

  const readableTokenColour =
    "rgb(var(--sep-colour-e6cfaa))";

  const [pending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<ReelValues>([null, null, null]);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<HouseOfChancesPlayResult | null>(null);
  const intervalRef = useRef<number | null>(null);

  const canAfford = Number(state.wallet_balance) >= Number(state.play_cost);
  const hasPlays = Number(state.plays_remaining) > 0;
  const canPlay =
    state.is_open && canAfford && hasPlays && !pending && !spinning;

  function stopSpinInterval() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function play() {
    if (!canPlay) return;

    setMessage(null);
    setResult(null);
    setSpinning(true);

    intervalRef.current = window.setInterval(() => {
      setReels([randomD100(), randomD100(), randomD100()]);
    }, 70);

    startTransition(async () => {
      const started = Date.now();
      const response = await playHouseOfChances();
      const elapsed = Date.now() - started;

      if (elapsed < 1200) {
        await sleep(1200 - elapsed);
      }

      stopSpinInterval();

      if (!response.ok || !response.result) {
        setSpinning(false);
        setMessage(response.message);
        setReels([null, null, null]);
        return;
      }

      const final = response.result;

      setReels([final.roll_1, randomD100(), randomD100()]);
      await sleep(260);
      setReels([final.roll_1, final.roll_2, randomD100()]);
      await sleep(260);
      setReels([final.roll_1, final.roll_2, final.roll_3]);

      setResult(final);
      setMessage(response.message);
      setSpinning(false);
      router.refresh();
    });
  }

  return (
    <details className="group shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] game_components_houseofchancespanel_details_details">
      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[linear-gradient(90deg,rgb(var(--sep-colour-100c09)),rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-100c09)))] px-3 py-2 [&::-webkit-details-marker]:hidden game_components_houseofchancespanel_summary_summary">
        <div className="flex min-w-0 items-center gap-3 game_components_houseofchancespanel_div_container">
          

          <div className="min-w-0 game_components_houseofchancespanel_div_container_2">
            <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] game_components_houseofchancespanel_p_text">
              House of Chances
            </p>
            <p className="mt-0.5 truncate font-serif text-sm text-[rgb(var(--sep-colour-dec89f))] game_components_houseofchancespanel_p_text_2">
              The Engine of Fortune
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 game_components_houseofchancespanel_div_container_3">
          <div className="hidden text-right sm:block game_components_houseofchancespanel_div_container_4">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] game_components_houseofchancespanel_p_text_3">
              Purse
            </p>
            <p
              className="font-serif text-base game_components_houseofchancespanel_p_text_4"
              style={{ color: readableTokenColour }}
            >
              {formatRemnants(Number(state.wallet_balance))}
            </p>
          </div>

          <div className="text-right game_components_houseofchancespanel_div_container_5">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] game_components_houseofchancespanel_p_text_5">
              Fortune
            </p>
            <div className="mt-1 flex max-w-[300px] flex-wrap justify-end gap-1 game_components_houseofchancespanel_div_container_6">
              {Array.from({ length: state.daily_play_limit }).map((_, index) => {
                const remaining = index < state.plays_remaining;

                return (
                  <svg
                    key={index}
                    viewBox="0 0 12 12"
                    aria-label={
                      remaining
                        ? "Chance available"
                        : "Chance spent"
                    }
                    role="img"
                    className="h-2.5 w-2.5 shrink-0"
                    style={{
                      color:
                        readableTokenColour,
                    }}
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      fill={
                        remaining
                          ? "currentColor"
                          : "none"
                      }
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                );
              })}
            </div>
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))] game_components_houseofchancespanel_span_text">
            <span className="group-open:hidden game_components_houseofchancespanel_span_text_2">Enter ▾</span>
            <span className="hidden group-open:inline game_components_houseofchancespanel_span_text_3">Close ▴</span>
          </span>
        </div>
      </summary>

      <div className="relative overflow-hidden border-t border-[rgb(var(--sep-colour-59432c))]/20 px-3 py-3 sm:px-5 game_components_houseofchancespanel_div_container_7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden game_components_houseofchancespanel_div_container_8"
        >
          <div
            className="motion-safe:animate-pulse absolute -left-[5%] top-[4%] h-64 w-64 rounded-full blur-3xl game_components_houseofchancespanel_div_container_9"
            style={{
              animationDuration: "13s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 18%, white 5%) 0%, color-mix(in srgb, ${skinAccent} 7%, transparent) 50%, transparent 74%)`,
              opacity: 0.42,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute -right-[6%] top-[16%] h-72 w-72 rounded-full blur-3xl game_components_houseofchancespanel_div_container_10"
            style={{
              animationDuration: "18s",
              animationDelay: "-7s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 14%, white 3%) 0%, color-mix(in srgb, ${skinAccent} 5%, transparent) 50%, transparent 74%)`,
              opacity: 0.34,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute bottom-[-20%] left-[30%] h-64 w-64 rounded-full blur-3xl game_components_houseofchancespanel_div_container_11"
            style={{
              animationDuration: "21s",
              animationDelay: "-10s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 11%, transparent) 0%, color-mix(in srgb, ${skinAccent} 4%, transparent) 48%, transparent 74%)`,
              opacity: 0.34,
            }}
          />
          <div
            className="absolute inset-[4%] game_components_houseofchancespanel_div_container_12"
            style={{
              backgroundImage: `linear-gradient(135deg, transparent 0%, transparent 49.2%, color-mix(in srgb, ${skinAccent} 7%, transparent) 49.6%, transparent 50%, transparent 100%), linear-gradient(45deg, transparent 0%, transparent 49.2%, color-mix(in srgb, ${skinAccent} 5%, transparent) 49.6%, transparent 50%, transparent 100%)`,
              backgroundSize: "330px 330px, 285px 285px",
              maskImage: "radial-gradient(circle at center, black 20%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 20%, transparent 78%)",
              opacity: 0.62,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute inset-0 game_components_houseofchancespanel_div_container_13"
            style={{
              animationDuration: "10s",
              backgroundImage: `radial-gradient(circle at 10% 24%, color-mix(in srgb, ${skinAccent} 26%, white 7%) 0 1px, transparent 1.25px), radial-gradient(circle at 23% 75%, color-mix(in srgb, ${skinAccent} 15%, transparent) 0 1px, transparent 1.25px), radial-gradient(circle at 49% 18%, color-mix(in srgb, ${skinAccent} 19%, transparent) 0 1px, transparent 1.2px), radial-gradient(circle at 65% 71%, color-mix(in srgb, ${skinAccent} 15%, transparent) 0 1px, transparent 1.25px), radial-gradient(circle at 83% 29%, color-mix(in srgb, ${skinAccent} 22%, transparent) 0 1px, transparent 1.2px), radial-gradient(circle at 92% 76%, color-mix(in srgb, ${skinAccent} 14%, transparent) 0 1px, transparent 1.2px)`,
              opacity: 0.26,
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-[1] h-40 w-[70%] -translate-x-1/2 rounded-full blur-3xl game_components_houseofchancespanel_div_container_14"
          style={{ background: `color-mix(in srgb, ${skinAccent} 10%, transparent)` }}
        />

        {!state.is_open ? (
          <p className="relative z-10 mx-auto mb-4 max-w-3xl border border-[rgb(var(--sep-colour-734238))]/45 bg-[rgb(var(--sep-colour-21130f))] px-3 py-2 text-center text-[9px] text-[rgb(var(--sep-colour-cf766b))] game_components_houseofchancespanel_p_text_6">
            The tables are presently closed. Come back later.
          </p>
        ) : null}

        <div className="relative z-10 mx-auto max-w-4xl game_components_houseofchancespanel_div_container_15">
          <div
            className="relative border bg-[rgb(var(--sep-colour-100c09))] p-[5px] game_components_houseofchancespanel_div_container_16"
            style={{
              borderColor: `color-mix(in srgb, ${skinAccent} 72%, transparent)`,
              boxShadow: `0 18px 42px rgba(0,0,0,0.34), 0 0 24px color-mix(in srgb, ${skinAccent} 10%, transparent)`,
            }}
          >
            <div
              className="relative overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] px-4 py-3 sm:px-6 sm:py-4 game_components_houseofchancespanel_div_container_17"
              style={{ borderColor: `color-mix(in srgb, ${skinAccent} 34%, transparent)` }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[-38px] h-24 w-24 -translate-x-1/2 rotate-45 border game_components_houseofchancespanel_div_container_18"
                style={{
                  borderColor: `color-mix(in srgb, ${skinAccent} 28%, transparent)`,
                  boxShadow: `inset 0 0 22px color-mix(in srgb, ${skinAccent} 10%, transparent)`,
                }}
              />

              <div className="relative text-center game_components_houseofchancespanel_div_let_house_read_fortune">
                <p className="text-[7px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-806b50))] game_components_houseofchancespanel_p_let_house_read_fortune">
                  Three turns · One verdict
                </p>
                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e6cfaa))] sm:text-xl game_components_houseofchancespanel_h3_let_house_read_fortune">
                  Let the House read your fortune
                </h3>
                <p className="mx-auto mt-1 max-w-xl text-[8px] leading-4 text-[rgb(var(--sep-colour-8f8271))] game_components_houseofchancespanel_p_let_house_read_fortune_2">
                  Three numbers are drawn beyond your control. The House honours only the highest claim that fate reveals.
                </p>
              </div>

              <div className="relative mt-3 game_components_houseofchancespanel_div_container_19">
                <div
                  aria-hidden="true"
                  className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 game_components_houseofchancespanel_div_container_20"
                  style={{
                    background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${skinAccent} 45%, transparent), transparent)`,
                  }}
                />

                <div className="relative grid grid-cols-3 gap-2 sm:gap-5 game_components_houseofchancespanel_div_container_21">
                  {reels.map((value, index) => (
                    <div
                      key={index}
                      className={[(([
                        "relative h-24 overflow-hidden border p-[4px] transition-transform duration-300 sm:h-28",
                        spinning ? "scale-[1.015]" : "scale-100",
                      ].join(" "))), "game_components_houseofchancespanel_div_container_22"].filter(Boolean).join(" ")}
                      style={{
                        borderColor: `color-mix(in srgb, ${skinAccent} 78%, transparent)`,
                        background: `linear-gradient(145deg, color-mix(in srgb, ${skinAccent} 12%, rgb(var(--sep-colour-17110d))), rgb(var(--sep-colour-0d0907)))`,
                        boxShadow: spinning
                          ? `0 0 20px color-mix(in srgb, ${skinAccent} 25%, transparent)`
                          : "0 10px 22px rgba(0,0,0,0.28)",
                      }}
                    >
                      <div
                        className="relative flex h-full items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-080605))] game_components_houseofchancespanel_div_container_23"
                        style={{
                          borderColor: `color-mix(in srgb, ${skinAccent} 28%, transparent)`,
                          backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${skinAccent} ${spinning ? 22 : 12}%, transparent), transparent 68%)`,
                          boxShadow: `inset 0 0 34px rgba(0,0,0,0.85), inset 0 0 18px color-mix(in srgb, ${skinAccent} 14%, transparent)`,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-2 right-2 top-2 h-px game_components_houseofchancespanel_span_text_4"
                          style={{ background: `color-mix(in srgb, ${skinAccent} 28%, transparent)` }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute bottom-2 left-2 right-2 h-px game_components_houseofchancespanel_span_text_5"
                          style={{ background: `color-mix(in srgb, ${skinAccent} 18%, transparent)` }}
                        />
                        <div
                          aria-hidden="true"
                          className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border game_components_houseofchancespanel_div_container_24"
                          style={{ borderColor: skinAccent }}
                        />
                        <div
                          aria-hidden="true"
                          className="absolute bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border game_components_houseofchancespanel_div_container_25"
                          style={{ borderColor: skinAccent }}
                        />

                        <span
                          className={[(([
                            "relative font-serif text-3xl tabular-nums transition-all duration-150 sm:text-4xl lg:text-5xl",
                            spinning ? "blur-[0.5px]" : "",
                          ].join(" "))), "game_components_houseofchancespanel_span_text_6"].filter(Boolean).join(" ")}
                          style={{
                            color: `color-mix(in srgb, ${skinAccent} 74%, rgb(var(--sep-colour-efd6a8)))`,
                            textShadow: `0 0 18px color-mix(in srgb, ${skinAccent} 35%, transparent)`,
                          }}
                        >
                          {value ?? "?"}
                        </span>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center game_components_houseofchancespanel_div_container_26">
                <div
                  className="mb-2 flex min-h-7 items-center gap-3 border px-3 py-1.5 game_components_houseofchancespanel_div_container_27"
                  style={{
                    borderColor: `color-mix(in srgb, ${skinAccent} 28%, transparent)`,
                    background: `color-mix(in srgb, ${skinAccent} 5%, rgb(var(--sep-colour-0d0907)))`,
                  }}
                >
                  <svg
                    viewBox="0 0 32 24"
                    aria-hidden="true"
                    className="h-6 w-8 shrink-0"
                    style={{
                      color:
                        readableTokenColour,
                    }}
                  >
                    <circle cx="9" cy="15" r="6" fill="currentColor" />
                    <circle cx="21" cy="15" r="6" fill="currentColor" />
                    <circle cx="15" cy="8" r="6" fill="currentColor" />
                  </svg>
                  <span
                    className="font-serif text-sm game_components_houseofchancespanel_span_text_7"
                    style={{ color: readableTokenColour }}
                  >
                    {formatRemnants(Number(state.play_cost))}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={play}
                  disabled={!canPlay}
                  className="relative min-w-[220px] overflow-hidden border px-6 py-2.5 text-[9px] uppercase tracking-[0.22em] transition duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 game_components_houseofchancespanel_button_play"
                  style={{
                    borderColor: skinAccent,
                    color: `color-mix(in srgb, ${skinAccent} 42%, rgb(var(--sep-colour-efd6a8)))`,
                    background: `linear-gradient(180deg, color-mix(in srgb, ${skinAccent} 16%, rgb(var(--sep-colour-3b2919))), rgb(var(--sep-colour-21170f)))`,
                    boxShadow: canPlay
                      ? `0 0 16px color-mix(in srgb, ${skinAccent} 18%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 30%, transparent)`
                      : "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 top-0 h-px opacity-70 game_components_houseofchancespanel_span_text_8"
                    style={{ background: skinAccent }}
                  />
                  <span className="relative game_components_houseofchancespanel_span_text_9">
                    {spinning || pending ? "Fortune turns..." : "Tempt Fate"}
                  </span>
                </button>

              </div>

              {!canAfford && state.is_open ? (
                <p className="mt-4 text-center text-[9px] text-red-400 game_components_houseofchancespanel_p_text_7">
                  You do not have enough Remnants to play.
                </p>
              ) : null}

              {!hasPlays && state.is_open ? (
                <p className="mt-4 text-center font-serif text-[11px] italic text-[rgb(var(--sep-colour-a98b61))] game_components_houseofchancespanel_p_text_8">
                  Fortune has heard enough from you today. Return tomorrow.
                </p>
              ) : null}

              {result ? (
                <div
                  className="relative mt-3 overflow-hidden border p-[3px] game_components_houseofchancespanel_div_container_28"
                  style={{
                    borderColor: `color-mix(in srgb, ${skinAccent} 82%, transparent)`,
                    boxShadow: result.reward_snapshot.length
                      ? `0 0 26px color-mix(in srgb, ${skinAccent} 20%, transparent)`
                      : "none",
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-40 game_components_houseofchancespanel_div_container_29"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${skinAccent} 28%, transparent), transparent 65%)`,
                    }}
                  />

                  <div className="relative border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-center game_components_houseofchancespanel_div_container_30">
                    <p className="text-[7px] uppercase tracking-[0.3em] game_components_houseofchancespanel_p_text_9" style={{ color: skinAccent }}>
                      The House has spoken
                    </p>
                    <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e5cca0))] sm:text-xl game_components_houseofchancespanel_p_text_10">
                      {result.matched_rule_name ?? "No winnings this time"}
                    </p>

                    {result.reward_snapshot.length ? (
                      <>
                        <div
                          className="mx-auto mt-2 h-px max-w-xs game_components_houseofchancespanel_div_container_31"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${skinAccent}, transparent)`,
                          }}
                        />
                        <div className="mt-2 flex flex-wrap justify-center gap-2 game_components_houseofchancespanel_div_container_32">
                          {result.reward_snapshot.map((reward, index) => (
                            <span
                              key={`${reward.type}-${index}`}
                              className="relative flex min-w-[120px] items-center justify-center gap-2 border bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-1.5 game_components_houseofchancespanel_span_text_10"
                              style={{
                                borderColor: `color-mix(in srgb, ${skinAccent} 50%, transparent)`,
                                boxShadow: `inset 0 0 14px color-mix(in srgb, ${skinAccent} 7%, transparent)`,
                              }}
                            >
                              {reward.type === "item" ? (
                                <ItemImageFrame
                                  src={reward.image_url}
                                  quality={reward.quality}
                                  className="h-10 w-10"
                                  badgeSize="xs"
                                  imageClassName="h-full w-full object-contain p-0.5"
                                />
                              ) : null}

                              <span className="text-left game_components_houseofchancespanel_span_text_11">
                                <span className="block text-[6px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))] game_components_houseofchancespanel_span_text_12">
                                  {reward.type === "remnants" ? "Remnants" : "Prize"}
                                </span>
                                <span className="mt-0.5 block font-serif text-sm text-[rgb(var(--sep-colour-d8bb8a))] game_components_houseofchancespanel_span_text_13">
                                  {rewardLabel(reward)}
                                </span>
                              </span>
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {message && !result ? (
                <p aria-live="polite" className="mt-4 text-center text-[9px] text-red-400 game_components_houseofchancespanel_p_text_11">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
