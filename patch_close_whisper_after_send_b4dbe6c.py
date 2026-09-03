#!/usr/bin/env python3
from pathlib import Path

path = Path("app/(portal)/game/components/RoomChatForm.tsx")

if not path.exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal project root.\n"
    )

text = path.read_text(encoding="utf-8")

anchor = '''  const messageFormRef =
  useRef<HTMLFormElement>(null);

  const [
    textareaScrollTop,
'''

replacement = '''  const messageFormRef =
  useRef<HTMLFormElement>(null);

  const submittedMessageModeRef =
    useRef<
      "whisper" | "chat" | null
    >(null);

  const [
    textareaScrollTop,
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: messageFormRef anchor expected 1 match, found {count}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''  useEffect(() => {
    if (
      !messageState.ok ||
      !messageState.submittedAt
    ) {
      return;
    }

    // The sent text was already cleared optimistically on submit.
    // Do not clear again here: the player may already be writing
    // their next action while the previous server request finishes.
    setMessageNonce(
      crypto.randomUUID(),
    );

    textareaRef.current?.focus();
  }, [
    messageState.ok,
    messageState.submittedAt,
  ]);
'''

replacement = '''  useEffect(() => {
    if (
      !messageState.ok ||
      !messageState.submittedAt
    ) {
      return;
    }

    const submittedMode =
      submittedMessageModeRef.current;

    submittedMessageModeRef.current =
      null;

    // The sent text was already cleared optimistically on submit.
    // Do not clear again here: the player may already be writing
    // their next action while the previous server request finishes.
    setMessageNonce(
      crypto.randomUUID(),
    );

    if (
      submittedMode ===
      "whisper"
    ) {
      setUtilityMode(null);

      /*
       * Closing Whisper replaces its textarea with the normal chat
       * textarea. Wait for that render before restoring keyboard focus.
       */
      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              textareaRef.current?.focus();
            },
          );
        },
      );

      return;
    }

    textareaRef.current?.focus();
  }, [
    messageState.ok,
    messageState.submittedAt,
  ]);
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: message success effect expected 1 match, found {count}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''  function clearMessageComposerAfterSubmit() {
    window.requestAnimationFrame(() => {
      setValue("");
      setWhisperRecipientId("");
      setSpellingMenu(null);
      setTextareaScrollTop(0);
    });
  }
'''

replacement = '''  function clearMessageComposerAfterSubmit() {
    submittedMessageModeRef.current =
      utilityMode === "whisper"
        ? "whisper"
        : "chat";

    window.requestAnimationFrame(() => {
      setValue("");
      setWhisperRecipientId("");
      setSpellingMenu(null);
      setTextareaScrollTop(0);
    });
  }
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: clearMessageComposerAfterSubmit expected 1 match, found {count}.\n"
    )

text = text.replace(anchor, replacement, 1)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print("✓ Whisper submission mode is remembered.")
print("✓ Successful Whisper closes the utility panel.")
print("✓ Focus returns to the normal chat textarea.")
print("✓ Failed Whisper does not close the panel.")
print("✓ Normal chat sends are unchanged.")
print("\nPATCH COMPLETE")
print("\nRun: npm run build")
