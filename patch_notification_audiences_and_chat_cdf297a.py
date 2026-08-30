from pathlib import Path

BASE = "cdf297a"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}. Expected {BASE}.")
    return text.replace(old, new, 1)

new_path = Path("components/notifications/admin-notification-audience-fields.tsx")
if new_path.exists():
    raise SystemExit("admin-notification-audience-fields.tsx already exists.")
new_text = '"use client";\n\nimport {\n  useState,\n} from "react";\n\ntype Option = {\n  id: string;\n  name: string;\n};\n\ntype CharacterOption = {\n  id: string;\n  display_name: string;\n};\n\ntype Props = {\n  initialType: string;\n  initialTargetId: string | null;\n  characters: CharacterOption[];\n  ancestries: Option[];\n  associations: Option[];\n  orders: Option[];\n};\n\nexport function AdminNotificationAudienceFields({\n  initialType,\n  initialTargetId,\n  characters,\n  ancestries,\n  associations,\n  orders,\n}: Props) {\n  const [targetType, setTargetType] =\n    useState(initialType);\n\n  const [characterId, setCharacterId] =\n    useState(\n      initialType === "character"\n        ? initialTargetId ?? ""\n        : "",\n    );\n\n  const [ancestryId, setAncestryId] =\n    useState(\n      initialType === "ancestry"\n        ? initialTargetId ?? ""\n        : "",\n    );\n\n  const [\n    associationId,\n    setAssociationId,\n  ] = useState(\n    initialType === "association"\n      ? initialTargetId ?? ""\n      : "",\n  );\n\n  const [orderId, setOrderId] =\n    useState(\n      initialType === "order"\n        ? initialTargetId ?? ""\n        : "",\n    );\n\n  const [userId, setUserId] =\n    useState(\n      initialType === "user"\n        ? initialTargetId ?? ""\n        : "",\n    );\n\n  function changeAudience(\n    next: string,\n  ) {\n    setTargetType(next);\n\n    if (next !== "character") {\n      setCharacterId("");\n    }\n\n    if (next !== "ancestry") {\n      setAncestryId("");\n    }\n\n    if (next !== "association") {\n      setAssociationId("");\n    }\n\n    if (next !== "order") {\n      setOrderId("");\n    }\n\n    if (next !== "user") {\n      setUserId("");\n    }\n  }\n\n  const selectClass =\n    "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] disabled:cursor-not-allowed disabled:opacity-35";\n\n  return (\n    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">\n      <label>\n        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Audience\n        </span>\n\n        <select\n          name="targetType"\n          value={targetType}\n          onChange={(event) =>\n            changeAudience(\n              event.target.value,\n            )\n          }\n          className={selectClass}\n        >\n          <option value="global">\n            Everyone\n          </option>\n\n          <option value="staff">\n            Staff only\n          </option>\n\n          <option value="character">\n            Specific character\n          </option>\n\n          <option value="ancestry">\n            Ancestry\n          </option>\n\n          <option value="association">\n            Association\n          </option>\n\n          <option value="order">\n            Order\n          </option>\n\n          <option value="user">\n            Specific user ID\n          </option>\n        </select>\n      </label>\n\n      <label>\n        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Character target\n        </span>\n\n        <select\n          name="characterTargetId"\n          value={characterId}\n          disabled={\n            targetType !==\n            "character"\n          }\n          onChange={(event) =>\n            setCharacterId(\n              event.target.value,\n            )\n          }\n          className={selectClass}\n        >\n          <option value="">\n            None\n          </option>\n\n          {characters.map(\n            (character) => (\n              <option\n                key={character.id}\n                value={character.id}\n              >\n                {\n                  character.display_name\n                }\n              </option>\n            ),\n          )}\n        </select>\n      </label>\n\n      <label>\n        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Ancestry target\n        </span>\n\n        <select\n          name="ancestryTargetId"\n          value={ancestryId}\n          disabled={\n            targetType !==\n            "ancestry"\n          }\n          onChange={(event) =>\n            setAncestryId(\n              event.target.value,\n            )\n          }\n          className={selectClass}\n        >\n          <option value="">\n            None\n          </option>\n\n          {ancestries.map(\n            (ancestry) => (\n              <option\n                key={ancestry.id}\n                value={ancestry.id}\n              >\n                {ancestry.name}\n              </option>\n            ),\n          )}\n        </select>\n      </label>\n\n      <label>\n        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Association target\n        </span>\n\n        <select\n          name="associationTargetId"\n          value={associationId}\n          disabled={\n            targetType !==\n            "association"\n          }\n          onChange={(event) =>\n            setAssociationId(\n              event.target.value,\n            )\n          }\n          className={selectClass}\n        >\n          <option value="">\n            None\n          </option>\n\n          {associations.map(\n            (association) => (\n              <option\n                key={association.id}\n                value={\n                  association.id\n                }\n              >\n                {association.name}\n              </option>\n            ),\n          )}\n        </select>\n      </label>\n\n      <label>\n        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Order target\n        </span>\n\n        <select\n          name="orderTargetId"\n          value={orderId}\n          disabled={\n            targetType !== "order"\n          }\n          onChange={(event) =>\n            setOrderId(\n              event.target.value,\n            )\n          }\n          className={selectClass}\n        >\n          <option value="">\n            None\n          </option>\n\n          {orders.map((order) => (\n            <option\n              key={order.id}\n              value={order.id}\n            >\n              {order.name}\n            </option>\n          ))}\n        </select>\n      </label>\n\n      <label>\n        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          User UUID\n        </span>\n\n        <input\n          name="userTargetId"\n          value={userId}\n          disabled={\n            targetType !== "user"\n          }\n          onChange={(event) =>\n            setUserId(\n              event.target.value,\n            )\n          }\n          placeholder={\n            targetType === "user"\n              ? "User UUID"\n              : "None"\n          }\n          className={selectClass}\n        />\n      </label>\n    </div>\n  );\n}\n'

