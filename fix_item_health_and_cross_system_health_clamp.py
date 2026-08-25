from pathlib import Path

ROOT = Path.cwd()

ACTIONS = ROOT / "app/(portal)/game/actions.ts"
HEALTH = ROOT / "lib/gifts/gift-health-effects.ts"

def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )

for path in (ACTIONS, HEALTH):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

actions = ACTIONS.read_text(encoding="utf-8")
health = HEALTH.read_text(encoding="utf-8")

old_max = '''  const maxHealth = Math.max(
    0,
    breakdown.vigor.effective * 10 +
      breakdown.giftMaxHealth +
      breakdown.itemMaxHealth +
      breakdown.activeItemMaxHealth,
  );
'''

new_max = '''  const maxHealth = Math.max(
    0,
    breakdown.vigor.effective * 10 +
      breakdown.giftMaxHealth +
      breakdown.itemMaxHealth +
      breakdown.activeItemMaxHealth +
      breakdown.shapeMaxHealth,
  );
'''

if new_max not in health:
    if health.count(old_max) != 1:
        fail("Could not find the exact shared Maximum Health block.")
    health = health.replace(old_max, new_max, 1)

damage_helper_anchor = '''async function applyRoomItemDamage(
  targetCharacterId: string,
  damage: number,
) {
'''

read_helper = '''async function readRoomItemHealth(
  targetCharacterId: string,
) {
  const admin =
    createPrivilegedClient();

  const supabase =
    await createClient();

  const [
    targetResult,
    maxResult,
  ] = await Promise.all([
    admin
      .from("characters")
      .select("current_health")
      .eq(
        "id",
        targetCharacterId,
      )
      .maybeSingle(),

    supabase.rpc(
      "get_character_current_max_health",
      {
        p_character_id:
          targetCharacterId,
      },
    ),
  ]);

  const error =
    targetResult.error ??
    maxResult.error;

  if (
    error ||
    !targetResult.data
  ) {
    throw new Error(
      `Unable to verify Item Health: ${
        error?.message ??
        "target not found"
      }`,
    );
  }

  const maxHealth = Math.max(
    0,
    Number(maxResult.data ?? 0),
  );

  const currentHealth = Math.max(
    0,
    Math.min(
      Number(
        targetResult.data
          .current_health ??
          maxHealth,
      ),
      maxHealth,
    ),
  );

  return {
    currentHealth,
    maxHealth,
  };
}

'''

if read_helper not in actions:
    if actions.count(damage_helper_anchor) != 1:
        fail("Could not find Item damage helper anchor.")
    actions = actions.replace(
        damage_helper_anchor,
        read_helper + damage_helper_anchor,
        1,
    )

rpc_anchor = '''    const rpcResult = await supabase.rpc(
      "use_own_inventory_record_targeted",
'''

pre_rpc = '''    const rawUseEffects =
      Array.isArray(item.effects)
        ? item.effects
        : item.effects
          ? [item.effects]
          : [];

    const configuredUseHealthDelta =
      rawUseEffects.reduce(
        (total, effect) =>
          effect.trigger_type ===
          "use"
            ? total +
              Number(
                effect.health_delta ??
                  0,
              )
            : total,
        0,
      );

    const actualTargetId =
      targetCharacterId ??
      character.id;

    const healthBeforeItemUse =
      configuredUseHealthDelta !== 0
        ? await readRoomItemHealth(
            actualTargetId,
          )
        : null;

'''

if pre_rpc not in actions:
    if actions.count(rpc_anchor) != 1:
        fail("Could not find the Item effect RPC anchor.")
    actions = actions.replace(
        rpc_anchor,
        pre_rpc + rpc_anchor,
        1,
    )

blocked_anchor = '''    if (outcome.blocked) {
      return {
        ok: false,
        message:
          outcome.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    const baseDamage =
'''

verify_block = '''    if (outcome.blocked) {
      return {
        ok: false,
        message:
          outcome.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    if (
      configuredUseHealthDelta !==
        0 &&
      healthBeforeItemUse
    ) {
      const healthAfterRpc =
        await readRoomItemHealth(
          actualTargetId,
        );

      const expectedHealth =
        Math.max(
          0,
          Math.min(
            healthAfterRpc.maxHealth,
            healthBeforeItemUse
              .currentHealth +
              configuredUseHealthDelta,
          ),
        );

      const missingDelta =
        expectedHealth -
        healthAfterRpc.currentHealth;

      /*
       * The database RPC remains the primary Item-effect executor.
       * Repair only the exact Current Health movement it failed to make.
       */
      if (missingDelta !== 0) {
        await applyGiftCurrentHealthDelta({
          characterId:
            actualTargetId,
          healthDelta:
            missingDelta,
        });
      }
    }

    const baseDamage =
'''

if verify_block not in actions:
    if actions.count(blocked_anchor) != 1:
        fail("Could not find post-RPC Item blocked-result block.")
    actions = actions.replace(
        blocked_anchor,
        verify_block,
        1,
    )

old_raw_effects = '''    const rawEffects = Array.isArray(item.effects)
      ? item.effects
      : item.effects
        ? [item.effects]
        : [];
'''

new_raw_effects = '''    const rawEffects =
      rawUseEffects;
'''

if new_raw_effects not in actions:
    if actions.count(old_raw_effects) != 1:
        fail("Could not find the later raw Item effects block.")
    actions = actions.replace(
        old_raw_effects,
        new_raw_effects,
        1,
    )

# Remove the later duplicate declaration that existed in the original function.
old_target = '''    const actualTargetId =
      targetCharacterId ?? character.id;

'''
if actions.count(old_target) == 1:
    actions = actions.replace(old_target, "", 1)
elif actions.count(old_target) > 1:
    fail("Unexpected duplicate actualTargetId declarations.")

for marker in [
    "async function readRoomItemHealth(",
    "const configuredUseHealthDelta =",
    "const healthBeforeItemUse =",
    "const missingDelta =",
    "const rawEffects =\n      rawUseEffects;",
]:
    if marker not in actions:
        fail(f"Item fix validation failed: missing {marker!r}")

if health.count("breakdown.shapeMaxHealth") < 1:
    fail("Health fix validation failed: shapeMaxHealth is missing.")

if actions.count("const actualTargetId =") != 1:
    fail("Expected exactly one actualTargetId declaration.")

ACTIONS.write_text(
    actions,
    encoding="utf-8",
    newline="\n",
)

HEALTH.write_text(
    health,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  app/(portal)/game/actions.ts")
print("WROTE  lib/gifts/gift-health-effects.ts")
print()
print("ITEM / HEALTH CONSISTENCY FIX APPLIED")
print("- Item Use Health +/- effects are verified after the DB RPC.")
print("- If the RPC already changed Health correctly, nothing is added twice.")
print("- If the RPC missed all/part of the Health movement, only the missing amount is applied.")
print("- Healing remains capped at current Maximum Health.")
print("- Shared Feat/Shape healing now includes active Shape Max Health.")
print("- Item damage, consumption, cooldowns, temporary modifiers and RPC execution remain intact.")
print()
print("Next: npm run build")
