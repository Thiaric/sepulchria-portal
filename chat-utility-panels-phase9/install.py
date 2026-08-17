from pathlib import Path

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
REL = Path("app/(portal)/game/components/RoomChatForm.tsx")
PATH = ROOT / REL

if not (ROOT / "package.json").exists():
    raise SystemExit(
        "ERROR: Run this installer from the sepulchria-portal repository root."
    )

if not PATH.exists():
    raise SystemExit(f"ERROR: Missing {REL.as_posix()}")

s = PATH.read_text(encoding="utf-8")

old_state = """  const [itemMode, setItemMode] =
    useState(false);
"""

new_state = """  const [utilityMode, setUtilityMode] =
    useState<
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | null
    >(null);
"""

if old_state not in s:
    raise SystemExit(
        "ERROR: Inventory Phase 9 itemMode state not found. "
        "Make sure this is being installed over the pushed Phase 9 code."
    )

s = s.replace(old_state, new_state, 1)

start_marker = """  return (
    <div className="shrink-0 border-t border-[#59432c]/40 bg-[#17110d] p-3 sm:p-4">"""

end_marker = """
function SubmitButton({
"""

start = s.find(start_marker)
end = s.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit(
        "ERROR: Could not locate the current RoomChatForm render block."
    )

replacement = (HERE / "replacement.txt").read_text(encoding="utf-8")
helper = (HERE / "helper.txt").read_text(encoding="utf-8")

s = s[:start] + replacement + "\n" + helper + s[end:]

PATH.write_text(s, encoding="utf-8")

print(f"Updated: {REL.as_posix()}")
print()
print("SUCCESS")
print("Chat utility panels installed.")
print("No SQL is required.")
print("Now run: npm run build")