files = {}
path = 'app/(portal)/admin/notifications/actions.ts'
text = files.get(path, read(path))
text = replace_once(text, '  if (!["global", "staff", "user", "character"].includes(targetType)) {\n    throw new Error("Audience is invalid.");\n  }\n\n  if (targetType === "global" || targetType === "staff") {\n    return { targetType, targetId: null };\n  }\n\n  const raw =\n    targetType === "character"\n      ? text(formData, "characterTargetId", false)\n      : text(formData, "userTargetId", false);\n\n  return {\n    targetType,\n    targetId: uuid(raw, targetType === "character" ? "Character" : "User"),\n  };', '  if (\n    ![\n      "global",\n      "staff",\n      "user",\n      "character",\n      "ancestry",\n      "association",\n      "order",\n    ].includes(targetType)\n  ) {\n    throw new Error("Audience is invalid.");\n  }\n\n  if (\n    targetType === "global" ||\n    targetType === "staff"\n  ) {\n    return {\n      targetType,\n      targetId: null,\n    };\n  }\n\n  const fields: Record<\n    string,\n    {\n      field: string;\n      label: string;\n    }\n  > = {\n    character: {\n      field: "characterTargetId",\n      label: "Character",\n    },\n    ancestry: {\n      field: "ancestryTargetId",\n      label: "Ancestry",\n    },\n    association: {\n      field: "associationTargetId",\n      label: "Association",\n    },\n    order: {\n      field: "orderTargetId",\n      label: "Order",\n    },\n    user: {\n      field: "userTargetId",\n      label: "User",\n    },\n  };\n\n  const definition =\n    fields[targetType];\n\n  const raw = text(\n    formData,\n    definition.field,\n    false,\n  );\n\n  return {\n    targetType,\n    targetId: uuid(\n      raw,\n      definition.label,\n    ),\n  };', 'Expand notification audience action')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import { createAdminClient } from "@/lib/supabase/admin";', 'import { createAdminClient } from "@/lib/supabase/admin";\nimport { AdminNotificationAudienceFields } from "@/components/notifications/admin-notification-audience-fields";', 'Audience component import')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'type CharacterOption = {\n  id: string;\n  display_name: string;\n};', 'type CharacterOption = {\n  id: string;\n  display_name: string;\n};\n\ntype NamedOption = {\n  id: string;\n  name: string;\n};', 'Named option type')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'function Fields({\n  notification,\n  characters,\n}: {\n  notification?: NotificationRow;\n  characters: CharacterOption[];\n}) {', 'function Fields({\n  notification,\n  characters,\n  ancestries,\n  associations,\n  orders,\n}: {\n  notification?: NotificationRow;\n  characters: CharacterOption[];\n  ancestries: NamedOption[];\n  associations: NamedOption[];\n  orders: NamedOption[];\n}) {', 'Fields props expansion')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '      <div className="grid gap-3 md:grid-cols-3">\n        <label>\n          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Audience</span>\n          <select\n            name="targetType"\n            defaultValue={target.target_type}\n            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"\n          >\n            <option value="global">Everyone</option>\n            <option value="staff">Staff only</option>\n            <option value="character">Specific character</option>\n            <option value="user">Specific user ID</option>\n          </select>\n        </label>\n\n        <label>\n          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Character target</span>\n          <select\n            name="characterTargetId"\n            defaultValue={target.target_type === "character" ? target.target_id ?? "" : ""}\n            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"\n          >\n            <option value="">None</option>\n            {characters.map((character) => (\n              <option key={character.id} value={character.id}>{character.display_name}</option>\n            ))}\n          </select>\n        </label>\n\n        <label>\n          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">User UUID</span>\n          <input\n            name="userTargetId"\n            defaultValue={target.target_type === "user" ? target.target_id ?? "" : ""}\n            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"\n          />\n        </label>\n      </div>', '      <AdminNotificationAudienceFields\n        initialType={target.target_type}\n        initialTargetId={target.target_id}\n        characters={characters}\n        ancestries={ancestries}\n        associations={associations}\n        orders={orders}\n      />', 'Replace audience fields')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const [notificationsResult, charactersResult] = await Promise.all([\n    admin\n      .from("notifications")\n      .select("id, type, title, body, href, starts_at, expires_at, expires_game_at, source_type, source_id, source_trigger, is_automatic, staff_overridden, is_active, created_at, notification_targets(target_type, target_id)")\n      .order("created_at", { ascending: false }),\n    admin\n      .from("characters")\n      .select("id, display_name")\n      .eq("is_system", false)\n      .order("display_name", { ascending: true }),\n  ]);', '  const [\n    notificationsResult,\n    charactersResult,\n    ancestriesResult,\n    associationsResult,\n    ordersResult,\n  ] = await Promise.all([\n    admin\n      .from("notifications")\n      .select("id, type, title, body, href, starts_at, expires_at, expires_game_at, source_type, source_id, source_trigger, is_automatic, staff_overridden, is_active, created_at, notification_targets(target_type, target_id)")\n      .or(\n        "is_automatic.eq.false,source_type.eq.event",\n      )\n      .order("created_at", {\n        ascending: false,\n      }),\n    admin\n      .from("characters")\n      .select("id, display_name")\n      .eq("is_system", false)\n      .order("display_name", {\n        ascending: true,\n      }),\n    admin\n      .from("races")\n      .select("id, name")\n      .order("name", {\n        ascending: true,\n      }),\n    admin\n      .from("associations")\n      .select("id, name")\n      .order("name", {\n        ascending: true,\n      }),\n    admin\n      .from("orders")\n      .select("id, name")\n      .order("name", {\n        ascending: true,\n      }),\n  ]);', 'Admin notification query expansion')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  if (charactersResult.error) {\n    throw new Error(`Unable to load characters: ${charactersResult.error.message}`);\n  }\n\n  const notifications = (notificationsResult.data ?? []) as NotificationRow[];\n  const characters = (charactersResult.data ?? []) as CharacterOption[];', '  if (charactersResult.error) {\n    throw new Error(`Unable to load characters: ${charactersResult.error.message}`);\n  }\n\n  if (ancestriesResult.error) {\n    throw new Error(`Unable to load Ancestries: ${ancestriesResult.error.message}`);\n  }\n\n  if (associationsResult.error) {\n    throw new Error(`Unable to load Associations: ${associationsResult.error.message}`);\n  }\n\n  if (ordersResult.error) {\n    throw new Error(`Unable to load Orders: ${ordersResult.error.message}`);\n  }\n\n  const notifications = (notificationsResult.data ?? []) as NotificationRow[];\n  const characters = (charactersResult.data ?? []) as CharacterOption[];\n  const ancestries = (ancestriesResult.data ?? []) as NamedOption[];\n  const associations = (associationsResult.data ?? []) as NamedOption[];\n  const orders = (ordersResult.data ?? []) as NamedOption[];', 'Admin notification option results')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '          <Fields characters={characters} />', '          <Fields\n            characters={characters}\n            ancestries={ancestries}\n            associations={associations}\n            orders={orders}\n          />', 'Create fields options')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  <Fields notification={notification} characters={characters} />', '                  <Fields\n                    notification={notification}\n                    characters={characters}\n                    ancestries={ancestries}\n                    associations={associations}\n                    orders={orders}\n                  />', 'Edit fields options')
files[path] = text

