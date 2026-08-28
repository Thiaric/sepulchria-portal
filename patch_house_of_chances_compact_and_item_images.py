from pathlib import Path

action_path = Path("app/(portal)/game/house-of-chances-actions.ts")
panel_path = Path("app/(portal)/game/components/HouseOfChancesPanel.tsx")

for path in (action_path, panel_path):
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path}")

action = action_path.read_text(encoding="utf-8")

old_type = '    | { type: "item"; item_id: string; name: string; quantity: number }\n'
new_type = '''    | {
        type: "item";
        item_id: string;
        name: string;
        quantity: number;
        image_url: string | null;
      }
'''
if old_type in action:
    action = action.replace(old_type, new_type, 1)
elif 'image_url: string | null;' not in action:
    raise SystemExit("Could not locate House Item reward type.")

old_result = '''  const result = raw as HouseOfChancesPlayResult;

  revalidatePath("/game");
'''
new_result = '''  const result = raw as HouseOfChancesPlayResult;

  const itemRewardIds = Array.from(
    new Set(
      result.reward_snapshot
        .filter(
          (
            reward,
          ): reward is Extract<
            HouseOfChancesPlayResult["reward_snapshot"][number],
            { type: "item" }
          > => reward.type === "item",
        )
        .map((reward) => reward.item_id),
    ),
  );

  if (itemRewardIds.length > 0) {
    const { data: prizeItems } = await supabase
      .from("items")
      .select("id, image_url")
      .in("id", itemRewardIds);

    const imageByItemId = new Map(
      (prizeItems ?? []).map((item) => [
        String(item.id),
        item.image_url ? String(item.image_url) : null,
      ]),
    );

    result.reward_snapshot = result.reward_snapshot.map((reward) =>
      reward.type === "item"
        ? {
            ...reward,
            image_url: imageByItemId.get(reward.item_id) ?? null,
          }
        : reward,
    );
  }

  revalidatePath("/game");
'''
if old_result in action:
    action = action.replace(old_result, new_result, 1)
elif "itemRewardIds" not in action:
    raise SystemExit("Could not locate House result enrichment anchor.")

action_path.write_text(action, encoding="utf-8")

panel = panel_path.read_text(encoding="utf-8")

replacements = [
    ('className="group max-h-[78%] shrink-0 overflow-y-auto border-b',
     'className="group shrink-0 border-b'),
    ('className="relative overflow-hidden border-t border-[rgb(var(--sep-colour-59432c))]/20 px-3 py-5 sm:px-5"',
     'className="relative overflow-hidden border-t border-[rgb(var(--sep-colour-59432c))]/20 px-3 py-3 sm:px-5"'),
    ('className="relative overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] px-4 py-5 sm:px-7 sm:py-6"',
     'className="relative overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] px-4 py-3 sm:px-6 sm:py-4"'),
    ('className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-e6cfaa))] sm:text-2xl"',
     'className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e6cfaa))] sm:text-xl"'),
    ('className="mx-auto mt-2 max-w-xl text-[9px] leading-5',
     'className="mx-auto mt-1 max-w-xl text-[8px] leading-4'),
    ('className="relative mt-6"',
     'className="relative mt-3"'),
    ('"relative aspect-[5/4] overflow-hidden border p-[4px] transition-transform duration-300",',
     '"relative h-24 overflow-hidden border p-[4px] transition-transform duration-300 sm:h-28",'),
    ('"relative font-serif text-4xl tabular-nums transition-all duration-150 sm:text-5xl lg:text-6xl",',
     '"relative font-serif text-3xl tabular-nums transition-all duration-150 sm:text-4xl lg:text-5xl",'),
    ('className="mt-6 flex flex-col items-center"',
     'className="mt-3 flex flex-col items-center"'),
    ('className="mb-3 flex min-h-7 items-center gap-2 border px-3 py-1.5"',
     'className="mb-2 flex min-h-6 items-center gap-2 border px-3 py-1"'),
    ('className="relative min-w-[230px] overflow-hidden border px-7 py-3.5',
     'className="relative min-w-[220px] overflow-hidden border px-6 py-2.5'),
    ('className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2',
     'className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1'),
    ('className="relative mt-6 overflow-hidden border p-[4px]"',
     'className="relative mt-3 overflow-hidden border p-[3px]"'),
    ('className="relative border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-5 text-center"',
     'className="relative border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-center"'),
    ('className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-e5cca0))] sm:text-2xl"',
     'className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e5cca0))] sm:text-xl"'),
    ('className="mx-auto mt-3 h-px max-w-xs"',
     'className="mx-auto mt-2 h-px max-w-xs"'),
    ('className="mt-4 flex flex-wrap justify-center gap-2.5"',
     'className="mt-2 flex flex-wrap justify-center gap-2"'),
]
for old, new in replacements:
    if old in panel:
        panel = panel.replace(old, new, 1)

old_fortune = '''            <div className="mt-1 flex justify-end gap-1">
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
'''
new_fortune = '''            {state.daily_play_limit <= 10 ? (
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
'''
if old_fortune in panel:
    panel = panel.replace(old_fortune, new_fortune, 1)
elif "state.daily_play_limit <= 10" not in panel:
    raise SystemExit("Could not locate Fortune markers.")

old_reward = '''                            <span
                              key={`${reward.type}-${index}`}
                              className="relative min-w-[110px] border bg-[rgb(var(--sep-colour-15100d))] px-3 py-2"
                              style={{
                                borderColor: `color-mix(in srgb, ${skinAccent} 50%, transparent)`,
                                boxShadow: `inset 0 0 14px color-mix(in srgb, ${skinAccent} 7%, transparent)`,
                              }}
                            >
                              <span className="block text-[6px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
                                {reward.type === "remnants" ? "Remnants" : "Prize"}
                              </span>
                              <span className="mt-1 block font-serif text-sm text-[rgb(var(--sep-colour-d8bb8a))]">
                                {rewardLabel(reward)}
                              </span>
                            </span>
'''
new_reward = '''                            <span
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
'''
if old_reward in panel:
    panel = panel.replace(old_reward, new_reward, 1)
elif "reward.image_url" not in panel:
    raise SystemExit("Could not locate House reward card.")

panel_path.write_text(panel, encoding="utf-8")

print("SUCCESS")
print("House of Chances compact layout + Item prize artwork applied.")
print("No RPC/economy/prize-resolution logic changed.")
print("Now run: npm run build")
