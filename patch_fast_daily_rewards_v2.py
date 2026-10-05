from pathlib import Path
import sys

ROOT = Path.cwd()

def load(rel):
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing {rel}. Run from the sepulchria-portal repository root.")
    return p, p.read_text(encoding="utf-8")

def main():
    p, text = load("app/(portal)/missions/actions.ts")

    old = '''  revalidatePath("/missions");
  revalidatePath("/character");'''

    count = text.count(old)
    if count != 2:
        raise RuntimeError(
            f"Expected exactly 2 mission revalidation pairs, found {count}. No changes written."
        )

    text = text.replace(
        old,
        '''  revalidatePath("/character");''',
        2,
    )

    p.write_text(text, encoding="utf-8")
    print("OK: removed /missions revalidation from both reward claim actions")

    p, text = load("components/missions/daily-reward-claim.tsx")

    old = '''  const [showMessage, setShowMessage] = useState(false);

useEffect(() => {'''
    new = '''  const [showMessage, setShowMessage] = useState(false);
  const [locallyClaimed, setLocallyClaimed] =
    useState(claimed);

  useEffect(() => {
    setLocallyClaimed(claimed);
  }, [claimed]);

useEffect(() => {'''

    if text.count(old) != 1:
        raise RuntimeError("Could not uniquely find DailyRewardClaim state insertion point.")
    text = text.replace(old, new, 1)

    old = '''  if (state.success) {
  window.dispatchEvent('''
    new = '''  if (state.success) {
  setLocallyClaimed(true);

  window.dispatchEvent('''

    if text.count(old) != 1:
        raise RuntimeError("Could not uniquely find successful claim effect.")
    text = text.replace(old, new, 1)

    old = '''          claimed ||
          pending'''
    new = '''          locallyClaimed ||
          pending'''

    if text.count(old) != 1:
        raise RuntimeError("Could not uniquely find claim disabled condition.")
    text = text.replace(old, new, 1)

    old = '''          : claimed
            ? "Claimed"'''
    new = '''          : locallyClaimed
            ? "Claimed"'''

    if text.count(old) != 1:
        raise RuntimeError("Could not uniquely find claim label condition.")
    text = text.replace(old, new, 1)

    p.write_text(text, encoding="utf-8")
    print("OK: reward claim UI now flips to Claimed immediately")

    p, text = load("components/missions/missions-live-sync.tsx")

    old = '''  useEffect(() => {
    void sync();

    const timer ='''
    new = '''  useEffect(() => {
    const timer ='''

    if text.count(old) != 1:
        raise RuntimeError("Could not uniquely find initial MissionsLiveSync call.")
    text = text.replace(old, new, 1)

    p.write_text(text, encoding="utf-8")
    print("OK: removed duplicate mission sync on mount")

    print()
    print("Patch complete.")
    print("Run: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
