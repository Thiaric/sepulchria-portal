from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "6381c49"


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")
    return p.read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    p = ROOT / path
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"WROTE  {path}")


def replace_once(path: str, content: str, old: str, new: str) -> str:
    count = content.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: Expected exactly one match in {path}, found {count}. "
            "No changes were applied."
        )
    return content.replace(old, new, 1)


head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if not head.startswith(EXPECTED):
    raise SystemExit(
        f"ERROR: Patch expects {EXPECTED} but current HEAD is {head}. "
        "No changes were applied."
    )

editor_path = "components/editor/rich-text-editor.tsx"
assistant_path = "components/editor/writing-assistant.tsx"
logout_path = "components/logout-button.tsx"

editor = read(editor_path)
assistant = read(assistant_path)
logout = read(logout_path)

# ---------------------------------------------------------------------------
# 1. SPELLING API: do not erase valid suggestions on transient failures.
# ---------------------------------------------------------------------------

assistant_old = """            const response =
              await fetch(
                "/api/writing-assistant/spelling",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    text,
                  }),
                  signal:
                    controller.signal,
                },
              );

            if (!response.ok) {
              setIssues([]);
              return;
            }

            const result =
              (await response.json()) as {
                issues?: WritingIssue[];
              };

            setIssues(
              Array.isArray(
                result.issues,
              )
                ? result.issues
                : [],
            );
"""

assistant_new = """            const response =
              await fetch(
                "/api/writing-assistant/spelling",
                {
                  method: "POST",
                  credentials:
                    "same-origin",
                  cache: "no-store",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    text,
                  }),
                  signal:
                    controller.signal,
                },
              );

            /*
             * Do not erase the last valid spelling result because of a
             * transient auth/routing/network response. The next normal
             * debounce will refresh the result.
             */
            if (
              !response.ok ||
              response.redirected
            ) {
              return;
            }

            const contentType =
              response.headers.get(
                "content-type",
              ) ?? "";

            if (
              !contentType.includes(
                "application/json",
              )
            ) {
              return;
            }

            const result =
              (await response.json()) as {
                issues?: WritingIssue[];
              };

            setIssues(
              Array.isArray(
                result.issues,
              )
                ? result.issues
                : [],
            );
"""

assistant_after = replace_once(
    assistant_path,
    assistant,
    assistant_old,
    assistant_new,
)

assistant_catch_old = """            setIssues([]);
          }
        },
        550,
"""

assistant_catch_new = """            /*
             * Keep the previous successful spelling result on a transient
             * failure. A later request will refresh it.
             */
          }
        },
        550,
"""

assistant_after = replace_once(
    assistant_path,
    assistant_after,
    assistant_catch_old,
    assistant_catch_new,
)

# ---------------------------------------------------------------------------
# 2. RICH TEXT EDITOR: make suggestion word detection more robust and allow
#    both normal click and right-click on a detected misspelling.
# ---------------------------------------------------------------------------

editor_handler_old = """function handleSpellingClick(
  event: React.MouseEvent<HTMLDivElement>,
) {
  if (
    disabled ||
    sourceMode
  ) {
    return;
  }

  const result =
    getTextRangeAtPoint(
      event.clientX,
      event.clientY,
    );

  if (!result) {
    setSpellingMenu(null);
    return;
  }

  const issue =
    visibleSpellingIssues.find(
      (candidate) =>
        candidate.word.localeCompare(
          result.word,
          "en-GB",
          {
            sensitivity:
              "accent",
          },
        ) === 0,
    );

  if (!issue) {
    setSpellingMenu(null);
    return;
  }

  setSpellingMenu({
    issue,
    range:
      result.range.cloneRange(),
    x: Math.min(
      event.clientX,
      window.innerWidth - 280,
    ),
    y:
      event.clientY >
      window.innerHeight / 2
        ? Math.max(
            16,
            event.clientY - 320,
          )
        : event.clientY + 18,
  });
}
"""

editor_handler_new = """function getTextRangeFromSelection() {
  const editor =
    editorRef.current;

  const selection =
    window.getSelection();

  if (
    !editor ||
    !selection ||
    !selection.focusNode ||
    !editor.contains(
      selection.focusNode,
    )
  ) {
    return null;
  }

  let node =
    selection.focusNode;

  let offset =
    selection.focusOffset;

  if (
    node.nodeType !==
      Node.TEXT_NODE
  ) {
    const walker =
      document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
      );

    const firstTextNode =
      walker.nextNode();

    if (!firstTextNode) {
      return null;
    }

    node = firstTextNode;
    offset = 0;
  }

  const text =
    node.nodeValue ?? "";

  if (!text) {
    return null;
  }

  const isWordCharacter = (
    character: string,
  ) =>
    /[\\p{L}’'-]/u.test(
      character,
    );

  let start =
    Math.min(
      offset,
      text.length,
    );

  if (
    start === text.length ||
    !isWordCharacter(
      text[start] ?? "",
    )
  ) {
    start -= 1;
  }

  if (
    start < 0 ||
    !isWordCharacter(
      text[start] ?? "",
    )
  ) {
    return null;
  }

  let end =
    start + 1;

  while (
    start > 0 &&
    isWordCharacter(
      text[start - 1],
    )
  ) {
    start -= 1;
  }

  while (
    end < text.length &&
    isWordCharacter(
      text[end],
    )
  ) {
    end += 1;
  }

  const word =
    text.slice(
      start,
      end,
    );

  if (!word) {
    return null;
  }

  const range =
    document.createRange();

  range.setStart(
    node,
    start,
  );

  range.setEnd(
    node,
    end,
  );

  return {
    word,
    range,
  };
}

function openSpellingMenu(
  event: React.MouseEvent<HTMLDivElement>,
) {
  if (
    disabled ||
    sourceMode
  ) {
    return false;
  }

  const result =
    getTextRangeAtPoint(
      event.clientX,
      event.clientY,
    ) ??
    getTextRangeFromSelection();

  if (!result) {
    setSpellingMenu(null);
    return false;
  }

  const issue =
    visibleSpellingIssues.find(
      (candidate) =>
        candidate.word.localeCompare(
          result.word,
          "en-GB",
          {
            sensitivity:
              "accent",
          },
        ) === 0,
    );

  if (!issue) {
    setSpellingMenu(null);
    return false;
  }

  setSpellingMenu({
    issue,
    range:
      result.range.cloneRange(),
    x: Math.max(
      12,
      Math.min(
        event.clientX,
        window.innerWidth - 280,
      ),
    ),
    y:
      event.clientY >
      window.innerHeight / 2
        ? Math.max(
            16,
            event.clientY - 320,
          )
        : Math.min(
            event.clientY + 18,
            window.innerHeight - 280,
          ),
  });

  return true;
}

function handleSpellingClick(
  event: React.MouseEvent<HTMLDivElement>,
) {
  openSpellingMenu(event);
}

function handleSpellingContextMenu(
  event: React.MouseEvent<HTMLDivElement>,
) {
  /*
   * Override the native context menu ONLY on a word that Sepulchria
   * currently recognises as a spelling issue.
   */
  if (openSpellingMenu(event)) {
    event.preventDefault();
    event.stopPropagation();
  }
}
"""

