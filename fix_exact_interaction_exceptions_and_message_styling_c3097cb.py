from pathlib import Path
import subprocess

BASE = "c3097cb"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}")
    return p.read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8")

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True,
    capture_output=True,
    text=True,
    encoding="utf-8",
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(
        f"This patch expects HEAD based on {BASE}; current HEAD is {head}. "
        "No files were changed."
    )

interaction_path = "components/portal/portal-interaction-layer.tsx"
chat_path = "app/(portal)/game/components/RoomMessageList.tsx"
message_list_path = "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
composer_path = "app/(portal)/messages/components/MessageComposer.tsx"
delete_conversation_path = "app/(portal)/messages/[id]/components/DeleteConversationForm.tsx"
forum_post_path = "components/forum/topic-post.tsx"
css_path = "components/sepulchria/sep-ui-unified.css"

interaction = read(interaction_path)
chat = read(chat_path)
message_list = read(message_list_path)
composer = read(composer_path)
delete_conversation = read(delete_conversation_path)
forum_post = read(forum_post_path)
css = read(css_path)

old = """  if (
    target.closest(
      EXCLUDED_SELECTOR,
    )
  ) {
    return null;
  }

  const explicit =
    explicitSurface(target);

  if (explicit) {
    return explicit;
  }

  const control =
    target.closest<HTMLElement>(
      CONTROL_SELECTOR,
    );"""

new = """  if (
    target.closest(
      '[data-sep-interaction-ignore="true"]',
    )
  ) {
    return null;
  }

  const explicit =
    explicitSurface(target);

  if (explicit) {
    return explicit;
  }

  const control =
    target.closest<HTMLElement>(
      CONTROL_SELECTOR,
    );"""

if old not in interaction:
    raise SystemExit("Interaction exclusion block not found.")

interaction = interaction.replace(old, new, 1)

old = """  const article =
    target.closest<HTMLElement>(
      "article",
    );

  if (
    article &&
    portal.contains(article) &&
    isVisibleCandidate(article) &&
    !article.closest(
      '[data-sep-interaction-ignore="true"]',
    )
  ) {"""

new = """  const fixedSurface =
    target.closest<HTMLElement>(
      '[data-sep-interaction-fixed="true"]',
    );

  if (fixedSurface) {
    return null;
  }

  if (
    target.closest(
      EXCLUDED_SELECTOR,
    )
  ) {
    return null;
  }

  const article =
    target.closest<HTMLElement>(
      "article",
    );

  if (
    article &&
    portal.contains(article) &&
    isVisibleCandidate(article) &&
    !article.closest(
      '[data-sep-interaction-ignore="true"]',
    )
  ) {"""

if old not in interaction:
    raise SystemExit("Interaction article block not found.")

interaction = interaction.replace(old, new, 1)

old = """  id="room-chronicle"
  ref={scrollContainerRef}
  onScroll={handleScroll}
  className="min-h-0 flex-none overflow-visible lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
>"""

new = """  id="room-chronicle"
  ref={scrollContainerRef}
  onScroll={handleScroll}
  data-sep-interaction-ignore="true"
  className="min-h-0 flex-none overflow-visible lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
>"""

if old not in chat:
    raise SystemExit("Room chronicle container not found.")

chat = chat.replace(old, new, 1)

old = 'className="relative border-y border-[rgb(var(--sep-colour-8a6637))]/40 bg-[linear-gradient(90deg,rgba(var(--sep-rgb-91-56-24),0.22),rgba(var(--sep-rgb-24-16-11),0.72),rgba(var(--sep-rgb-91-56-24),0.14))] py-2.5 pl-5 pr-12 sm:pl-7 sm:pr-12"'
new = 'className="relative border-y border-[rgb(var(--sep-colour-8a6637))]/40 bg-[rgb(var(--sep-colour-0d0a08))] py-2.5 pl-5 pr-12 sm:pl-7 sm:pr-12"'

if old not in chat:
    raise SystemExit("Voice of Fate background block not found.")

chat = chat.replace(old, new, 1)

old = """              <article
                key={message.id}
                className={`relative max-w-[92%] border px-2.5 py-2 transition ${"""

new = """              <article
                key={message.id}
                data-sep-interaction-ignore="true"
                className={`relative max-w-[92%] border px-2.5 py-2 transition ${"""

