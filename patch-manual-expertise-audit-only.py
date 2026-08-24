from pathlib import Path
import shutil
import subprocess

ROOT = Path.cwd()
EXPECTED = "2321288071dd371b8aeb0aaf11e9ce2ac0f55d75"

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"ERROR: missing file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel, text):
    p = ROOT / rel
    backup = p.with_suffix(
        p.suffix + ".before-manual-expertise-audit.bak"
    )
    if not backup.exists():
        shutil.copy2(p, backup)
    p.write_text(text, encoding="utf-8")
    print(f"Updated: {rel}")

def replace_once(text, old, new, rel, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"PRECHECK FAILED in {rel}: "
            f"{label} expected once, found {count}."
        )
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        "PRECHECK FAILED: this patch was built for pushed commit "
        f"{EXPECTED[:7]}, but current HEAD is {head[:7]}."
    )

rel = "app/(portal)/admin/expertise/actions.ts"
text = read(rel)

text = replace_once(
    text,
    '''  const { error } = await supabase.rpc("staff_award_expertise", {
    p_character_id: characterId,
    p_amount: amount,
    p_note: note || null,
  });''',
    '''  const { error } = await supabase.rpc(
    "staff_award_expertise_with_character_audit",
    {
      p_character_id: characterId,
      p_amount: amount,
      p_note: note || null,
    },
  );''',
    rel,
    "manual Expertise audited RPC",
)

write(rel, text)

print("")
print("Manual Expertise audit patch applied.")
print("Run: npm run build")
