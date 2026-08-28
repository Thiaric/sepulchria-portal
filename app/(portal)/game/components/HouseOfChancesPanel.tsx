"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  vellum: "#5d4930",
  starfall: "#758fd6",
  "rose-nocturne": "#b36d8b",
  "verdant-reliquary": "#4f9c70",
  "amethyst-veil": "#9b6ac4",
  moonlit: "#b58a4c",
  emberforge: "#c7773d",
  deepwater: "#4f969d",
  "blood-court": "#9d3744",
  ashen: "#9fd4ef",
  "ivory-archive": "#d1c6ad",
  "aelari-dawn": "#e7d9a8",
  "dwarven-deep": "#b37945",
  "mortal-hearth": "#aaa79d",
  "wolfs-moon": "#9aaeb7",
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
    <details className="group shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]">
      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[linear-gradient(90deg,rgb(var(--sep-colour-100c09)),rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-100c09)))] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="relative h-8 w-8 shrink-0 rotate-45 border bg-[rgb(var(--sep-colour-100c09))]"
            style={{
              borderColor: skinAccent,
              boxShadow: `0 0 16px color-mix(in srgb, ${skinAccent} 25%, transparent), inset 0 0 12px color-mix(in srgb, ${skinAccent} 12%, transparent)`,
            }}
          >
            <span
              className="absolute inset-[7px] border"
              style={{ borderColor: `color-mix(in srgb, ${skinAccent} 55%, transparent)` }}
            />
          </div>

          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
              House of Chances
            </p>
            <p className="mt-0.5 truncate font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
              The Engine of Fortune
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden text-right sm:block">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Purse
            </p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
              {formatRemnants(Number(state.wallet_balance))}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Fortune
            </p>
            {state.daily_play_limit <= 10 ? (
              <div className="mt-1 flex justify-end gap-1">
                {Array.from({ length: state.daily_play_limit }).map((_, index) => {
                  const remaining = index < state.plays_remaining;

                  return (
                    <span
                      key={index}
                      className="h-1.5 w-3 border"
                      style={{
                        borderColor: remaining
                          ? skinAccent
                          : `color-mix(in srgb, ${skinAccent} 22%, transparent)`,
                        backgroundColor: remaining
                          ? `color-mix(in srgb, ${skinAccent} 75%, transparent)`
                          : "transparent",
                        boxShadow: remaining
                          ? `0 0 7px color-mix(in srgb, ${skinAccent} 50%, transparent)`
                          : "none",
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="mt-0.5 font-serif text-sm" style={{ color: skinAccent }}>
                {state.plays_remaining} / {state.daily_play_limit}
              </p>
            )}
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            <span className="group-open:hidden">Enter ▾</span>
            <span className="hidden group-open:inline">Close ▴</span>
          </span>
        </div>
      </summary>

      <div className="relative overflow-hidden border-t border-[rgb(var(--sep-colour-59432c))]/20 px-3 py-3 sm:px-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-[70%] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `color-mix(in srgb, ${skinAccent} 10%, transparent)` }}
        />

        {!state.is_open ? (
          <p className="relative z-10 mx-auto mb-4 max-w-3xl border border-[rgb(var(--sep-colour-734238))]/45 bg-[rgb(var(--sep-colour-21130f))] px-3 py-2 text-center text-[9px] text-[rgb(var(--sep-colour-cf766b))]">
            The tables are presently closed. Come back later.
          </p>
        ) : null}

        <div className="relative z-10 mx-auto max-w-4xl">
          <div
            className="relative border bg-[rgb(var(--sep-colour-100c09))] p-[5px]"
            style={{
              borderColor: `color-mix(in srgb, ${skinAccent} 72%, transparent)`,
              boxShadow: `0 18px 42px rgba(0,0,0,0.34), 0 0 24px color-mix(in srgb, ${skinAccent} 10%, transparent)`,
            }}
          >
            <div
              className="relative overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] px-4 py-3 sm:px-6 sm:py-4"
              style={{ borderColor: `color-mix(in srgb, ${skinAccent} 34%, transparent)` }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[-38px] h-24 w-24 -translate-x-1/2 rotate-45 border"
                style={{
                  borderColor: `color-mix(in srgb, ${skinAccent} 28%, transparent)`,
                  boxShadow: `inset 0 0 22px color-mix(in srgb, ${skinAccent} 10%, transparent)`,
                }}
              />

              <div className="relative text-center">
                <p className="text-[7px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-806b50))]">
                  Three turns · One verdict
                </p>
                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e6cfaa))] sm:text-xl">
                  Let the House read your fortune
                </h3>
                <p className="mx-auto mt-1 max-w-xl text-[8px] leading-4 text-[rgb(var(--sep-colour-8f8271))]">
                  Three numbers are drawn beyond your control. The House honours only the highest claim that fate reveals.
                </p>
              </div>

              <div className="relative mt-3">
                <div
                  aria-hidden="true"
                  className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
                  style={{
                    background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${skinAccent} 45%, transparent), transparent)`,
                  }}
                />

                <div className="relative grid grid-cols-3 gap-2 sm:gap-5">
                  {reels.map((value, index) => (
                    <div
                      key={index}
                      className={[
                        "relative h-24 overflow-hidden border p-[4px] transition-transform duration-300 sm:h-28",
                        spinning ? "scale-[1.015]" : "scale-100",
                      ].join(" ")}
                      style={{
                        borderColor: `color-mix(in srgb, ${skinAccent} 78%, transparent)`,
                        background: `linear-gradient(145deg, color-mix(in srgb, ${skinAccent} 12%, rgb(var(--sep-colour-17110d))), rgb(var(--sep-colour-0d0907)))`,
                        boxShadow: spinning
                          ? `0 0 20px color-mix(in srgb, ${skinAccent} 25%, transparent)`
                          : "0 10px 22px rgba(0,0,0,0.28)",
                      }}
                    >
                      <div
                        className="relative flex h-full items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-080605))]"
                        style={{
                          borderColor: `color-mix(in srgb, ${skinAccent} 28%, transparent)`,
                          backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${skinAccent} ${spinning ? 22 : 12}%, transparent), transparent 68%)`,
                          boxShadow: `inset 0 0 34px rgba(0,0,0,0.85), inset 0 0 18px color-mix(in srgb, ${skinAccent} 14%, transparent)`,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-2 right-2 top-2 h-px"
                          style={{ background: `color-mix(in srgb, ${skinAccent} 28%, transparent)` }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute bottom-2 left-2 right-2 h-px"
                          style={{ background: `color-mix(in srgb, ${skinAccent} 18%, transparent)` }}
                        />
                        <div
                          aria-hidden="true"
                          className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border"
                          style={{ borderColor: skinAccent }}
                        />
                        <div
                          aria-hidden="true"
                          className="absolute bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border"
                          style={{ borderColor: skinAccent }}
                        />

                        <span
                          className={[
                            "relative font-serif text-3xl tabular-nums transition-all duration-150 sm:text-4xl lg:text-5xl",
                            spinning ? "blur-[0.5px]" : "",
                          ].join(" ")}
                          style={{
                            color: `color-mix(in srgb, ${skinAccent} 74%, rgb(var(--sep-colour-efd6a8)))`,
                            textShadow: `0 0 18px color-mix(in srgb, ${skinAccent} 35%, transparent)`,
                          }}
                        >
                          {value ?? "?"}
                        </span>

                        <span className="absolute bottom-1.5 right-2 text-[6px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-5e5346))]">
                          Turn {index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center">
                <div
                  className="mb-2 flex min-h-6 items-center gap-2 border px-3 py-1"
                  style={{
                    borderColor: `color-mix(in srgb, ${skinAccent} 28%, transparent)`,
                    background: `color-mix(in srgb, ${skinAccent} 5%, rgb(var(--sep-colour-0d0907)))`,
                  }}
                >
                  <span className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756958))]">
                    Stake
                  </span>
                  <span className="font-serif text-sm text-[rgb(var(--sep-colour-e4c589))]">
                    {formatRemnants(Number(state.play_cost))}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={play}
                  disabled={!canPlay}
                  className="relative min-w-[220px] overflow-hidden border px-6 py-2.5 text-[9px] uppercase tracking-[0.22em] transition duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="absolute inset-x-6 top-0 h-px opacity-70"
                    style={{ background: skinAccent }}
                  />
                  <span className="relative">
                    {spinning || pending ? "Fortune turns..." : "Tempt Fate"}
                  </span>
                </button>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                  <span>Purse {formatRemnants(Number(state.wallet_balance))}</span>
                  <span aria-hidden="true">·</span>
                  <span>{state.plays_remaining} of {state.daily_play_limit} chances remain</span>
                </div>
              </div>

              {!canAfford && state.is_open ? (
                <p className="mt-4 text-center text-[9px] text-red-400">
                  You do not have enough Remnants to play.
                </p>
              ) : null}

              {!hasPlays && state.is_open ? (
                <p className="mt-4 text-center font-serif text-[11px] italic text-[rgb(var(--sep-colour-a98b61))]">
                  Fortune has heard enough from you today. Return tomorrow.
                </p>
              ) : null}

              {result ? (
                <div
                  className="relative mt-3 overflow-hidden border p-[3px]"
                  style={{
                    borderColor: `color-mix(in srgb, ${skinAccent} 82%, transparent)`,
                    boxShadow: result.reward_snapshot.length
                      ? `0 0 26px color-mix(in srgb, ${skinAccent} 20%, transparent)`
                      : "none",
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${skinAccent} 28%, transparent), transparent 65%)`,
                    }}
                  />

                  <div className="relative border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-center">
                    <p className="text-[7px] uppercase tracking-[0.3em]" style={{ color: skinAccent }}>
                      The House has spoken
                    </p>
                    <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e5cca0))] sm:text-xl">
                      {result.matched_rule_name ?? "No winnings this time"}
                    </p>

                    {result.reward_snapshot.length ? (
                      <>
                        <div
                          className="mx-auto mt-2 h-px max-w-xs"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${skinAccent}, transparent)`,
                          }}
                        />
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {result.reward_snapshot.map((reward, index) => (
                            <span
                              key={`${reward.type}-${index}`}
                              className="relative flex min-w-[120px] items-center justify-center gap-2 border bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-1.5"
                              style={{
                                borderColor: `color-mix(in srgb, ${skinAccent} 50%, transparent)`,
                                boxShadow: `inset 0 0 14px color-mix(in srgb, ${skinAccent} 7%, transparent)`,
                              }}
                            >
                              {reward.type === "item" ? (
                                reward.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={reward.image_url}
                                    alt=""
                                    className="h-10 w-10 shrink-0 object-contain"
                                  />
                                ) : (
                                  <span
                                    className="flex h-10 w-10 shrink-0 items-center justify-center border font-serif text-lg"
                                    style={{
                                      borderColor: `color-mix(in srgb, ${skinAccent} 30%, transparent)`,
                                      color: skinAccent,
                                    }}
                                  >
                                    ◇
                                  </span>
                                )
                              ) : null}

                              <span className="text-left">
                                <span className="block text-[6px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
                                  {reward.type === "remnants" ? "Remnants" : "Prize"}
                                </span>
                                <span className="mt-0.5 block font-serif text-sm text-[rgb(var(--sep-colour-d8bb8a))]">
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
                <p aria-live="polite" className="mt-4 text-center text-[9px] text-red-400">
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
