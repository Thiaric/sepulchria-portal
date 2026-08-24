from pathlib import Path
import sys
import shutil

ROOT = Path.cwd()
TARGET = ROOT / "components/portal/active-city-counter.tsx"

def fail(message: str):
    print(f"\nERROR: {message}")
    sys.exit(1)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}. No changes written.")
    return text.replace(old, new, 1)

if not TARGET.exists():
    fail(f"Missing file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")
original = text

text = replace_once(
    text,
    'import { startConversation } from "@/app/(portal)/messages/actions";',
    'import { startConversationForModal } from "@/app/(portal)/messages/actions";\n'
    'import { openPortalModal } from "@/components/portal/portal-modal-button";',
    "modal imports",
)

old_portrait = '''                          <Link
                            href={`/characters/${person.public_slug}`}
                            onClick={() =>
                              setOpen(
                                false,
                              )
                            }
                            title={`Open ${displayName}'s character sheet`}
                            className="relative shrink-0"
                          >
                            <Portrait
                              src={
                                person.portrait_url
                              }
                              name={
                                displayName
                              }
                            />

                            <PresenceDot
                              status={
                                presence.status
                              }
                              cloaked={
                                isStaff &&
                                presence.appear_offline ===
                                  true
                              }
                            />
                          </Link>'''

new_portrait = '''                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);

                              openPortalModal({
                                label: displayName,
                                title: `Open ${displayName}'s character sheet`,
                                icon: "/icons/characters.png",
                                href: `/characters/${person.public_slug}`,
                              });
                            }}
                            title={`Open ${displayName}'s character sheet`}
                            aria-label={`Open ${displayName}'s character sheet`}
                            className="relative shrink-0"
                          >
                            <Portrait
                              src={
                                person.portrait_url
                              }
                              name={
                                displayName
                              }
                            />

                            <PresenceDot
                              status={
                                presence.status
                              }
                              cloaked={
                                isStaff &&
                                presence.appear_offline ===
                                  true
                              }
                            />
                          </button>'''

text = replace_once(text, old_portrait, new_portrait, "portrait character modal")

old_name = '''                              <Link
                                href={`/characters/${person.public_slug}`}
                                onClick={() =>
                                  setOpen(
                                    false,
                                  )
                                }
                                title={`Open ${displayName}'s character sheet`}
                                className="min-w-0 flex-1"
                              >
                                <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-dbc397))] transition hover:text-[rgb(var(--sep-colour-ecd5a8))]">
                                  {
                                    displayName
                                  }
                                </p>
                              </Link>'''

new_name = '''                              <button
                                type="button"
                                onClick={() => {
                                  setOpen(false);

                                  openPortalModal({
                                    label: displayName,
                                    title: `Open ${displayName}'s character sheet`,
                                    icon: "/icons/characters.png",
                                    href: `/characters/${person.public_slug}`,
                                  });
                                }}
                                title={`Open ${displayName}'s character sheet`}
                                aria-label={`Open ${displayName}'s character sheet`}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-dbc397))] transition hover:text-[rgb(var(--sep-colour-ecd5a8))]">
                                  {
                                    displayName
                                  }
                                </p>
                              </button>'''

text = replace_once(text, old_name, new_name, "name character modal")

old_message = '''                                  <form
                                    action={
                                      startConversation
                                    }
                                    onSubmit={() =>
                                      setOpen(
                                        false,
                                      )
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="recipientId"
                                      value={
                                        person.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      aria-label={`Send a private message to ${displayName}`}
                                      title={`Message ${displayName}`}
                                      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-6d5132))]/60 bg-[rgb(var(--sep-colour-1b130d))] text-[10px] text-[rgb(var(--sep-colour-b89059))] transition hover:border-[rgb(var(--sep-colour-a47b43))] hover:bg-[rgb(var(--sep-colour-332318))] hover:text-[rgb(var(--sep-colour-f0d09a))]"
                                    >
                                      ✉
                                    </button>
                                  </form>'''

new_message = '''                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const href =
                                        await startConversationForModal(
                                          person.id,
                                        );

                                      setOpen(false);

                                      openPortalModal({
                                        label: `Messages — ${displayName}`,
                                        title: `Private conversation with ${displayName}`,
                                        icon: "/icons/messages.png",
                                        href,
                                      });
                                    }}
                                    aria-label={`Send a private message to ${displayName}`}
                                    title={`Message ${displayName}`}
                                    className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-6d5132))]/60 bg-[rgb(var(--sep-colour-1b130d))] text-[10px] text-[rgb(var(--sep-colour-b89059))] transition hover:border-[rgb(var(--sep-colour-a47b43))] hover:bg-[rgb(var(--sep-colour-332318))] hover:text-[rgb(var(--sep-colour-f0d09a))]"
                                  >
                                    ✉
                                  </button>'''

text = replace_once(text, old_message, new_message, "message envelope modal")

old_arrow = '''                                <Link
                                  href={`/characters/${person.public_slug}`}
                                  onClick={() =>
                                    setOpen(
                                      false,
                                    )
                                  }
                                  aria-label={`Open ${displayName}'s character sheet`}
                                  title={`Open ${displayName}'s character sheet`}
                                  className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition hover:border-[rgb(var(--sep-colour-8f6d43))] hover:text-[rgb(var(--sep-colour-c59b64))]"
                                >
                                  →
                                </Link>'''

new_arrow = '''                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpen(false);

                                    openPortalModal({
                                      label: displayName,
                                      title: `Open ${displayName}'s character sheet`,
                                      icon: "/icons/characters.png",
                                      href: `/characters/${person.public_slug}`,
                                    });
                                  }}
                                  aria-label={`Open ${displayName}'s character sheet`}
                                  title={`Open ${displayName}'s character sheet`}
                                  className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition hover:border-[rgb(var(--sep-colour-8f6d43))] hover:text-[rgb(var(--sep-colour-c59b64))]"
                                >
                                  →
                                </button>'''

text = replace_once(text, old_arrow, new_arrow, "arrow character modal")

if text == original:
    fail("No changes were made.")

backup = TARGET.with_suffix(TARGET.suffix + ".before-presence-modal-links.bak")
if not backup.exists():
    shutil.copy2(TARGET, backup)

TARGET.write_text(text, encoding="utf-8")

print("PATCH APPLIED")
print("Changed:")
print("  - People in Sepulchria envelope -> Messages floating modal")
print("  - Character arrow -> Character Sheet floating modal")
print("  - Character name -> Character Sheet floating modal")
print("  - Character portrait -> Character Sheet floating modal")
print("")
print("Next:")
print("  npm run build")
