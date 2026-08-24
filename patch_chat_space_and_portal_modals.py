from pathlib import Path
import subprocess, sys, shutil, re

EXPECTED_HEAD = "39953f1"
ROOT = Path.cwd()

def fail(msg):
    print(f"\nERROR: {msg}")
    sys.exit(1)

def load(rel):
    p = ROOT / rel
    if not p.exists(): fail(f"Missing file: {rel}")
    return p, p.read_text(encoding="utf-8")

def save(p, text):
    b = p.with_suffix(p.suffix + ".before-chat-modal-redesign.bak")
    if not b.exists(): shutil.copy2(p, b)
    p.write_text(text, encoding="utf-8")
    print(f"Patched: {p.relative_to(ROOT)}")

def rep(text, old, new, label):
    n = text.count(old)
    if n != 1: fail(f"{label}: expected 1 exact match, found {n}")
    return text.replace(old, new, 1)

head = subprocess.check_output(["git","rev-parse","--short","HEAD"], cwd=ROOT, text=True).strip()
if not head.startswith(EXPECTED_HEAD):
    fail(f"Patch prepared for {EXPECTED_HEAD}; current HEAD is {head}")

# 1) Generic modal event button
p = ROOT / "components/portal/portal-modal-button.tsx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text('''"use client";\n\nimport type { ButtonHTMLAttributes, ReactNode } from "react";\n\nexport type PortalModalPayload = {\n  label: string;\n  title: string;\n  icon: string;\n  href: string;\n};\n\nexport function openPortalModal(payload: PortalModalPayload) {\n  window.dispatchEvent(\n    new CustomEvent("sepulchria:open-public-modal", { detail: payload }),\n  );\n}\n\nexport function PortalModalButton({ payload, children, ...props }: {\n  payload: PortalModalPayload;\n  children: ReactNode;\n} & ButtonHTMLAttributes<HTMLButtonElement>) {\n  return (\n    <button\n      type="button"\n      {...props}\n      onClick={(event) => {\n        props.onClick?.(event);\n        if (!event.defaultPrevented) openPortalModal(payload);\n      }}\n    >\n      {children}\n    </button>\n  );\n}\n''', encoding="utf-8")
print("Created: components/portal/portal-modal-button.tsx")

# 2) Sidebar modal flags + fullscreen + external event
sp, s = load("components/portal/portal-sidebar.tsx")

s = rep(s, '    href: "/characters",\n    activePaths: ["/characters"],\n  },', '    href: "/characters",\n    activePaths: ["/characters"],\n    opensModal: true,\n  },', "characters modal")

for href in ["/ancestries","/associations","/orders","/warping","/feats"]:
    pattern = re.compile(r'(href: "' + re.escape(href) + r'",\n\s*activePaths: \[[^\n]*\],)(?!\n\s*opensModal:)')
    s, n = pattern.subn(r'\1\n    opensModal: true,', s, count=1)
    if n != 1: fail(f"modal flag {href}: found {n}")

for href in ["/market","/friends","/messages"]:
    pattern = re.compile(r'(href: "' + re.escape(href) + r'",\n\s*activePaths: \[[^\n]*\],)(?!\n\s*opensModal:)')
    s, n = pattern.subn(r'\1\n  opensModal: true,', s, count=1)
    if n != 1: fail(f"modal flag {href}: found {n}")

forum_def = '''const forumItem: NavigationItem = {\n  label: "Forum",\n  title:\n    "Open the Sepulchria community forum.",\n  icon: "/icons/forum.png",\n  href: "/forum",\n  activePaths: ["/forum"],\n  opensModal: true,\n};\n\n'''
s = rep(s, 'const communityRulesItem: NavigationItem = {', forum_def + 'const communityRulesItem: NavigationItem = {', "forum item")

