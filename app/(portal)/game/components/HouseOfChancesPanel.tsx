"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  playHouseOfChances,
  type HouseOfChancesPlayResult,
} from "../house-of-chances-actions";
import { formatRemnants } from "@/lib/economy/currency";

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
    <details className="group max-h-[72%] shrink-0 overflow-y-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">
      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            House of Chances
          </p>
          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            Tempt Fate
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Remnants
            </p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
              {formatRemnants(Number(state.wallet_balance))}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Plays
            </p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
              {state.plays_used} / {state.daily_play_limit}
            </p>
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            <span className="group-open:hidden">Play ▾</span>
            <span className="hidden group-open:inline">Hide ▴</span>
          </span>
        </div>
      </summary>

      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-4">
        {!state.is_open ? (
          <p className="mb-3 border border-[rgb(var(--sep-colour-734238))]/45 bg-[rgb(var(--sep-colour-21130f))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-cf766b))]">
            The tables are presently closed.
          </p>
        ) : null}

        <div className="mx-auto max-w-2xl">
          <p className="text-center text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            Three turns of fortune. One price. Whatever the House reveals is final.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {reels.map((value, index) => (
              <div
                key={index}
                className={[
                  "relative flex aspect-[5/4] items-center justify-center overflow-hidden",
                  "border border-[rgb(var(--sep-colour-987344))]",
                  "bg-[radial-gradient(circle_at_center,rgb(var(--sep-colour-2b2117)),rgb(var(--sep-colour-100c09))_72%)]",
                  "shadow-[inset_0_0_18px_rgba(196,150,82,0.16),0_0_10px_rgba(0,0,0,0.35)]",
                  spinning ? "animate-pulse" : "",
                ].join(" ")}
              >
                <div className="pointer-events-none absolute inset-[3px] border border-[rgb(var(--sep-colour-987344))]/35" />
                <span className="font-serif text-3xl tabular-nums text-[rgb(var(--sep-colour-efd6a8))] sm:text-4xl">
                  {value ?? "?"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={play}
              disabled={!canPlay}
              className="min-w-[190px] border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b78b50))] hover:bg-[rgb(var(--sep-colour-4a331f))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {spinning || pending
                ? "Fortune turns..."
                : `Tempt Fate — ${formatRemnants(Number(state.play_cost))}`}
            </button>

            <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              {state.plays_remaining} play
              {state.plays_remaining === 1 ? "" : "s"} remaining today
            </span>
          </div>

          {!canAfford && state.is_open ? (
            <p className="mt-3 text-center text-[9px] text-red-400">
              You do not have enough Remnants to play.
            </p>
          ) : null}

          {!hasPlays && state.is_open ? (
            <p className="mt-3 text-center text-[9px] text-[rgb(var(--sep-colour-a98b61))]">
              Fortune has heard enough from you today. Return tomorrow.
            </p>
          ) : null}

          {result ? (
            <div className="mt-4 border border-[rgb(var(--sep-colour-6f5435))]/55 bg-[rgb(var(--sep-colour-17110d))] p-3 text-center">
              <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Result
              </p>
              <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
                {result.matched_rule_name ?? "No winnings this time"}
              </p>

              {result.reward_snapshot.length ? (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {result.reward_snapshot.map((reward, index) => (
                    <span
                      key={`${reward.type}-${index}`}
                      className="border border-[rgb(var(--sep-colour-765735))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] text-[rgb(var(--sep-colour-d8bb8a))]"
                    >
                      {rewardLabel(reward)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {message && !result ? (
            <p
              aria-live="polite"
              className="mt-3 text-center text-[9px] text-red-400"
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
