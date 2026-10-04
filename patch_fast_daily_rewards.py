from pathlib import Path
import sys

ROOT = Path.cwd()

def load(rel):
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing {rel}. Run from the sepulchria-portal repository root.")
    return p, p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)

def main():
    # 1) Do not force a full /missions Server Component revalidation
    # after a successful claim. The claim component can update itself
    # immediately and MissionsLiveSync will keep the page coherent.
    p, text = load("app/(portal)/missions/actions.ts")
    text = replace_once(
        text,
        '''  revalidatePath("/missions");
  revalidatePath("/character");''',
        '''  revalidatePath("/character");''',
        "remove current-page mission revalidation",
    )
    # There are two claim actions with the same pair.
    text = replace_once(
        text,
        '''  revalidatePath("/missions");
  revalidatePath("/character");''',
        '''  revalidatePath("/character");''',
        "remove current-page milestone revalidation",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: app/(portal)/missions/actions.ts")

    # 2) Make a claimed reward look claimed immediately on the client.
    p, text = load("components/missions/daily-reward-claim.tsx")
    text = replace_once(
        text,
        '''  const [showMessage, setShowMessage] = useState(false);

useEffect(() => {''',
        '''  const [showMessage, setShowMessage] = useState(false);
  const [locallyClaimed, setLocallyClaimed] =
    useState(claimed);

  useEffect(() => {
    setLocallyClaimed(claimed);
  }, [claimed]);

useEffect(() => {''',
        "add local claimed state",
    )
    text = replace_once(
        text,
        '''  if (state.success) {
  window.dispatchEvent(''',
        '''  if (state.success) {
  setLocallyClaimed(true);

  window.dispatchEvent(''',
        "mark reward claimed immediately",
    )
    text = text.replace(
        '''          claimed ||
          pending''',
        '''          locallyClaimed ||
          pending''',
    )
    text = text.replace(
        '''          : claimed
            ? "Claimed"''',
        '''          : locallyClaimed
            ? "Claimed"''',
    )
    p.write_text(text, encoding="utf-8")
    print("OK: components/missions/daily-reward-claim.tsx")

    # 3) The server-rendered Missions page has already refreshed mission
    # progress. Do not immediately repeat the refresh RPC + table reads
    # as soon as the client component mounts.
    p, text = load("components/missions/missions-live-sync.tsx")
    text = replace_once(
        text,
        '''  useEffect(() => {
    void sync();

    const timer =''',
        '''  useEffect(() => {
    const timer =''',
        "remove duplicate mission sync on mount",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: components/missions/missions-live-sync.tsx")

    print()
    print("Patch complete.")
    print("Daily reward claims should acknowledge much faster because they no longer")
    print("force the current /missions page to rebuild after every claim.")
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