helper_anchor = '  function renderNavigationItem(\n    item: NavigationItem,\n  ) {'
helper = '''  async function openModalItem(\n    item: NavigationItem,\n  ) {\n    setModalItem(item);\n\n    try {\n      if (\n        !document.fullscreenElement &&\n        document.documentElement.requestFullscreen\n      ) {\n        await document.documentElement.requestFullscreen();\n      }\n    } catch {\n      // Fullscreen is optional; the modal still opens if the browser refuses it.\n    }\n  }\n\n  useEffect(() => {\n    function handleExternalModalOpen(event: Event) {\n      const detail = (event as CustomEvent<{\n        label: string;\n        title: string;\n        icon: string;\n        href: string;\n      }>).detail;\n\n      if (!detail?.href) return;\n\n      void openModalItem({\n        ...detail,\n        activePaths: [detail.href.split("?")[0]],\n        opensModal: true,\n      });\n    }\n\n    window.addEventListener(\n      "sepulchria:open-public-modal",\n      handleExternalModalOpen,\n    );\n\n    return () => {\n      window.removeEventListener(\n        "sepulchria:open-public-modal",\n        handleExternalModalOpen,\n      );\n    };\n  }, []);\n\n'''
s = rep(s, helper_anchor, helper + helper_anchor, "modal helper")

# Generic modal item clickers
s = s.replace('''onClick={() =>\n            setModalItem(\n              item,\n            )\n          }''', '''onClick={() =>\n            void openModalItem(item)\n          }''')
s = s.replace('''onClick={() =>\n          setModalItem(\n            rulesItem,\n          )\n        }''', '''onClick={() =>\n          void openModalItem(rulesItem)\n        }''')
s = s.replace('''onClick={() =>\n          setModalItem(\n            glossaryItem,\n          )\n        }''', '''onClick={() =>\n          void openModalItem(glossaryItem)\n        }''')

# Desktop Forum: modal row instead of embedded submenu row
s = rep(s, '''                <ForumSidebarMenu\n                  unreadCount={\n                    currentUnreadForumCount\n                  }\n                />''', '''                {renderNavigationItem(\n                  forumItem,\n                )}''', "desktop forum")

# Mobile Forum main button
s = rep(s, '''      <Link\n        href="/forum"\n        title="Forum"\n        aria-label="Forum"\n        className="relative flex min-w-0 flex-1 items-center justify-center"\n      >''', '''      <button\n        type="button"\n        title="Forum"\n        aria-label="Forum"\n        onClick={() =>\n          void openModalItem(forumItem)\n        }\n        className="relative flex min-w-0 flex-1 items-center justify-center"\n      >''', "mobile forum open")
mobile_forum_start = s.find('onClick={() =>\n          void openModalItem(forumItem)')
mobile_forum_plus = s.find('setMobileForumExpanded(', mobile_forum_start)
close_link = s.rfind('</Link>', mobile_forum_start, mobile_forum_plus)
if close_link < 0: fail("mobile forum closing Link")
s = s[:close_link] + '</button>' + s[close_link+len('</Link>'):]

s = rep(s, '''          onClose={() =>\n            setModalItem(null)\n          }''', '''          onClose={() => {\n            setModalItem(null);\n            if (document.fullscreenElement) {\n              void document.exitFullscreen();\n            }\n          }}''', "modal close fullscreen")
s = rep(s, 'className="flex h-[85vh] w-[90vw] max-w-[1700px] flex-col overflow-hidden border', 'className="flex h-[96vh] w-[97vw] max-w-[1900px] flex-col overflow-hidden border', "modal dimensions")
save(sp, s)

# 3) Header envelope opens modal
hp, h = load("components/portal/portal-header.tsx")
h = rep(h, 'import { WorldIndicator } from "@/components/world/world-indicator";', 'import { WorldIndicator } from "@/components/world/world-indicator";\nimport { PortalModalButton } from "@/components/portal/portal-modal-button";', "header modal import")
h = rep(h, '''            <Link\n              href="/messages"\n              aria-label={`${unreadMessageCount} unread messages`}\n              className="relative flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-base text-[rgb(var(--sep-colour-c69b5c))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 2xl:text-lg"\n            >\n              ✉\n              <UnreadMessageBadge initialCount={unreadMessageCount} variant="floating" />\n            </Link>''', '''            <PortalModalButton\n              payload={{\n                label: "Messages",\n                title: "Open your private conversations with other characters.",\n                icon: "/icons/messages.png",\n                href: "/messages",\n              }}\n              aria-label={`${unreadMessageCount} unread messages`}\n              className="relative flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-base text-[rgb(var(--sep-colour-c69b5c))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 2xl:text-lg"\n            >\n              ✉\n              <UnreadMessageBadge initialCount={unreadMessageCount} variant="floating" />\n            </PortalModalButton>''', "header envelope")
save(hp, h)

