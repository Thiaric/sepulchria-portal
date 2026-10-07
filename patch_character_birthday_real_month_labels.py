from pathlib import Path

CALENDAR = Path("lib/world/calendar.ts")
AGE = Path("lib/characters/character-age.ts")
FORM = Path("app/(portal)/character/CharacterForm.tsx")
ADMIN_FORM = Path("components/admin/admin-character-edit-form.tsx")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for path in (CALENDAR, AGE, FORM, ADMIN_FORM):
    if not path.exists():
        fail(f"Missing expected file: {path}")

calendar = CALENDAR.read_text(encoding="utf-8")
age = AGE.read_text(encoding="utf-8")
form = FORM.read_text(encoding="utf-8")
admin_form = ADMIN_FORM.read_text(encoding="utf-8")

def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        fail(f"Could not uniquely locate {label}: expected 1, found {count}.")
    return source.replace(old, new, 1)

calendar = replace_once(
    calendar,
    '''export const AURETH_MONTHS = [
  "Frostern",
  "Molakorn",
  "Estaron",
  "Ameron",
  "Paneron",
  "Soltiron",
  "Flameron",
  "Wanern",
  "Vintorn",
  "Bifron",
  "Morsern",
  "Nochern",
] as const;
''',
    '''export const AURETH_MONTHS = [
  "Frostern",
  "Molakorn",
  "Estaron",
  "Ameron",
  "Paneron",
  "Soltiron",
  "Flameron",
  "Wanern",
  "Vintorn",
  "Bifron",
  "Morsern",
  "Nochern",
] as const;

export const REAL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
''',
    "Aureth months block",
)

age = replace_once(
    age,
    '''import {
  AURETH_MONTHS,
} from "@/lib/world/calendar";
''',
    '''import {
  AURETH_MONTHS,
  REAL_MONTHS,
} from "@/lib/world/calendar";
''',
    "character-age imports",
)

age = replace_once(
    age,
    '''export function formatCharacterBirthday(
  dateOfBirth: string | null | undefined,
) {
  const parsed =
    parseDateOfBirth(dateOfBirth);

  if (!parsed) return null;

  return `${parsed.day} ${
    AURETH_MONTHS[
      parsed.month - 1
    ]
  }`;
}
''',
    '''function ordinalDay(
  day: number,
) {
  const mod100 =
    day % 100;

  if (
    mod100 >= 11 &&
    mod100 <= 13
  ) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatCharacterBirthday(
  dateOfBirth: string | null | undefined,
) {
  const parsed =
    parseDateOfBirth(dateOfBirth);

  if (!parsed) return null;

  const monthIndex =
    parsed.month - 1;

  return `${parsed.day} ${
    AURETH_MONTHS[
      monthIndex
    ]
  } [${
    ordinalDay(
      parsed.day,
    )
  } of ${
    REAL_MONTHS[
      monthIndex
    ]
  }]`;
}
''',
    "birthday formatter",
)

form = replace_once(
    form,
    '''import {
  AURETH_MONTHS,
} from "@/lib/world/calendar";
''',
    '''import {
  AURETH_MONTHS,
  REAL_MONTHS,
} from "@/lib/world/calendar";
''',
    "CharacterForm calendar import",
)

form = replace_once(
    form,
    '''                      {monthName}
''',
    '''                      {monthName} [{REAL_MONTHS[index]}]
''',
    "CharacterForm birthday month option",
)

admin_form = replace_once(
    admin_form,
    '''import {
  AURETH_MONTHS,
} from "@/lib/world/calendar";
''',
    '''import {
  AURETH_MONTHS,
  REAL_MONTHS,
} from "@/lib/world/calendar";
''',
    "admin calendar import",
)

admin_form = replace_once(
    admin_form,
    '''                    {monthName}
''',
    '''                    {monthName} [{REAL_MONTHS[index]}]
''',
    "admin birthday month option",
)

CALENDAR.write_text(calendar, encoding="utf-8")
AGE.write_text(age, encoding="utf-8")
FORM.write_text(form, encoding="utf-8")
ADMIN_FORM.write_text(admin_form, encoding="utf-8")

print("SUCCESS")
print("Updated:")
for path in (CALENDAR, AGE, FORM, ADMIN_FORM):
    print(f"  {path}")
print()
print("Birthday display example:")
print("  18 Flameron [18th of July]")
print()
print("Month select example:")
print("  Flameron [July]")
print()
print("Next: npm run build")
