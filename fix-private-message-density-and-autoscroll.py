from pathlib import Path
import sys

PATH = Path("app/(portal)/messages/[id]/components/ConversationMessageList.tsx")

def fail(message):
    print(f"ERROR: {message}")
    print("No files were changed.")
    sys.exit(1)

if not PATH.exists():
    fail(f"{PATH} not found. Run this script from the repository root.")

text = PATH.read_text(encoding="utf-8")
original = text

required = [
    "PRIVATE_MESSAGE_OPTIMISTIC_EVENT",
    "PRIVATE_MESSAGE_REALTIME_EVENT",
    "data-conversation-scrollbox",
    "Select this message",
    "message.body",
]

for marker in required:
    if marker not in text:
        fail(f"Expected Messages marker missing: {marker}")

def replace_one_of(old_values, new_value, label):
    global text
    matches = [old for old in old_values if old in text]
    if len(matches) != 1:
        fail(
            f"{label}: expected exactly one recognised current form, "
            f"found {len(matches)}."
        )
    text = text.replace(matches[0], new_value, 1)

replace_one_of(
    [
        '''import {
  useEffect,
  useMemo,
  useState,
} from "react";'''
    ],
    '''import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";''',
    "React hooks import",
)

state_anchor = '''  const [liveMessages, setLiveMessages] =
    useState<LiveDirectMessage[]>(messages);
'''

if state_anchor not in text:
    fail("liveMessages state anchor not found.")

scroll_block = '''  const scrollBoxRef =
    useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scrollBox =
      scrollBoxRef.current;

    if (!scrollBox) {
      return;
    }

    const frameId =
      window.requestAnimationFrame(
        () => {
          scrollBox.scrollTop =
            scrollBox.scrollHeight;
        },
      );

    return () => {
      window.cancelAnimationFrame(
        frameId,
      );
    };
  }, [liveMessages]);

'''

text = text.replace(
    state_anchor,
    state_anchor + "\n" + scroll_block,
    1,
)

scrollbox_anchor = '''      <div
        data-conversation-scrollbox
        className='''

if scrollbox_anchor not in text:
    fail("Conversation scrollbox opening not found.")

text = text.replace(
    scrollbox_anchor,
    '''      <div
        ref={scrollBoxRef}
        data-conversation-scrollbox
        className=''' ,
    1,
)

replace_one_of(
    [
        'className="max-h-[58vh] space-y-4 overflow-y-auto p-5 sm:p-6"',
        'className="max-h-[62vh] space-y-2 overflow-y-auto p-3 sm:p-4"',
    ],
    'className="max-h-[64vh] space-y-1.5 overflow-y-auto p-2 sm:p-3"',
    "Conversation message-list spacing",
)

replace_one_of(
    [
        'className={`relative max-w-[82%] border p-4 pb-10 transition ${',
        'className={`relative max-w-[88%] border p-3 pb-8 transition ${',
    ],
    'className={`relative max-w-[92%] border px-2.5 py-2 transition ${',
    "Message card padding",
)

replace_one_of(
    [
        'className="flex items-start gap-3"',
        'className="flex items-start gap-2"',
    ],
    'className="flex items-start gap-2"',
    "Message card content gap",
)

replace_one_of(
    [
        'className="h-11 w-11 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]"',
        'className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]"',
    ],
    'className="h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]"',
    "Sender portrait size",
)

body_anchor = '''className={`mt-3 break-words text-sm leading-7 ${'''
if body_anchor not in text:
    fail("Message body typography anchor not found.")

text = text.replace(
    body_anchor,
    '''className={`mt-1.5 break-words text-xs leading-5 ${''',
    1,
)

replace_one_of(
    [
        'className="mb-3 border-l-2 border-[rgb(var(--sep-colour-9a7543))] bg-black/20 p-3"',
        'className="mb-2 border-l-2 border-[rgb(var(--sep-colour-9a7543))] bg-black/20 p-2"',
    ],
    'className="mb-1.5 border-l-2 border-[rgb(var(--sep-colour-9a7543))] bg-black/20 p-2"',
    "Forwarded message spacing",
)

replace_one_of(
    [
        '''                {/* CHECKBOX — BOTTOM RIGHT */}
                <label
                  className={`absolute bottom-3 right-3 flex h-6 w-6 cursor-pointer items-center justify-center border transition ${''',
        '''                {/* CHECKBOX — BOTTOM RIGHT */}
                <label
                  className={`absolute bottom-2 right-2 flex h-5 w-5 cursor-pointer items-center justify-center border transition ${''',
    ],
    '''                {/* MESSAGE SELECTION */}
                <label
                  className={`mt-1.5 ml-auto flex h-5 w-5 cursor-pointer items-center justify-center border transition ${''',
    "Message selection control",
)

action_anchor = '<div className="flex flex-wrap items-center justify-end gap-2">'
if action_anchor not in text:
    fail("Message action row not found.")

text = text.replace(
    action_anchor,
    '<div className="flex flex-wrap items-center justify-end gap-1.5">',
    1,
)

replace_one_of(
    [
        'className="border border-[rgb(var(--sep-colour-59432c))]/80 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b6a40))] hover:text-[rgb(var(--sep-colour-e3c28d))]"',
        'className="border border-[rgb(var(--sep-colour-59432c))]/80 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b6a40))] hover:text-[rgb(var(--sep-colour-e3c28d))]"',
    ],
    'className="border border-[rgb(var(--sep-colour-59432c))]/80 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b6a40))] hover:text-[rgb(var(--sep-colour-e3c28d))]"',
    "Forward action",
)

if text == original:
    fail("Patch produced no changes.")

PATH.write_text(text, encoding="utf-8")

print("Updated:")
print(f" - {PATH}")
print("")
print("Changes:")
print(" - Restored scroll-to-bottom when the conversation first opens.")
print(" - Scrolls to bottom whenever liveMessages changes.")
print(" - This includes your sends and incoming realtime sends.")
print(" - Removed the large bottom padding that created dead card space.")
print(" - Selection checkbox no longer needs a reserved empty bottom area.")
print(" - Message body font is 2px smaller: 14px -> 12px.")
print(" - Message body line-height and spacing are tighter.")
print(" - Message cards, portraits, gaps and action spacing are denser.")
print("")
print("No backup files were created.")