# 4) /game remove top bar and pass controls to chat form
gp, g = load("app/(portal)/game/page.tsx")
g = g.replace('import Link from "next/link";\n', '')
start = g.find('  <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border')
end = g.find('  <article\n', start)
if start < 0 or end < 0: fail("game top bar location")
g = g[:start] + g[end:]
g = rep(g, '''          canUseFate={canUseFate}\n        />''', '''          canUseFate={canUseFate}\n          exportEnabled={room.chat_enabled}\n          backHref={\n            roomArea\n              ? roomArea.slug === "private-locations"\n                ? "/private-locations"\n                : `/areas/${roomArea.slug}`\n              : null\n          }\n          backLabel={\n            roomArea\n              ? roomArea.slug === "private-locations"\n                ? "Private Locations"\n                : roomArea.name\n              : null\n          }\n          canTakeLeave={room.chat_enabled}\n          headquartersManageControl={\n            headquartersManageData ? (\n              <OrderHeadquartersManageMenu\n                data={headquartersManageData}\n              />\n            ) : null\n          }\n        />''', "game chat props")
save(gp, g)

# 5) RoomChatForm rows selector and compact location controls
fp, f = load("app/(portal)/game/components/RoomChatForm.tsx")
f = rep(f, 'import { useRouter } from "next/navigation";', 'import { useRouter } from "next/navigation";\nimport Link from "next/link";\nimport type { ReactNode } from "react";', "form imports")
f = rep(f, '  sendRoomMessage,\n} from "../actions";', '  sendRoomMessage,\n  leaveCurrentRoom,\n} from "../actions";', "leave import")
f = rep(f, '''  presentCharacters,\n  canUseFate,\n}: {\n  attributes: CharacterAttributes;\n  attributeBreakdown: AttributeBreakdown;\n  gifts: ChatGift[];\n  items: ChatItem[];\n  presentCharacters: PresentRoomCharacter[];\n  canUseFate: boolean;\n}) {''', '''  presentCharacters,\n  canUseFate,\n  exportEnabled,\n  backHref,\n  backLabel,\n  canTakeLeave,\n  headquartersManageControl,\n}: {\n  attributes: CharacterAttributes;\n  attributeBreakdown: AttributeBreakdown;\n  gifts: ChatGift[];\n  items: ChatItem[];\n  presentCharacters: PresentRoomCharacter[];\n  canUseFate: boolean;\n  exportEnabled: boolean;\n  backHref: string | null;\n  backLabel: string | null;\n  canTakeLeave: boolean;\n  headquartersManageControl?: ReactNode;\n}) {''', "form props")
anchor = '''  const [\n    textareaScrollTop,\n    setTextareaScrollTop,\n  ] = useState(0);'''
f = rep(f, anchor, anchor + '''\n\n  const [textareaRows, setTextareaRows] =\n    useState<1 | 2 | 3 | 4>(2);\n\n  const textareaHeight =\n    textareaRows * 20 + 16;''', "row state")
f = rep(f, '          <div className="relative h-[100px] overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0f0c09))] transition focus-within:border-[rgb(var(--sep-colour-927047))]">', '''          <div\n            className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0f0c09))] transition focus-within:border-[rgb(var(--sep-colour-927047))]"\n            style={{ height: `${textareaHeight}px` }}\n          >''', "main textarea")
f = rep(f, '          <div className="mt-3 h-24 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0f0c09))]">', '''          <div\n            className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0f0c09))]"\n            style={{ height: `${textareaHeight}px` }}\n          >''', "whisper textarea")
selector_anchor = '              <p className="shrink-0 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-685d50))]">'
selector = '''              <label className="flex shrink-0 items-center gap-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-685d50))]">\n                <span>Rows</span>\n                <select\n                  value={textareaRows}\n                  onChange={(event) =>\n                    setTextareaRows(Number(event.target.value) as 1 | 2 | 3 | 4)\n                  }\n                  className="h-5 border border-[rgb(var(--sep-colour-5f4930))] bg-[rgb(var(--sep-colour-100c09))] px-1 text-[8px] text-[rgb(var(--sep-colour-bda77f))] outline-none"\n                  aria-label="Textarea rows"\n                >\n                  {[1, 2, 3, 4].map((rows) => (\n                    <option key={rows} value={rows}>{rows}</option>\n                  ))}\n                </select>\n              </label>\n\n'''
f = rep(f, selector_anchor, selector + selector_anchor, "rows selector")
f = rep(f, '      <div className="-mt-9 mx-[105px] flex flex-wrap justify-center gap-1.5 border-0 pt-0 max-lg:mx-0 max-lg:mt-2 max-lg:border-t max-lg:border-[rgb(var(--sep-colour-59432c))]/30 max-lg:pt-2">', '      <div className="-mt-8 mx-[92px] flex flex-wrap justify-center gap-1 border-0 pt-0 max-lg:mx-0 max-lg:mt-2 max-lg:border-t max-lg:border-[rgb(var(--sep-colour-59432c))]/30 max-lg:pt-2">', "utility row")
end_marker = '''        >\n          Item Exchange\n        </button>\n      </div>'''
controls = '''        >\n          Item Exchange\n        </button>\n\n        {headquartersManageControl}\n\n        {exportEnabled ? (\n          <Link\n            href="/game/export"\n            title="Download current game session"\n            aria-label="Download current game session"\n            className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] text-[11px] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-f0d6a7))]"\n          >\n            <span aria-hidden="true">⇩</span>\n          </Link>\n        ) : null}\n\n        {backHref ? (\n          <Link\n            href={backHref}\n            title={`Back to ${backLabel ?? "area"}`}\n            aria-label={`Back to ${backLabel ?? "area"}`}\n            className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] p-1"\n          >\n            <img src="/icons/play.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />\n          </Link>\n        ) : null}\n\n        {canTakeLeave ? (\n          <form action={leaveCurrentRoom}>\n            <button\n              type="submit"\n              title="Take Leave"\n              aria-label="Take Leave"\n              className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-8f3f36))] bg-[rgb(var(--sep-colour-351714))] text-[11px] text-[rgb(var(--sep-colour-e6a097))] transition hover:border-[rgb(var(--sep-colour-c65a4d))] hover:text-[rgb(var(--sep-colour-ffd0c9))]"\n            >\n              <span aria-hidden="true">↪</span>\n            </button>\n          </form>\n        ) : null}\n      </div>'''
f = rep(f, end_marker, controls, "bottom controls")
save(fp, f)

