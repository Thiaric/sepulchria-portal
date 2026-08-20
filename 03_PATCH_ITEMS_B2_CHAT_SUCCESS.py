from pathlib import Path
import subprocess

EXPECTED_HEAD = "32c580c22c317e3c60950627a8a17af8ba23ce23"
P = Path("app/(portal)/game/actions.ts")

if not P.exists():
    raise SystemExit(f"Missing expected file: {P}")

head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOPPED: expected HEAD {EXPECTED_HEAD}, current HEAD is {head}. No files were changed."
    )

s = P.read_text(encoding="utf-8-sig")

def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"STOPPED at {label}: expected 1 match, found {count}.")
    s = s.replace(old, new, 1)

replace_once(
"""        name,
        target_mode,
        effects:item_effects(
""",
"""        name,
        target_mode,
        success_die,
        success_threshold,
        success_attribute,
        effects:item_effects(
""",
"chat Item select",
)

replace_once(
"""    const { data: result, error: useError } = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id: targetCharacterId,
      },
    );
""",
"""    const successRoll = await rollGiftSuccess({
      character,
      successDie: item.success_die ?? null,
      successThreshold: item.success_threshold ?? null,
      successAttribute:
        (item.success_attribute ?? null) as GiftSuccessAttribute | null,
    });

    if (!successRoll.success) {
      let spentText = "";

      if (recordKind === "standard") {
        const { data: owned, error: ownedError } = await supabase
          .from("character_items")
          .select("id, quantity, item:items(use_behaviour)")
          .eq("id", recordId)
          .eq("character_id", character.id)
          .maybeSingle();

        if (ownedError || !owned) {
          return { ok: false, message: "That Item is no longer in your Inventory." };
        }

        const relation = owned.item ?? null;
        const ownedItem = Array.isArray(relation) ? relation[0] ?? null : relation;

        if (ownedItem?.use_behaviour === "consumable") {
          const quantity = Number(owned.quantity ?? 0);

          if (quantity <= 0) {
            return { ok: false, message: "This Item has no uses remaining." };
          }

          if (quantity === 1) {
            const { error: spendError } = await supabase
              .from("character_items")
              .delete()
              .eq("id", recordId)
              .eq("character_id", character.id);

            if (spendError) return { ok: false, message: spendError.message };
          } else {
            const { error: spendError } = await supabase
              .from("character_items")
              .update({ quantity: quantity - 1 })
              .eq("id", recordId)
              .eq("character_id", character.id);

            if (spendError) return { ok: false, message: spendError.message };
          }

          spentText = " - Consumable use spent";
        }
      } else {
        const { data: owned, error: ownedError } = await supabase
          .from("character_item_instances")
          .select("id, charges_remaining, item:items(use_behaviour)")
          .eq("id", recordId)
          .eq("owner_character_id", character.id)
          .eq("vault_status", "owned")
          .maybeSingle();

        if (ownedError || !owned) {
          return { ok: false, message: "That Item is no longer in your Inventory." };
        }

        const relation = owned.item ?? null;
        const ownedItem = Array.isArray(relation) ? relation[0] ?? null : relation;

        if (ownedItem?.use_behaviour === "limited_charges") {
          const remaining = Number(owned.charges_remaining ?? 0);

          if (remaining <= 0) {
            return { ok: false, message: "This Item has no charges remaining." };
          }

          const { error: spendError } = await supabase
            .from("character_item_instances")
            .update({ charges_remaining: remaining - 1 })
            .eq("id", recordId)
            .eq("owner_character_id", character.id)
            .eq("vault_status", "owned");

          if (spendError) return { ok: false, message: spendError.message };

          spentText = ` - Charge spent (${remaining - 1} remaining)`;
        } else if (ownedItem?.use_behaviour === "consumable") {
          const { error: spendError } = await supabase
            .from("character_item_instances")
            .delete()
            .eq("id", recordId)
            .eq("owner_character_id", character.id)
            .eq("vault_status", "owned");

          if (spendError) return { ok: false, message: spendError.message };

          spentText = " - Consumable use spent";
        }
      }

      const { error: failedMessageError } = await supabase
        .from("room_messages")
        .insert({
          room_id: character.current_room_id,
          character_id: character.id,
          message:
            `◆ used "${item.name}"` +
            ` - ${successRoll.summary}` +
            ` - No effect applied` +
            `${spentText}` +
            ` - Cooldown did not start`,
          message_type: "action",
          client_nonce: crypto.randomUUID(),
        });

      if (failedMessageError) {
        throw new Error(
          `Item attempt resolved, but the room announcement failed: ${failedMessageError.message}`,
        );
      }

      revalidatePath("/game");
      revalidatePath("/character");
      revalidatePath("/characters");

      return {
        ok: true,
        message: `${item.name} failed.`,
        submittedAt: Date.now(),
      };
    }

    const { data: result, error: useError } = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id: targetCharacterId,
      },
    );
""",
"success roll before Item RPC",
)

replace_once(
"""        message:
          `◆ used "${outcome.item_name ?? item.name}"${targetLabel}` +
          `${effectParts.length ? ` · ${effectParts.join(" · ")}` : ""}`,
""",
"""        message:
          `◆ used "${outcome.item_name ?? item.name}"${targetLabel}` +
          ` - ${successRoll.summary}` +
          `${effectParts.length ? ` - ${effectParts.join(" - ")}` : ""}`,
""",
"successful chat announcement",
)

P.write_text(s, encoding="utf-8", newline="\n")

print("SUCCESS: Items B2 chat success-roll fix applied.")
print("Changed only: app/(portal)/game/actions.ts")
print("Now run: npm run build")