if old not in message_list:
    raise SystemExit("Private message article not found.")

message_list = message_list.replace(old, new, 1)

old = """                          <button
                            type="submit"
                            title="Delete this message from your view"
                            className="border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:border-[rgb(var(--sep-colour-ad5a4c))] hover:bg-[rgb(var(--sep-colour-391713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"""
new = """                          <button
                            type="submit"
                            title="Delete this message from your view"
                            data-sep-danger="true"
                            className="border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:border-[rgb(var(--sep-colour-ad5a4c))] hover:bg-[rgb(var(--sep-colour-391713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"""
if old not in message_list:
    raise SystemExit("Individual message Delete button not found.")
message_list = message_list.replace(old, new, 1)

old = """                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-301713))] px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-e6aa9d))] transition hover:border-[rgb(var(--sep-colour-c66d5b))] hover:bg-[rgb(var(--sep-colour-431d18))]"""
new = """                <button
                  type="submit"
                  data-sep-danger="true"
                  className="border border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-301713))] px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-e6aa9d))] transition hover:border-[rgb(var(--sep-colour-c66d5b))] hover:bg-[rgb(var(--sep-colour-431d18))]"""
if old not in message_list:
    raise SystemExit("Delete selected button not found.")
message_list = message_list.replace(old, new, 1)

old = """              !isOnGame
                ? "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-20232b))] text-[rgb(var(--sep-colour-d6dae5))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] text-[rgb(var(--sep-colour-8e806d))] hover:border-[rgb(var(--sep-colour-6d7488))]"""
new = """              !isOnGame
                ? "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-0d0907))] text-[rgb(var(--sep-colour-d6dae5))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-0d0907))] text-[rgb(var(--sep-colour-8e806d))] hover:border-[rgb(var(--sep-colour-6d7488))]"""
if old not in composer:
    raise SystemExit("OFF-GAME message mode box not found.")
composer = composer.replace(old, new, 1)

old = """      <button
        type="submit"
        className="border border-[rgb(var(--sep-colour-7b4035))] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))]"""
new = """      <button
        type="submit"
        data-sep-danger="true"
        className="border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-27120f))] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:border-[rgb(var(--sep-colour-ad5a4c))] hover:bg-[rgb(var(--sep-colour-391713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"""
if old not in delete_conversation:
    raise SystemExit("Delete Conversation button not found.")
delete_conversation = delete_conversation.replace(old, new, 1)

old = """    <article
      id={`post-${post.id}`}
      className="scroll-mt-24 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
    >"""
new = """    <article
      id={`post-${post.id}`}
      data-sep-interaction-fixed="true"
      className="scroll-mt-24 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
    >"""
if old not in forum_post:
    raise SystemExit("Forum TopicPost article not found.")
forum_post = forum_post.replace(old, new, 1)

marker = "SEPULCHRIA DANGER CONTROLS - PRESERVE RED"
danger_css = """

/* ==================================================================
   SEPULCHRIA DANGER CONTROLS - PRESERVE RED
   ================================================================== */
body.portal-skin-scope
  button[data-sep-danger="true"] {
  border-color:
    rgb(var(--sep-colour-7b4035)) !important;
  background:
    rgb(var(--sep-colour-27120f)) !important;
  color:
    rgb(var(--sep-colour-d99b8e)) !important;
}

body.portal-skin-scope
  button[data-sep-danger="true"]:hover {
  border-color:
    rgb(var(--sep-colour-ad5a4c)) !important;
  background:
    rgb(var(--sep-colour-391713)) !important;
  color:
    rgb(var(--sep-colour-f1b2a5)) !important;
}
"""

if marker not in css:
    css += danger_css

write(interaction_path, interaction)
write(chat_path, chat)
write(message_list_path, message_list)
write(composer_path, composer)
write(delete_conversation_path, delete_conversation)
write(forum_post_path, forum_post)
write(css_path, css)

print("SUCCESS")
print("Location chat history fixed; bottom composer buttons remain interactive.")
print("Voice of Fate background made darker.")
print("Private message cards fixed; surrounding conversation UI remains interactive.")
print("OFF-GAME selector made much darker.")
print("Delete message / selected / conversation red styling preserved.")
print("Forum post/reply containers fixed while internal buttons/links remain interactive.")
print("Run: npm run build")
