from pathlib import Path
import sys

ROOT = Path.cwd()

def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")

    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match in {path}, found {count}. "
            "No changes were made to this file."
        )

    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"OK: {label}")

def main() -> None:
    heartbeat = ROOT / "components" / "portal" / "portal-presence-heartbeat.tsx"
    sanctions = ROOT / "components" / "sanctions" / "sanction-capability-ui.tsx"

    missing = [str(p) for p in (heartbeat, sanctions) if not p.exists()]
    if missing:
        raise FileNotFoundError(
            "Run this script from the sepulchria-portal repository root.\n"
            "Missing:\n- " + "\n- ".join(missing)
        )

    replace_once(
        heartbeat,
        '''  const runningRef =
    useRef(false);

  const awayAppliedRef =''',
        '''  const runningRef =
    useRef(false);

  const lastHeartbeatAtRef =
    useRef(0);

  const awayAppliedRef =''',
        "add heartbeat throttle ref",
    )

    replace_once(
        heartbeat,
        '''    async function sendHeartbeat() {
      if (
        logoutStartedRef.current ||
        runningRef.current
      ) {
        return;
      }

      runningRef.current = true;

      try {
        await heartbeatPresence();''',
        '''    async function sendHeartbeat(
      force = false,
    ) {
      if (
        logoutStartedRef.current ||
        runningRef.current
      ) {
        return;
      }

      const now = Date.now();

      if (
        !force &&
        now -
          lastHeartbeatAtRef.current <
          HEARTBEAT_INTERVAL_MS
      ) {
        return;
      }

      lastHeartbeatAtRef.current = now;
      runningRef.current = true;

      try {
        await heartbeatPresence();''',
        "throttle presence heartbeat",
    )

    replace_once(
        heartbeat,
        '''      if (
  elapsed >=
  AWAY_AFTER_MS
) {
  void markAutomaticAway();
  return true;
}

      if (
        elapsed >=
        AWAY_AFTER_MS
      ) {
        void markAutomaticAway();
        return false;
      }

      return true;''',
        '''      if (
        elapsed >=
        LOGOUT_AFTER_MS
      ) {
        void logoutForInactivity();
        return false;
      }

      if (
        elapsed >=
        AWAY_AFTER_MS
      ) {
        void markAutomaticAway();
        return false;
      }

      return true;''',
        "fix idle/logout logic",
    )

    replace_once(
        heartbeat,
        '''    void sendHeartbeat();

    return () => {''',
        '''    void sendHeartbeat(true);

    return () => {''',
        "force initial heartbeat",
    )

    replace_once(
        sanctions,
        'const SHARED_REFRESH_MS = 15_000;',
        'const SHARED_REFRESH_MS = 5 * 60_000;',
        "reduce sanction polling frequency",
    )

    print()
    print("Patch complete.")
    print("Changed:")
    print("- components/portal/portal-presence-heartbeat.tsx")
    print("- components/sanctions/sanction-capability-ui.tsx")
    print()
    print("Next: run npm run build and review the diff before committing anything.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
