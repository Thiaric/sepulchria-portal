
from pathlib import Path
import sys

PANEL = Path("app/(portal)/game/components/ItemExchangePanel.tsx")
BROWSER = Path("components/characters/character-inventory-browser.tsx")
ACTIONS = Path("app/(portal)/game/gift-notification-actions.ts")


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    print("No file was changed.")
    return 1


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return source.replace(old, new, 1)


def main() -> int:
    if not PANEL.exists() or not BROWSER.exists():
        return fail("Run this from the sepulchria-portal repository root.")

    panel_original = PANEL.read_text(encoding="utf-8")
    browser_original = BROWSER.read_text(encoding="utf-8")
    panel = panel_original
    browser = browser_original

    try:
        panel = replace_once(
            panel,
            'import type { PresentRoomCharacter } from "@/types/game";',
            '''import type { PresentRoomCharacter } from "@/types/game";
import {
  notifyItemGiftReceived,
  notifyRemnantsGiftReceived,
} from "@/app/(portal)/game/gift-notification-actions";''',
            "notification action imports",
        )

        old_give = '''  async function give() {
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
  }'''

        new_give = '''  async function give() {
    const { kind, id } = decode(giveChoice);
    if (!kind || !id || !giveTarget) {
      setOk(false);
      setMessage("Choose an Item and a character.");
      return;
    }

    const selectedItem =
      inventoryRecords.get(
        `${kind}:${id}`,
      );

    if (!selectedItem) {
      setOk(false);
      setMessage("That Item is no longer available.");
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

      let notificationWarning = "";

      try {
        await notifyItemGiftReceived({
          recipientCharacterId:
            giveTarget,
          itemId:
            selectedItem.item_id,
          quantity:
            giveQuantity,
        });
      } catch (notificationError) {
        console.error(
          "Unable to notify Item recipient:",
          notificationError,
        );
        notificationWarning =
          " The Item was transferred, but the recipient notification could not be created.";
      }

      setOk(true);
      setMessage(
        `Item given successfully.${notificationWarning}`,
      );
      setGiveChoice("");
      setGiveQuantity(1);
    });
  }'''

        panel = replace_once(
            panel,
            old_give,
            new_give,
            "Give Item notification",
        )

        old_remnants = '''    await mutate(async () => {
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
    });'''

        new_remnants = '''    await mutate(async () => {
      const { error } = await supabase.rpc(
        "give_remnants_same_location",
        {
          p_target_character_id: remnantTarget,
          p_amount: remnantAmount,
        },
      );

      if (error) throw new Error(error.message);

      let notificationWarning = "";

      try {
        await notifyRemnantsGiftReceived({
          recipientCharacterId:
            remnantTarget,
          amount:
            remnantAmount,
        });
      } catch (notificationError) {
        console.error(
          "Unable to notify Remnants recipient:",
          notificationError,
        );
        notificationWarning =
          " The Remnants were transferred, but the recipient notification could not be created.";
      }

      setOk(true);
      setMessage(
        `Remnants given successfully.${notificationWarning}`,
      );
      setRemnantTarget("");
      setRemnantAmount(1);
    });'''

        panel = replace_once(
            panel,
            old_remnants,
            new_remnants,
            "Give Remnants notification",
        )

        browser = replace_once(
            browser,
            'import { useRouter } from "next/navigation";',
            'import { useRouter, useSearchParams } from "next/navigation";',
            "useSearchParams import",
        )

        browser = replace_once(
            browser,
            '''}) {
  const [
    search,
    setSearch,
  ] = useState("");''',
            '''}) {
  const searchParams =
    useSearchParams();

  const focusItemId =
    own
      ? searchParams.get("focusItem")
      : null;

  const [
    search,
    setSearch,
  ] = useState("");''',
            "focusItem query state",
        )

        browser = replace_once(
            browser,
            '''  const [
    equipmentCollapsed,
    setEquipmentCollapsed,
  ] = useState(false);
''',
            '''  const [
    equipmentCollapsed,
    setEquipmentCollapsed,
  ] = useState(false);

  useEffect(() => {
    if (!focusItemId) {
      return;
    }

    const targetRow =
      rows.find(
        (row) =>
          row.item_id ===
          focusItemId,
      );

    if (!targetRow) {
      return;
    }

    setSearch("");
    setCategory("");
    setSubcategory("");
    setQuality("");
    setSlot("");
    setStatus("all");
    setRequirement("all");

    setCollapsed(
      (current) => {
        const next =
          new Set(current);

        if (
          targetRow.parent_container_id
        ) {
          next.delete(
            "__containers__",
          );
        } else {
          next.delete(
            targetRow.category_name,
          );
        }

        return next;
      },
    );

    const timeoutId =
      window.setTimeout(() => {
        const selector =
          `[data-inventory-item-id="${CSS.escape(
            focusItemId,
          )}"]`;

        const element =
          document.querySelector<HTMLElement>(
            selector,
          );

        if (!element) {
          return;
        }

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        element.animate(
          [
            {
              boxShadow:
                "0 0 0 0 rgba(255,255,255,0)",
              transform:
                "scale(1)",
            },
            {
              boxShadow:
                "0 0 0 3px rgba(255,255,255,0.55)",
              transform:
                "scale(1.01)",
            },
            {
              boxShadow:
                "0 0 0 0 rgba(255,255,255,0)",
              transform:
                "scale(1)",
            },
          ],
          {
            duration: 2200,
            easing: "ease-out",
          },
        );
      }, 120);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    focusItemId,
    rows,
  ]);
''',
            "Inventory focus effect",
        )

        browser = replace_once(
            browser,
            '''    <article
      data-sep-interactive-surface="card"
      className=''', 
            '''    <article
      data-sep-interactive-surface="card"
      data-inventory-item-id={row.item_id}
      className=''', 
            "Inventory item focus marker",
        )

    except RuntimeError as exc:
        return fail(str(exc))

    action_source = '''"use server";

import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import {
  createTargetedCharacterNotification,
} from "@/lib/notifications/create-targeted-character-notification";

async function getGiftContext(
  recipientCharacterId: string,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be signed in.",
    );
  }

  const {
    data: sender,
    error: senderError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status, is_system",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    senderError ||
    !sender ||
    sender.status !== "approved" ||
    sender.is_system === true
  ) {
    throw new Error(
      senderError?.message ??
        "Unable to identify your approved Character.",
    );
  }

  if (
    !recipientCharacterId ||
    recipientCharacterId ===
      sender.id
  ) {
    throw new Error(
      "Invalid gift recipient.",
    );
  }

  const {
    data: recipient,
    error: recipientError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status, is_system",
    )
    .eq(
      "id",
      recipientCharacterId,
    )
    .maybeSingle();

  if (
    recipientError ||
    !recipient ||
    recipient.status !== "approved"
  ) {
    throw new Error(
      recipientError?.message ??
        "Unable to identify the receiving Character.",
    );
  }

  if (recipient.is_system === true) {
    return null;
  }

  if (
    !sender.current_room_id ||
    sender.current_room_id !==
      recipient.current_room_id
  ) {
    throw new Error(
      "The receiving Character is no longer in your Location.",
    );
  }

  return {
    supabase,
    user,
    sender,
    recipient,
  };
}

export async function notifyItemGiftReceived({
  recipientCharacterId,
  itemId,
  quantity,
}: {
  recipientCharacterId: string;
  itemId: string;
  quantity: number;
}) {
  const context =
    await getGiftContext(
      recipientCharacterId,
    );

  if (!context) {
    return;
  }

  const safeQuantity =
    Math.max(
      1,
      Math.floor(
        Number(quantity) || 1,
      ),
    );

  const {
    data: item,
    error: itemError,
  } = await context.supabase
    .from("items")
    .select("id, name")
    .eq("id", itemId)
    .maybeSingle();

  if (
    itemError ||
    !item
  ) {
    throw new Error(
      itemError?.message ??
        "Unable to identify the transferred Item.",
    );
  }

  await createTargetedCharacterNotification({
    recipientCharacterId:
      context.recipient.id,
    title:
      "Item received",
    body:
      `${context.sender.display_name} gave you ` +
      `${safeQuantity > 1 ? `${safeQuantity} × ` : ""}${item.name}.`,
    href:
      `/character?tab=inventory&focusItem=${encodeURIComponent(
        item.id,
      )}`,
    sourceType:
      "item_gift",
    sourceId:
      randomUUID(),
    sourceTrigger:
      "received",
    createdByUserId:
      context.user.id,
  });
}

export async function notifyRemnantsGiftReceived({
  recipientCharacterId,
  amount,
}: {
  recipientCharacterId: string;
  amount: number;
}) {
  const context =
    await getGiftContext(
      recipientCharacterId,
    );

  if (!context) {
    return;
  }

  const safeAmount =
    Math.max(
      1,
      Math.floor(
        Number(amount) || 1,
      ),
    );

  await createTargetedCharacterNotification({
    recipientCharacterId:
      context.recipient.id,
    title:
      "Remnants received",
    body:
      `${context.sender.display_name} gave you ` +
      `${safeAmount.toLocaleString("en-GB")} Remnants.`,
    href:
      "/character?tab=ledger",
    sourceType:
      "remnant_gift",
    sourceId:
      randomUUID(),
    sourceTrigger:
      "received",
    createdByUserId:
      context.user.id,
  });
}
'''

    panel_backup = PANEL.with_suffix(
        PANEL.suffix + ".before-gift-notifications"
    )
    browser_backup = BROWSER.with_suffix(
        BROWSER.suffix + ".before-gift-notifications"
    )

    if not panel_backup.exists():
        panel_backup.write_text(
            panel_original,
            encoding="utf-8",
        )

    if not browser_backup.exists():
        browser_backup.write_text(
            browser_original,
            encoding="utf-8",
        )

    PANEL.write_text(panel, encoding="utf-8")
    BROWSER.write_text(browser, encoding="utf-8")
    ACTIONS.write_text(action_source, encoding="utf-8")

    print("Gift notifications patch applied.")
    print()
    print("Give Item:")
    print("  - recipient receives a notification")
    print("  - notification opens own Character Sheet -> Inventory")
    print("  - received Item is focused by stable item_id")
    print("  - category opens, page scrolls to Item, Item is briefly highlighted")
    print()
    print("Give Remnants:")
    print("  - recipient receives a notification")
    print("  - notification opens own Character Sheet -> Ledger")
    print()
    print("NPC/system recipients are skipped.")
    print("No database migration or RPC change is required.")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
