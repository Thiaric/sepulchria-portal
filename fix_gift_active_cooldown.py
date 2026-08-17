from pathlib import Path

ROOT = Path.cwd()

def load(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"ERROR: Missing {rel}")
    return path, path.read_text(encoding="utf-8")

# 1) game/page.tsx
rel = "app/(portal)/game/page.tsx"
path, text = load(rel)

old = '''      const activeActivation =
        (ownership.activations ?? []).find(
          (activation) =>
            activation.ended_at === null &&
            activation.health_reverted_at === null &&
            Date.parse(activation.activated_at) <= giftNow &&
            Date.parse(activation.expires_at) > giftNow,
        ) ?? null;

      return {
        characterGiftId: ownership.id,
        giftId: gift.id,
        name: gift.name,
        description: gift.description ?? "",
        effectMode: gift.effect_mode as
          | "none"
          | "passive"
          | "temporary",
        durationMinutes: gift.duration_minutes,
        activeUntil:
          activeActivation?.expires_at ?? null,
      };'''

new = '''      const activations =
        ownership.activations ?? [];

      const activeActivation =
        activations.find(
          (activation) =>
            activation.ended_at === null &&
            Date.parse(activation.activated_at) <= giftNow &&
            Date.parse(activation.expires_at) > giftNow,
        ) ?? null;

      const latestActivation =
        [...activations]
          .sort(
            (a, b) =>
              Date.parse(b.activated_at) -
              Date.parse(a.activated_at),
          )[0] ?? null;

      const cooldownUntil =
        gift.effect_mode === "temporary" &&
        latestActivation
          ? new Date(
              Date.parse(
                latestActivation.activated_at,
              ) +
                6 * 60 * 60 * 1000,
            ).toISOString()
          : null;

      return {
        characterGiftId: ownership.id,
        giftId: gift.id,
        name: gift.name,
        description: gift.description ?? "",
        effectMode: gift.effect_mode as
          | "none"
          | "passive"
          | "temporary",
        durationMinutes: gift.duration_minutes,
        activeUntil:
          activeActivation?.expires_at ?? null,
        cooldownUntil:
          cooldownUntil &&
          Date.parse(cooldownUntil) > giftNow
            ? cooldownUntil
            : null,
      };'''

if old not in text:
    raise SystemExit("ERROR: page.tsx Gift activation block not found")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("Updated:", rel)

# 2) RoomChatForm.tsx
rel = "app/(portal)/game/components/RoomChatForm.tsx"
path, text = load(rel)

old = '''  durationMinutes: number | null;
  activeUntil: string | null;
};'''
new = '''  durationMinutes: number | null;
  activeUntil: string | null;
  cooldownUntil: string | null;
};'''
if old not in text:
    raise SystemExit("ERROR: ChatGift type not found")
text = text.replace(old, new, 1)

marker = '''  const selectedGift = useMemo(
    () =>
      gifts.find(
        (gift) =>
          gift.characterGiftId ===
          selectedGiftId,
      ) ??
      gifts[0] ??
      null,
    [gifts, selectedGiftId],
  );
'''

extra = marker + '''
  const selectedGiftIsActive =
    selectedGift?.effectMode === "temporary" &&
    Boolean(selectedGift.activeUntil);

  const selectedGiftIsOnCooldown =
    selectedGift?.effectMode === "temporary" &&
    !selectedGiftIsActive &&
    Boolean(selectedGift?.cooldownUntil);

  function giftCooldownLabel(cooldownUntil: string) {
    const remainingMs = Math.max(
      0,
      Date.parse(cooldownUntil) - Date.now(),
    );

    const hours = Math.floor(
      remainingMs / (60 * 60 * 1000),
    );

    const minutes = Math.ceil(
      (remainingMs % (60 * 60 * 1000)) /
        (60 * 1000),
    );

    return `${hours ? `${hours}h ` : ""}${minutes}m`;
  }
'''
if marker not in text:
    raise SystemExit("ERROR: selectedGift block not found")
text = text.replace(marker, extra, 1)

