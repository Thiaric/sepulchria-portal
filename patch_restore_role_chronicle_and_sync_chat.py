#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
FORM = ROOT / "app/(portal)/game/components/RoomChatForm.tsx"
ROUTE = ROOT / "app/(portal)/game/export/route.ts"
BAD_UTILITY = ROOT / "lib/game/export-room-chronicle-client.ts"

for p in (FORM, ROUTE):
    if not p.exists():
        raise SystemExit(f"Missing file: {p}")

form = FORM.read_text(encoding="utf-8")
route = ROUTE.read_text(encoding="utf-8")

def apply(which, old, new, label, optional=False):
    global form, route
    text = form if which == "form" else route
    if new and new in text:
        print(f"SKIP  {label} (already patched)")
        return
    if old not in text:
        if optional:
            print(f"SKIP  {label} (not present)")
            return
        raise SystemExit(f"Could not patch {label}. Your local file differs from the expected current state.")
    text = text.replace(old, new, 1)
    if which == "form":
        form = text
    else:
        route = text
    print(f"PATCH {label}")

apply("form", "import {\n  downloadRoomChronicleSnapshot,\n} from \"@/lib/game/export-room-chronicle-client\";\n", "", "remove DOM-snapshot import", True)
apply("form", "        {exportEnabled ? (\n          <button\n            type=\"button\"\n            onClick={() => {\n              void downloadRoomChronicleSnapshot();\n            }}\n            title=\"Download current game session\"\n            aria-label=\"Download current game session\"\n            className=\"flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] text-[11px] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-f0d6a7))]\"\n          >\n            <span className=\"game_components_roomchatform_span_text_15\" aria-hidden=\"true\">\u21e9</span>\n          </button>\n        ) : null}\n", "        {exportEnabled ? (\n          <Link\n            href=\"/game/export\"\n            title=\"Download current game session\"\n            aria-label=\"Download current game session\"\n            className=\"flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] text-[11px] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-f0d6a7))]\"\n          >\n            <span className=\"game_components_roomchatform_span_text_15\" aria-hidden=\"true\">\u21e9</span>\n          </Link>\n        ) : null}\n", "restore /game/export button", True)
apply("route", "type ExportRenderContext = {\n  tagsByCharacterId: Map<string, ExportChatTags>;\n  ordersByCharacterId: Map<string, ExportOrderIdentity>;\n};\n", "type ExportRenderContext = {\n  tagsByCharacterId: Map<string, ExportChatTags>;\n  conditionsByMessageId: Map<string, string[]>;\n  ordersByCharacterId: Map<string, ExportOrderIdentity>;\n  viewerCharacterId: string;\n};\n", "extend export render context", False)
apply("route", "function renderIdentityIcons(\n  author: any,\n  characterId: string,\n  origin: string,\n  context: ExportRenderContext,\n): string {\n", "function renderIdentityIcons(\n  author: any,\n  characterId: string,\n  origin: string,\n  context: ExportRenderContext,\n  isNpc = false,\n): string {\n", "NPC-aware identity icons", False)
apply("route", "  const order =\n    context.ordersByCharacterId.get(characterId) ??\n    null;\n", "  const order =\n    isNpc\n      ? null\n      : context.ordersByCharacterId.get(characterId) ??\n        null;\n", "hide Order icon for NPC", False)
apply("route", "function renderChatTagHeader(\n  characterId: string,\n  context: ExportRenderContext,\n): string {\n  const tags =\n    context.tagsByCharacterId.get(characterId);\n\n  if (!tags) return \"\";\n\n  const groups: string[] = [];\n\n  if (tags.buffs.length) {\n    groups.push(tags.buffs.join(\" - \"));\n  }\n\n  if (tags.debuffs.length) {\n    groups.push(tags.debuffs.join(\" - \"));\n  }\n\n  if (tags.conditions.length) {\n    groups.push(tags.conditions.join(\" - \"));\n  }\n\n  if (tags.prices.length) {\n    groups.push(tags.prices.join(\" - \"));\n  }\n\n  if (!groups.length) return \"\";\n\n  return `<span class=\"character-tags\"> | ${groups\n    .map((group) => escapeHtml(group))\n    .join(\" | \")}</span>`;\n}\n", "function renderChatTagHeader(\n  characterId: string,\n  messageId: string,\n  conditionSnapshot:\n    | { label: string }[]\n    | null\n    | undefined,\n  context: ExportRenderContext,\n): string {\n  const tags =\n    context.tagsByCharacterId.get(characterId);\n\n  const groups: string[] = [];\n\n  if (tags?.buffs.length) {\n    groups.push(tags.buffs.join(\" - \"));\n  }\n\n  if (tags?.debuffs.length) {\n    groups.push(tags.debuffs.join(\" - \"));\n  }\n\n  const snapshotConditions =\n    (conditionSnapshot ?? [])\n      .map((entry) =>\n        String(entry?.label ?? \"\").trim(),\n      )\n      .filter(Boolean);\n\n  const historicalConditions =\n    context.conditionsByMessageId.get(messageId) ??\n    [];\n\n  const conditions = [\n    ...new Set([\n      ...snapshotConditions,\n      ...historicalConditions,\n    ]),\n  ];\n\n  if (conditions.length) {\n    groups.push(conditions.join(\" - \"));\n  }\n\n  if (tags?.prices.length) {\n    groups.push(tags.prices.join(\" - \"));\n  }\n\n  if (!groups.length) return \"\";\n\n  return `<span class=\"character-tags\"> | ${groups\n    .map((group) => escapeHtml(group))\n    .join(\" | \")}</span>`;\n}\n", "per-message Condition tags", False)
apply("route", "  const author =\n    normaliseRelation(\n      message.character,\n    ) as any;\n\n  const recipient =\n", "  const controllerAuthor =\n    normaliseRelation(\n      message.character,\n    ) as any;\n\n  const isNpcMessage =\n    message.speaker_type === \"npc\" &&\n    Boolean(message.npc_snapshot);\n\n  const npcSnapshot =\n    isNpcMessage\n      ? message.npc_snapshot\n      : null;\n\n  const author =\n    npcSnapshot\n      ? {\n          id: npcSnapshot.id,\n          first_name: npcSnapshot.name,\n          display_name: npcSnapshot.name,\n          portrait_url: npcSnapshot.portrait_url,\n          public_slug: null,\n          race: npcSnapshot.race,\n        }\n      : controllerAuthor;\n\n  const recipient =\n", "NPC snapshot author", False)
apply("route", "  const whisperLabel =\n    isWhisper\n      ? `Whisper to ${\n          recipient?.display_name ??\n          \"character\"\n        }`\n      : \"\";\n", "  const isSender =\n    !isNpcMessage &&\n    characterId ===\n      context.viewerCharacterId;\n\n  const isRecipient =\n    message.whisper_recipient_character_id ===\n    context.viewerCharacterId;\n\n  const whisperLabel =\n    isWhisper\n      ? isSender\n        ? `Whisper to ${\n            recipient?.display_name ??\n            \"character\"\n          }`\n        : isRecipient\n          ? \"Whisper to you\"\n          : `Whisper to ${\n              recipient?.display_name ??\n              \"character\"\n            }`\n      : \"\";\n", "live-style whisper label", False)
apply("route", "          ${renderIdentityIcons(\n            author,\n            characterId,\n            origin,\n            context,\n          )}\n", "          ${renderIdentityIcons(\n            author,\n            characterId,\n            origin,\n            context,\n            isNpcMessage,\n          )}\n", "NPC identity rendering", False)
apply("route", "          </span>${renderChatTagHeader(\n            characterId,\n            context,\n          )}\n", "          </span>${\n            isNpcMessage\n              ? `<span class=\"npc-label\"> NPC</span>`\n              : \"\"\n          }${renderChatTagHeader(\n            characterId,\n            message.id,\n            message.condition_snapshot,\n            context,\n          )}\n", "message-specific tags + NPC label", False)
apply("route", "        whisper_recipient_character_id,\n        created_at,\n        character_id,\n", "        whisper_recipient_character_id,\n        condition_snapshot,\n        speaker_type,\n        npc_id,\n        npc_snapshot,\n        created_at,\n        character_id,\n", "load snapshot/NPC fields", False)
apply("route", "  const tagsByCharacterId =\n    new Map<string, ExportChatTags>();\n\n  const ordersByCharacterId =\n", "  const tagsByCharacterId =\n    new Map<string, ExportChatTags>();\n\n  const conditionsByMessageId =\n    new Map<string, string[]>();\n\n  const ordersByCharacterId =\n", "historical conditions map", False)
apply("route", "            conditions:\n              row.conditions ?? [],\n", "            conditions: [],\n", "disable retroactive current Shape conditions", False)
apply("route", "  const renderContext:\n    ExportRenderContext = {\n      tagsByCharacterId,\n      ordersByCharacterId,\n    };\n", "  if (messages.length) {\n    const {\n      data: historicalConditionRows,\n      error: historicalConditionError,\n    } = await supabase.rpc(\n      \"get_room_message_effect_conditions\",\n      {\n        p_message_ids:\n          messages.map(\n            (message) => message.id,\n          ),\n      },\n    );\n\n    if (historicalConditionError) {\n      console.error(\n        \"Unable to load historical message Conditions for export:\",\n        historicalConditionError.message,\n      );\n    } else {\n      for (\n        const row of\n          historicalConditionRows ?? []\n      ) {\n        const messageId =\n          String(row.message_id ?? \"\");\n\n        if (!messageId) {\n          continue;\n        }\n\n        conditionsByMessageId.set(\n          messageId,\n          Array.isArray(row.conditions)\n            ? row.conditions\n                .map((value: unknown) =>\n                  String(value).trim(),\n                )\n                .filter(Boolean)\n            : [],\n        );\n      }\n    }\n  }\n\n  const renderContext:\n    ExportRenderContext = {\n      tagsByCharacterId,\n      conditionsByMessageId,\n      ordersByCharacterId,\n      viewerCharacterId:\n        character.id,\n    };\n", "load historical Conditions into export", False)
apply("route", "        messages\n          .map((message) =>\n            normaliseRelation(\n              message.character,\n            )?.display_name?.trim(),\n          )\n", "        messages\n          .map((message) =>\n            message.speaker_type === \"npc\" &&\n            message.npc_snapshot\n              ? message.npc_snapshot.name?.trim()\n              : normaliseRelation(\n                  message.character,\n                )?.display_name?.trim(),\n          )\n", "include NPCs in participant snapshot", False)
apply("route", "    .character-tags {\n      color: #b99765;\n      font-size: 9px;\n      letter-spacing: 0.04em;\n      text-transform: uppercase;\n    }\n", "    .character-tags {\n      color: #b99765;\n      font-size: 9px;\n      letter-spacing: 0.04em;\n      text-transform: uppercase;\n    }\n\n    .npc-label {\n      margin-left: 5px;\n      color: #8f8170;\n      font-size: 7px;\n      letter-spacing: 0.12em;\n      text-transform: uppercase;\n    }\n", "NPC label styling", False)

FORM.write_text(form, encoding="utf-8")
ROUTE.write_text(route, encoding="utf-8")
print(f"WRITE {FORM}")
print(f"WRITE {ROUTE}")

if BAD_UTILITY.exists():
    BAD_UTILITY.unlink()
    print(f"DELETE {BAD_UTILITY}")

print()
print("DONE")
print("Run: npm run build")
