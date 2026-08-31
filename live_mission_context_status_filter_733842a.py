from __future__ import annotations

from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "733842aa3331f6df12b5dc2e0857bcef6725086f"
ROOT = Path.cwd()
TARGET = ROOT / "components/portal/missions-context-panel.tsx"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception as exc:
    fail(f"Could not read git HEAD: {exc}")

if head != EXPECTED_HEAD:
    fail(
        "This patch was built specifically for commit 733842a.\n"
        f"Expected HEAD: {EXPECTED_HEAD}\n"
        f"Actual HEAD:   {head}\n"
        "Do not apply it to a different revision."
    )

if not TARGET.exists():
    fail("Missing components/portal/missions-context-panel.tsx")

text = TARGET.read_text(encoding="utf-8")

old_filter = '''  const visibleMissions =
    missions.filter((mission) => {
      if (!query) {
        return true;
      }

      return (
        `${mission.family_snapshot} ${mission.name_snapshot}`
          .toLocaleLowerCase()
          .includes(query)
      );
    });
'''

new_filter = '''  const visibleMissions =
    missions.filter((mission) => {
      if (!query) {
        return true;
      }

      const statusSearch =
        mission.claimed_at
          ? "claimed"
          : mission.completed_at
            ? "ready reward ready"
            : "";

      return (
        `${mission.family_snapshot} ${mission.name_snapshot} ${statusSearch}`
          .toLocaleLowerCase()
          .includes(query)
      );
    });
'''

if old_filter not in text:
    fail("Could not find the mission filter block.")

text = text.replace(old_filter, new_filter, 1)

old_effect = '''  useEffect(() => {
    void loadMissions();

    function handleFocus() {
      void loadMissions();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadMissions();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [loadMissions]);
'''

new_effect = '''  useEffect(() => {
    void loadMissions();

    function handleFocus() {
      void loadMissions();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadMissions();
      }
    }

    function handleMissionStateChanged() {
      void loadMissions();
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "sepulchria:notifications-changed",
      handleMissionStateChanged,
    );

    const refreshInterval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadMissions();
        }
      }, 5_000);

    return () => {
      window.clearInterval(
        refreshInterval,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "sepulchria:notifications-changed",
        handleMissionStateChanged,
      );
    };
  }, [loadMissions]);
'''

if old_effect not in text:
    fail("Could not find the mission context refresh effect.")

text = text.replace(old_effect, new_effect, 1)

old_ready = '''                      Ready
'''
new_ready = '''                      Reward Ready
'''

if old_ready not in text:
    fail('Could not find the current "Ready" label.')

text = text.replace(old_ready, new_ready, 1)

TARGET.write_text(text, encoding="utf-8")

print("Updated components/portal/missions-context-panel.tsx")
print()
print("Changes:")
print("  - Search now matches Ready / Reward Ready")
print("  - Search now matches Claimed")
print("  - Successful claims refresh the sidebar immediately")
print("  - Mission status refreshes every 5 seconds while visible")
print("  - Ready label now reads REWARD READY")
print()
print("Next:")
print("  npm run build")
