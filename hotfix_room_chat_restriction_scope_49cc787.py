#!/usr/bin/env python3
from pathlib import Path
import argparse, subprocess

BASELINE="49cc7875b249c6fe2bec907fec8d6976ba32b028"

def once(s,a,b,label):
    n=s.count(a)
    if n!=1:
        raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return s.replace(a,b,1)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--dry-run",action="store_true")
    args=ap.parse_args()

    root=Path.cwd()
    if not (root/"package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")

    head=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
    if head!=BASELINE:
        raise SystemExit(f"ERROR: HEAD is {head}; expected {BASELINE}.")

    p=root/"app/(portal)/game/components/RoomChatForm.tsx"
    s=p.read_text(encoding="utf-8")

    wrong='''  if (gameChatRestriction.blocked) { return <div className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-4 sm:p-5"><SanctionRestrictionNotice message={gameChatRestriction.message} /></div>; }

  return (
    <button
      type="submit"
      onClick={onPrepare}'''

    fixed='''  return (
    <button
      type="submit"
      onClick={onPrepare}'''

    s=once(s,wrong,fixed,"remove misplaced restriction from SubmitButton")

    anchor='''  function toggleUtility(
    mode:
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange"
      | "warping",
  ) {
    setUtilityMode((current) =>
      current === mode ? null : mode,
    );
  }

  return (
    <div className="shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-2 sm:px-3 sm:py-2">'''

    replacement='''  function toggleUtility(
    mode:
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange"
      | "warping",
  ) {
    setUtilityMode((current) =>
      current === mode ? null : mode,
    );
  }

  if (gameChatRestriction.blocked) {
    return (
      <div className="shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">
        <SanctionRestrictionNotice
          message={gameChatRestriction.message}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-2 sm:px-3 sm:py-2">'''

    s=once(s,anchor,replacement,"insert restriction into RoomChatForm")

    if args.dry_run:
        print("Baseline:", head[:7])
        print("Prepared 1 local file change:")
        print(r"  app\(portal)\game\components\RoomChatForm.tsx")
        print("\nDRY RUN ONLY — no files written.")
        return

    p.write_text(s,encoding="utf-8",newline="\n")
    print("patched:",p.relative_to(root))
    print("\nApplied LOCALLY only.")
    print("Next: npm run build")

if __name__=="__main__":
    main()