path = 'app/(portal)/admin/notifications/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '        <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">All Notifications · {notifications.length}</h2>', '        <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">\n          Managed Notifications · {notifications.length}\n        </h2>\n        <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-756958))]">\n          Manual notices and automatic Event notices only. Player-specific automatic activity remains out of this catalogue.\n        </p>', 'Admin catalogue heading')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const [\n    messageState,\n    messageAction,\n    messagePending,\n  ] = useActionState(\n    sendRoomMessage,\n    initialState,\n  );', '  const [\n    messageState,\n    messageAction,\n  ] = useActionState(\n    sendRoomMessage,\n    initialState,\n  );', 'Remove chat pending lock')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '              required\n              disabled={messagePending}\n              maxLength={CHAT_MAX_LENGTH}', '              required\n              maxLength={CHAT_MAX_LENGTH}', 'Main textarea immediately reusable')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '              required\n              disabled={messagePending}\n              maxLength={CHAT_MAX_LENGTH}\n              value={value}\n              onKeyDown={(event) => {', '              required\n              maxLength={CHAT_MAX_LENGTH}\n              value={value}\n              onKeyDown={(event) => {', 'Whisper textarea immediately reusable')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    setValue("");\n    setWhisperRecipientId("");\n    setMessageNonce(\n      crypto.randomUUID(),\n    );\n\n    textareaRef.current?.focus();', '    // The sent text was already cleared optimistically on submit.\n    // Do not clear again here: the player may already be writing\n    // their next action while the previous server request finishes.\n    setMessageNonce(\n      crypto.randomUUID(),\n    );\n\n    textareaRef.current?.focus();', 'Preserve next chat draft')
files[path] = text

# Write only after all matchers succeed.
new_path.parent.mkdir(parents=True, exist_ok=True)
new_path.write_text(new_text, encoding="utf-8")
print("✓", str(new_path))

for path, text in files.items():
    Path(path).write_text(text, encoding="utf-8")
    print("✓", path)

print("\ncdf297a notification audiences + faster chat installed.")
print("Run the SQL first, then npm run build.")