# 6) Modal conversation server action
ap, a = load("app/(portal)/messages/actions.ts")
old = '''export async function startConversation(formData: FormData): Promise<void> {\n  const recipientId = String(formData.get("recipientId") ?? "").trim();\n  if (!recipientId) throw new Error("Missing recipient.");\n\n  const { supabase, character } = await getContext();\n  if (recipientId === character.id) throw new Error("You cannot message yourself.");\n\n  await assertCurrentUserCan(\n    supabase,\n    "communication",\n  );\n\n  const { data: conversationId, error } = await supabase.rpc(\n    "start_direct_conversation",\n    { recipient_character_id: recipientId },\n  );\n\n  if (error) throw new Error(error.message);\n  if (!conversationId) throw new Error("The conversation could not be created.");\n\n  await supabase\n    .from("direct_conversation_participants")\n    .update({ deleted_at: null })\n    .eq("conversation_id", conversationId)\n    .eq("character_id", character.id);\n\n  redirect(`/messages/${conversationId}`);\n}'''
new = '''async function resolveConversationUrl(recipientId: string): Promise<string> {\n  if (!recipientId) throw new Error("Missing recipient.");\n\n  const { supabase, character } = await getContext();\n  if (recipientId === character.id) throw new Error("You cannot message yourself.");\n\n  await assertCurrentUserCan(supabase, "communication");\n\n  const { data: conversationId, error } = await supabase.rpc(\n    "start_direct_conversation",\n    { recipient_character_id: recipientId },\n  );\n\n  if (error) throw new Error(error.message);\n  if (!conversationId) throw new Error("The conversation could not be created.");\n\n  await supabase\n    .from("direct_conversation_participants")\n    .update({ deleted_at: null })\n    .eq("conversation_id", conversationId)\n    .eq("character_id", character.id);\n\n  return `/messages/${conversationId}`;\n}\n\nexport async function startConversationForModal(recipientId: string): Promise<string> {\n  return resolveConversationUrl(recipientId.trim());\n}\n\nexport async function startConversation(formData: FormData): Promise<void> {\n  const recipientId = String(formData.get("recipientId") ?? "").trim();\n  redirect(await resolveConversationUrl(recipientId));\n}'''
a = rep(a, old, new, "conversation helper")
save(ap, a)

