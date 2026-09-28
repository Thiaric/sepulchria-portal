
from pathlib import Path
import sys

LIVE = Path("components/characters/live-character-sheet-refresh.tsx")
BROWSER = Path("components/characters/character-inventory-browser.tsx")
ACTIONS = Path("lib/items/use-actions.ts")


def fail(msg):
    print(f"ERROR: {msg}")
    print("No file was changed.")
    return 1


def replace_once(src, old, new, label):
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return src.replace(old, new, 1)


def main():
    for p in (LIVE, BROWSER, ACTIONS):
        if not p.exists():
            return fail(f"Missing {p}. Run from the repo root.")

    live0 = LIVE.read_text(encoding="utf-8")
    browser0 = BROWSER.read_text(encoding="utf-8")
    actions0 = ACTIONS.read_text(encoding="utf-8")

    live = live0
    browser = browser0
    actions = actions0

    try:
        if "getShapeScrollLearningWarning" not in browser:
            browser = replace_once(
                browser,
                'import { useInventoryItem } from "@/lib/items/use-actions";',
                '''import {
  getShapeScrollLearningWarning,
  useInventoryItem,
} from "@/lib/items/use-actions";''',
                "add warning import",
            )

        if "export async function getShapeScrollLearningWarning" not in actions:
            warning_action = '''export async function getShapeScrollLearningWarning(
  formData: FormData,
): Promise<{
  requiresConfirmation: boolean;
  message: string;
}> {
  const recordKind = text(formData, "recordKind");
  const recordId = text(formData, "recordId");

  if (
    !["standard", "unique"].includes(recordKind) ||
    !recordId
  ) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const { character } =
    await getOwnedCharacter();

  const record =
    await loadAttemptRecord(
      recordKind,
      recordId,
      character.id,
    );

  if (!record.item.teaches_shape_id) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const admin = createPrivilegedClient();

  const {
    data: knownShape,
    error: knownShapeError,
  } = await admin
    .from("character_shapes")
    .select("id")
    .eq("character_id", character.id)
    .eq("shape_id", record.item.teaches_shape_id)
    .limit(1)
    .maybeSingle();

  if (knownShapeError) {
    throw new Error(knownShapeError.message);
  }

  if (knownShape) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const {
    data: shape,
    error: shapeError,
  } = await admin
    .from("shapes")
    .select("id,name,level,is_active,is_feat_backing")
    .eq("id", record.item.teaches_shape_id)
    .maybeSingle();

  if (
    shapeError ||
    !shape ||
    shape.is_active !== true ||
    shape.is_feat_backing === true
  ) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const effectiveWarping =
    await getEffectiveCharacterWarping(
      character.id,
    );

  const shapeLevel =
    Number(shape.level ?? 1);
  const affinity =
    Number(effectiveWarping.affinity ?? 1);

  if (shapeLevel <= affinity) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const dc = 10 + shapeLevel;

  return {
    requiresConfirmation: true,
    message:
      `Warning: "${shape.name}" is a Level ${shapeLevel} Shape, ` +
      `but your Warping Affinity is ${affinity}.\\n\\n` +
      `Learning it requires a d20 + Brains roll against DC ${dc}. ` +
      `If the roll fails, this Scroll will be destroyed and the Shape will NOT be learned.\\n\\n` +
      `Do you want to use the Scroll anyway?`,
  };
}

'''
            actions = replace_once(
                actions,
                '''export async function useInventoryItem(
  formData: FormData,
): Promise<UseInventoryItemResult> {''',
                warning_action + '''export async function useInventoryItem(
  formData: FormData,
): Promise<UseInventoryItemResult> {''',
                "add warning action",
            )

        if "10_000" in browser:
            browser = browser.replace("10_000", "5_000", 1)

        use_control_pos = browser.find("function UseControl")
        run_start = browser.find("  const run = () => {", use_control_pos)
        run_end_marker = "\n  };\n\n  if (inventoryCannotUse)"
        run_end = browser.find(run_end_marker, run_start)

        if run_start == -1 or run_end == -1:
            raise RuntimeError("Could not locate UseControl run()")

        replacement_run = '''  const run = () => {
    const data = new FormData();

    data.set(
      "recordKind",
      row.record_kind,
    );
    data.set(
      "recordId",
      row.record_id,
    );

    // Inventory use is deliberately self-only.
    setMessage(null);

    startTransition(async () => {
      if (row.teaches_shape) {
        let warning;

        try {
          warning =
            await getShapeScrollLearningWarning(
              data,
            );
        } catch (error) {
          setSuccess(false);
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to check this Scroll.",
          );
          return;
        }

        if (
          warning.requiresConfirmation &&
          !window.confirm(
            warning.message,
          )
        ) {
          return;
        }

        window.dispatchEvent(
          new CustomEvent(
            "sepulchria:character-sheet-refresh-suspend",
            {
              detail: {
                milliseconds: 5_500,
              },
            },
          ),
        );
      }

      const result =
        await useInventoryItem(data);

      setSuccess(result.ok);
      setMessage(result.message);

      if (row.teaches_shape) {
        await new Promise<void>(
          (resolve) => {
            window.setTimeout(
              resolve,
              5_000,
            );
          },
        );

        window.dispatchEvent(
          new Event(
            "sepulchria:character-sheet-refresh-now",
          ),
        );

        return;
      }

      if (result.ok) {
        router.refresh();
      }
    });
  };'''

        browser = (
            browser[:run_start]
            + replacement_run
            + browser[run_end + len("\n  };"):]
        )

        live = replace_once(
            live,
            '''  const refreshTimerRef =
    useRef<number | null>(null);''',
            '''  const refreshTimerRef =
    useRef<number | null>(null);

  const suspendedUntilRef =
    useRef(0);''',
            "add suspension ref",
        )

        old_refresh = '''    function refreshSheet() {
      if (disposed) return;

      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current =
        window.setTimeout(() => {
          if (!disposed) {
            const currentUrl =
              `${window.location.pathname}${window.location.search}${window.location.hash}`;

            router.replace(
              currentUrl,
              {
                scroll: false,
              },
            );
          }
        }, 250);
    }'''

        new_refresh = '''    function refreshSheet() {
      if (disposed) return;

      if (refreshTimerRef.current !== null) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

      const remainingSuspension =
        Math.max(
          0,
          suspendedUntilRef.current -
            Date.now(),
        );

      const delay =
        remainingSuspension > 0
          ? remainingSuspension
          : 250;

      refreshTimerRef.current =
        window.setTimeout(() => {
          if (!disposed) {
            const currentUrl =
              `${window.location.pathname}${window.location.search}${window.location.hash}`;

            router.replace(
              currentUrl,
              {
                scroll: false,
              },
            );
          }
        }, delay);
    }'''

        live = replace_once(
            live,
            old_refresh,
            new_refresh,
            "make refresh suspension-aware",
        )

        live = replace_once(
            live,
            '''    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );''',
            '''    function suspendRefresh(
      event: Event,
    ) {
      const detail =
        (
          event as CustomEvent<{
            milliseconds?: number;
          }>
        ).detail;

      const milliseconds =
        Math.max(
          0,
          Number(
            detail?.milliseconds ?? 0,
          ),
        );

      suspendedUntilRef.current =
        Math.max(
          suspendedUntilRef.current,
          Date.now() + milliseconds,
        );

      if (
        refreshTimerRef.current !==
        null
      ) {
        refreshSheet();
      }
    }

    function refreshNow() {
      suspendedUntilRef.current = 0;
      refreshSheet();
    }

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    window.addEventListener(
      "sepulchria:character-sheet-refresh-suspend",
      suspendRefresh,
    );

    window.addEventListener(
      "sepulchria:character-sheet-refresh-now",
      refreshNow,
    );''',
            "add refresh suspension events",
        )

        live = replace_once(
            live,
            '''      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );''',
            '''      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );

      window.removeEventListener(
        "sepulchria:character-sheet-refresh-suspend",
        suspendRefresh,
      );

      window.removeEventListener(
        "sepulchria:character-sheet-refresh-now",
        refreshNow,
      );''',
            "remove refresh suspension events",
        )

    except RuntimeError as exc:
        return fail(str(exc))

    for path, original, suffix in (
        (LIVE, live0, ".before-scroll-result-hold"),
        (BROWSER, browser0, ".before-scroll-result-hold"),
        (ACTIONS, actions0, ".before-scroll-result-hold"),
    ):
        backup = path.with_suffix(path.suffix + suffix)
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")

    LIVE.write_text(live, encoding="utf-8")
    BROWSER.write_text(browser, encoding="utf-8")
    ACTIONS.write_text(actions, encoding="utf-8")

    print("Scroll result timing patch applied.")
    print()
    print("What changes:")
    print("  - Shape Scroll warning is preserved/added")
    print("  - Scroll result message remains visible for 5 seconds")
    print("  - Character Sheet realtime refresh is suspended during those 5 seconds")
    print("  - consumed Scroll remains visually present during the message")
    print("  - after 5 seconds the sheet refreshes and the consumed Scroll/quantity disappears")
    print("  - non-Scroll Item behaviour remains unchanged")
    print()
    print("Important:")
    print("  - database consumption still happens atomically during use")
    print("  - only the UI disappearance is delayed, avoiding duplicate-use exploits")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