editor_after = replace_once(
    editor_path,
    editor,
    editor_handler_old,
    editor_handler_new,
)

editor_event_old = """      onClick={
        handleSpellingClick
      }
      className="rich-wysiwyg-editor relative z-0 block w-full overflow-auto px-4 py-4 text-sm font-normal leading-7 text-[rgb(var(--sep-colour-d7c4a5))] outline-none selection:bg-[rgb(var(--sep-colour-6b4b2c))] selection:text-[rgb(var(--sep-colour-fff0d0))] empty:before:pointer-events-none empty:before:text-[rgb(var(--sep-colour-625747))] empty:before:content-[attr(data-placeholder)] [&_a]:text-[rgb(var(--sep-colour-d3a762))] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[rgb(var(--sep-colour-8d6d3e))] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-3 [&_img]:max-h-[620px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[rgb(var(--sep-colour-60482e))]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[rgb(var(--sep-colour-60482e))]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7"
"""

editor_event_new = """      onClick={
        handleSpellingClick
      }
      onContextMenu={
        handleSpellingContextMenu
      }
      className="rich-wysiwyg-editor relative z-0 block w-full overflow-auto px-4 py-4 text-sm font-normal leading-7 text-[rgb(var(--sep-colour-d7c4a5))] outline-none selection:bg-[rgb(var(--sep-colour-6b4b2c))] selection:text-[rgb(var(--sep-colour-fff0d0))] empty:before:pointer-events-none empty:before:text-[rgb(var(--sep-colour-625747))] empty:before:content-[attr(data-placeholder)] [&_a]:text-[rgb(var(--sep-colour-d3a762))] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[rgb(var(--sep-colour-8d6d3e))] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-3 [&_img]:max-h-[620px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[rgb(var(--sep-colour-60482e))]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[rgb(var(--sep-colour-60482e))]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7"
"""

editor_after = replace_once(
    editor_path,
    editor_after,
    editor_event_old,
    editor_event_new,
)

# ---------------------------------------------------------------------------
# 3. LOGOUT: close the dedicated window opened by "Enter Sepulchria".
#    If the browser refuses to close it, fall back to the homepage.
# ---------------------------------------------------------------------------

logout_import_old = """import { useState } from "react";
import { useRouter } from "next/navigation";
"""

logout_import_new = """import { useState } from "react";
"""

logout_after = replace_once(
    logout_path,
    logout,
    logout_import_old,
    logout_import_new,
)

logout_router_old = """export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] =
"""

logout_router_new = """export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] =
"""

logout_after = replace_once(
    logout_path,
    logout_after,
    logout_router_old,
    logout_router_new,
)

logout_success_old = """      router.replace("/homepage");
      router.refresh();
"""

logout_success_new = """      /*
       * Sepulchria is normally running in the dedicated popup created
       * by the Enter Sepulchria button. On an intentional logout, close
       * that game window instead of turning it into another homepage.
       */
      sessionStorage.removeItem(
        "sepulchria-portal-instance-id",
      );

      window.close();

      /*
       * Script-opened portal windows are allowed to close themselves.
       * Keep a fallback for browsers/environments that refuse window.close().
       */
      window.setTimeout(() => {
        if (!window.closed) {
          window.location.replace(
            "/homepage",
          );
        }
      }, 150);
"""

logout_after = replace_once(
    logout_path,
    logout_after,
    logout_success_old,
    logout_success_new,
)

# All validations succeeded. Write only now.
write(assistant_path, assistant_after)
write(editor_path, editor_after)
write(logout_path, logout_after)

print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Changes applied:")
print("- Restored/resilient rich-text spelling suggestions.")
print("- Added left-click + right-click suggestion opening.")
print("- Intentional Logout now closes the dedicated Sepulchria window.")
print("- If window.close() is blocked, Logout falls back to /homepage.")
print()
print("Next:")
print("1. npm run build")
print("2. Test rich-text misspelling: recieve")
print("3. Test Logout from the dedicated Sepulchria popup")
print("4. The popup should close; the original homepage tab should remain open.")