# 7) Reusable character envelope modal button
mb = ROOT / "components/messages/message-character-modal-button.tsx"
mb.write_text('''"use client";\n\nimport { useState } from "react";\nimport { startConversationForModal } from "@/app/(portal)/messages/actions";\nimport { openPortalModal } from "@/components/portal/portal-modal-button";\n\nexport function MessageCharacterModalButton({ recipientId, recipientName, className }: {\n  recipientId: string;\n  recipientName: string;\n  className: string;\n}) {\n  const [pending, setPending] = useState(false);\n\n  return (\n    <button\n      type="button"\n      disabled={pending}\n      aria-label={`Send a private message to ${recipientName}`}\n      title={`Message ${recipientName}`}\n      className={className}\n      onClick={async () => {\n        if (pending) return;\n        setPending(true);\n        try {\n          const href = await startConversationForModal(recipientId);\n          openPortalModal({\n            label: `Messages — ${recipientName}`,\n            title: `Private conversation with ${recipientName}`,\n            icon: "/icons/messages.png",\n            href,\n          });\n        } finally {\n          setPending(false);\n        }\n      }}\n    >\n      <span aria-hidden="true">✉</span>\n    </button>\n  );\n}\n''', encoding="utf-8")
print("Created: components/messages/message-character-modal-button.tsx")

# Character directory envelope
cp, c = load("components/characters/character-directory.tsx")
c = c.replace('''import {\n  startConversation,\n} from "@/app/(portal)/messages/actions";\n''', 'import { MessageCharacterModalButton } from "@/components/messages/message-character-modal-button";\n')
pat = re.compile(r'<form\s+action=\{\s*startConversation\s*\}\s*>\s*<input\s+type="hidden"\s+name="recipientId"\s+value=\{character\.id\}\s*/>\s*<button\s+type="submit"\s+aria-label=\{`Send a private message to \$\{character\.display_name\}`\}\s+title=\{`Message \$\{character\.display_name\}`\}\s+className="([^"]+)"\s*>\s*<span aria-hidden="true">\s*✉\s*</span>\s*</button>\s*</form>', re.S)
m = pat.search(c)
if not m: fail("character directory envelope")
r = '<MessageCharacterModalButton\n                    recipientId={character.id}\n                    recipientName={character.display_name}\n                    className="' + m.group(1) + '"\n                  />'
c = c[:m.start()] + r + c[m.end():]
save(cp, c)

# Game context envelope
xp, x = load("components/portal/game-context-panel.tsx")
x = x.replace('import { startConversation } from "@/app/(portal)/messages/actions";\n', 'import { MessageCharacterModalButton } from "@/components/messages/message-character-modal-button";\n')
old_form = '''  <form\n    action={startConversation}\n    className="absolute bottom-2 right-2 z-10"\n  >\n    <input\n      type="hidden"\n      name="recipientId"\n      value={person.id}\n    />\n\n    <button\n      type="submit"\n      title={`Message ${displayName}`}\n      aria-label={`Message ${displayName}`}\n      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-[12px] text-[rgb(var(--sep-colour-a98b61))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-2a1d12))] hover:text-[rgb(var(--sep-colour-e0c392))]"\n    >\n      ✉\n    </button>\n  </form>'''
new_form = '''  <div className="absolute bottom-2 right-2 z-10">\n    <MessageCharacterModalButton\n      recipientId={person.id}\n      recipientName={displayName}\n      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-[12px] text-[rgb(var(--sep-colour-a98b61))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-2a1d12))] hover:text-[rgb(var(--sep-colour-e0c392))]"\n    />\n  </div>'''
x = rep(x, old_form, new_form, "game context envelope")
save(xp, x)

print("\nPATCH COMPLETE")
print("Run: npm run build")
print("Then: npm run dev")
print("Test /game, all requested sidebar modal links, fullscreen close, header envelope, directory envelope, and in-room envelope.")
print("Do not push until the build and these tests pass.")