old = '''              {selectedGift?.effectMode ===
                "temporary" &&
              !selectedGift.activeUntil ? (
                <button
                  type="submit"
                  formAction={giftAction}
                  formNoValidate
                  className="border border-[#85653c] bg-[#342617] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd4a0] transition hover:bg-[#4a351f]"
                >
                  Activate Gift
                </button>
              ) : (
                <button
                  type="submit"
                  formAction={giftUseAction}
                  formNoValidate
                  className="border border-[#765937] bg-[#21190f] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#d6bb8d] transition hover:border-[#a17a49]"
                >
                  Use Gift
                </button>
              )}'''

new = '''              {selectedGift?.effectMode === "temporary" ? (
                selectedGiftIsActive ? (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed border border-[#59432c]/35 bg-[#17120e] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#756958] opacity-60"
                  >
                    Active
                  </button>
                ) : selectedGiftIsOnCooldown &&
                  selectedGift?.cooldownUntil ? (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed border border-[#59432c]/35 bg-[#17120e] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#756958] opacity-60"
                  >
                    Cooldown{" "}
                    {giftCooldownLabel(
                      selectedGift.cooldownUntil,
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    formAction={giftAction}
                    formNoValidate
                    className="border border-[#85653c] bg-[#342617] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd4a0] transition hover:bg-[#4a351f]"
                  >
                    Activate Gift
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  formAction={giftUseAction}
                  formNoValidate
                  className="border border-[#765937] bg-[#21190f] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#d6bb8d] transition hover:border-[#a17a49]"
                >
                  Use Gift
                </button>
              )}'''
if old not in text:
    raise SystemExit("ERROR: Gift button branch not found")
text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Updated:", rel)

# 3) actions.ts
rel = "app/(portal)/game/actions.ts"
path, text = load(rel)

old = '''    if (gift.effect_mode === "temporary") {
      const { data: activation, error: activationError } =
        await supabase
          .from("gift_activations")
          .select("id")
          .eq("character_gift_id", characterGiftId)
          .is("ended_at", null)
          .gt("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle();

      if (activationError) {
        return {
          ok: false,
          message: activationError.message,
        };
      }

      if (!activation) {
        return {
          ok: false,
          message:
            `${gift.name} must be activated before it can be used.`,
        };
      }
    }'''

new = '''    if (gift.effect_mode === "temporary") {
      return {
        ok: false,
        message:
          `${gift.name} is a temporary Gift. It can only be activated when ready.`,
      };
    }'''
if old not in text:
    raise SystemExit("ERROR: useRoomGift temporary block not found")
text = text.replace(old, new, 1)

marker = '''    if (existing) {
      return {
        ok: false,
        message: `${gift.name} is already active.`,
      };
    }

    const admin = createPrivilegedClient();'''

replacement = '''    if (existing) {
      return {
        ok: false,
        message: `${gift.name} is already active.`,
      };
    }

    const cooldownHours = 6;

    const {
      data: latestActivation,
      error: cooldownError,
    } = await supabase
      .from("gift_activations")
      .select("activated_at")
      .eq("character_gift_id", characterGiftId)
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cooldownError) {
      return {
        ok: false,
        message:
          `Unable to verify Gift cooldown: ${cooldownError.message}`,
      };
    }

    if (latestActivation) {
      const cooldownUntil = new Date(
        Date.parse(latestActivation.activated_at) +
          cooldownHours * 60 * 60 * 1000,
      );

      if (cooldownUntil.getTime() > Date.now()) {
        const remainingMs =
          cooldownUntil.getTime() - Date.now();

        const remainingHours = Math.floor(
          remainingMs / (60 * 60 * 1000),
        );

        const remainingMinutes = Math.ceil(
          (remainingMs % (60 * 60 * 1000)) /
            (60 * 1000),
        );

        return {
          ok: false,
          message:
            `${gift.name} is on cooldown. You can activate it again in ${
              remainingHours ? `${remainingHours}h ` : ""
            }${remainingMinutes}m.`,
        };
      }
    }

    const admin = createPrivilegedClient();'''
if marker not in text:
    raise SystemExit("ERROR: activateRoomGift active check not found")
text = text.replace(marker, replacement, 1)

path.write_text(text, encoding="utf-8")
print("Updated:", rel)

print()
print("SUCCESS")
print("Temporary Gift Active/Cooldown behaviour installed.")
print("Run: npm run build")
