from pathlib import Path

ACTIONS = Path("app/(portal)/admin/characters/actions.ts")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

if not ACTIONS.exists():
    fail(f"Missing expected file: {ACTIONS}")

source = ACTIONS.read_text(encoding="utf-8")

old = '''  const dateOfBirth =
    readOptionalText(
      formData.get(
        "dateOfBirth",
      ),
      20,
    );
'''

new = '''  const submittedDateOfBirth =
    readOptionalText(
      formData.get(
        "dateOfBirth",
      ),
      20,
    );
'''

if source.count(old) != 1:
    fail(
        "Could not uniquely locate the admin dateOfBirth reader "
        f"(matches: {source.count(old)})."
    )

source = source.replace(old, new, 1)

old = '''  const effectiveSurname =
    isNpcCharacter
      ? character.surname
      : surname;

  const raceIds = [
'''

new = '''  const effectiveSurname =
    isNpcCharacter
      ? character.surname
      : surname;

  /*
   * The normal Character admin form deliberately disables/hides the
   * legacy dateOfBirth input because Birthday is now managed by the
   * Age/Birthday controls.
   *
   * saveAdminCharacterAge() runs immediately before this action and
   * writes the calculated date_of_birth. Because disabled form controls
   * are omitted from FormData, this action must preserve the value that
   * is already in the database instead of replacing it with null.
   *
   * NPC/legacy flows that still explicitly submit dateOfBirth continue
   * to be honoured.
   */
  const effectiveDateOfBirth =
    submittedDateOfBirth ??
    character.date_of_birth;

  const raceIds = [
'''

if source.count(old) != 1:
    fail(
        "Could not uniquely locate the effective identity block "
        f"(matches: {source.count(old)})."
    )

source = source.replace(old, new, 1)

old = '''      date_of_birth:
        dateOfBirth,
'''

new = '''      date_of_birth:
        effectiveDateOfBirth,
'''

if source.count(old) != 1:
    fail(
        "Could not uniquely locate candidatePayload date_of_birth "
        f"(matches: {source.count(old)})."
    )

source = source.replace(old, new, 1)

# Important: currentValues must continue using character.date_of_birth.
# This check catches an accidental extra replacement or unexpected file shape.
expected_current = '''      date_of_birth:
        character.date_of_birth,
'''
if source.count(expected_current) != 1:
    fail(
        "Could not validate currentValues date_of_birth preservation "
        f"(matches: {source.count(expected_current)})."
    )

ACTIONS.write_text(source, encoding="utf-8")

print("SUCCESS")
print(f"Updated: {ACTIONS}")
print()
print("Fix:")
print("  - Admin Age/Birthday save may write date_of_birth.")
print("  - The following main admin save now PRESERVES that DOB")
print("    instead of overwriting it with null.")
print()
print("IMPORTANT:")
print("  Any birthday previously saved before this fix was likely erased.")
print("  After applying this patch, save that character's birthday once again.")
print()
print("Next: npm run build")
