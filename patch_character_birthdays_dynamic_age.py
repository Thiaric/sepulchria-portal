from pathlib import Path

FILES = {
    "age_util": Path("lib/characters/character-age.ts"),
    "form": Path("app/(portal)/character/CharacterForm.tsx"),
    "save": Path("app/(portal)/character/save-character-v2.ts"),
    "own_sheet": Path("app/(portal)/character/page.tsx"),
    "public_age": Path("components/characters/public-character-age-detail.tsx"),
    "admin_age": Path("app/(portal)/admin/characters/age-actions.ts"),
    "admin_form": Path("components/admin/admin-character-edit-form.tsx"),
}

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for key in ("form", "save", "own_sheet", "public_age", "admin_age", "admin_form"):
    if not FILES[key].exists():
        fail(f"Missing expected file: {FILES[key]}")

if FILES["age_util"].exists():
    fail(f"{FILES['age_util']} already exists; refusing to overwrite it.")

form = FILES["form"].read_text(encoding="utf-8")
save = FILES["save"].read_text(encoding="utf-8")
own_sheet = FILES["own_sheet"].read_text(encoding="utf-8")
public_age = FILES["public_age"].read_text(encoding="utf-8")
admin_age = FILES["admin_age"].read_text(encoding="utf-8")
admin_form = FILES["admin_form"].read_text(encoding="utf-8")

def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        fail(f"Could not uniquely locate {label}: expected 1, found {count}.")
    return source.replace(old, new, 1)

age_util = '''import {
  AURETH_MONTHS,
} from "@/lib/world/calendar";

function parseDateOfBirth(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^(\\d{4})-(\\d{2})-(\\d{2})$/,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const candidate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
      ),
    );

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

export function getCharacterBirthdayParts(
  dateOfBirth: string | null | undefined,
) {
  const parsed =
    parseDateOfBirth(dateOfBirth);

  if (!parsed) {
    return null;
  }

  return {
    month: parsed.month,
    day: parsed.day,
  };
}

export function calculateCharacterAge(
  dateOfBirth: string | null | undefined,
  fallbackAge: number | null | undefined = null,
  now = new Date(),
) {
  const parsed =
    parseDateOfBirth(dateOfBirth);

  if (!parsed) {
    return typeof fallbackAge === "number"
      ? fallbackAge
      : null;
  }

  let age =
    now.getUTCFullYear() - parsed.year;

  const currentMonth =
    now.getUTCMonth() + 1;

  const currentDay =
    now.getUTCDate();

  const birthdayHasHappened =
    currentMonth > parsed.month ||
    (
      currentMonth === parsed.month &&
      currentDay >= parsed.day
    );

  if (!birthdayHasHappened) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function formatCharacterBirthday(
  dateOfBirth: string | null | undefined,
) {
  const parsed =
    parseDateOfBirth(dateOfBirth);

  if (!parsed) {
    return null;
  }

  return `${parsed.day} ${AURETH_MONTHS[parsed.month - 1]}`;
}

export function buildCharacterDateOfBirth(
  age: number,
  birthdayMonth: number,
  birthdayDay: number,
  now = new Date(),
) {
  if (
    !Number.isInteger(age) ||
    age < 0 ||
    !Number.isInteger(birthdayMonth) ||
    birthdayMonth < 1 ||
    birthdayMonth > 12 ||
    !Number.isInteger(birthdayDay) ||
    birthdayDay < 1 ||
    birthdayDay > 31
  ) {
    throw new Error(
      "Age and birthday are invalid.",
    );
  }

  const currentYear =
    now.getUTCFullYear();

  const currentMonth =
    now.getUTCMonth() + 1;

  const currentDay =
    now.getUTCDate();

  const birthdayHasHappened =
    currentMonth > birthdayMonth ||
    (
      currentMonth === birthdayMonth &&
      currentDay >= birthdayDay
    );

  const birthYear =
    currentYear -
    age -
    (birthdayHasHappened ? 0 : 1);

  const candidate =
    new Date(
      Date.UTC(
        birthYear,
        birthdayMonth - 1,
        birthdayDay,
        12,
      ),
    );

  if (
    candidate.getUTCFullYear() !== birthYear ||
    candidate.getUTCMonth() !== birthdayMonth - 1 ||
    candidate.getUTCDate() !== birthdayDay
  ) {
    throw new Error(
      "That birthday does not exist in the selected Aureth month.",
    );
  }

  const month = String(birthdayMonth).padStart(2, "0");
  const day = String(birthdayDay).padStart(2, "0");

  return `${birthYear}-${month}-${day}`;
}
'''

form = replace_once(
    form,
    'import { CharacterAttributeAllocator } from "@/components/characters/character-attribute-allocator";\n',
    'import { CharacterAttributeAllocator } from "@/components/characters/character-attribute-allocator";\nimport { AURETH_MONTHS } from "@/lib/world/calendar";\nimport { getCharacterBirthdayParts } from "@/lib/characters/character-age";\n',
    "CharacterForm imports",
)

form = replace_once(
    form,
    '  const [ancestryGiftIds, setAncestryGiftIds] = useState<string[]>([]);\n  const [age, setAge] = useState(String(character?.age ?? ""));\n  const [error, setError] = useState<string | null>(null);\n',
    '''  const [ancestryGiftIds, setAncestryGiftIds] = useState<string[]>([]);
  const [age, setAge] = useState(String(character?.age ?? ""));
  const initialBirthday = getCharacterBirthdayParts(
    typeof character?.date_of_birth === "string"
      ? character.date_of_birth
      : null,
  );
  const [birthdayMonth, setBirthdayMonth] = useState(
    initialBirthday ? String(initialBirthday.month) : "",
  );
  const [birthdayDay, setBirthdayDay] = useState(
    initialBirthday ? String(initialBirthday.day) : "",
  );
  const [error, setError] = useState<string | null>(null);
''',
    "CharacterForm age state",
)

form = replace_once(
    form,
    '''  function validateAge() {
    const numeric = Number(age);
    if (!race) return "Choose an ancestry before continuing.";
    if (race.min_age === null) return "This ancestry has no playable age range configured.";
    if (!Number.isInteger(numeric)) return "Choose a valid whole-number age.";
    if (numeric < race.min_age) return `${race.name} characters must be at least ${race.min_age} years old.`;
    if (race.max_age !== null && numeric > race.max_age)
      return `${race.name} characters may be no older than ${race.max_age} years.`;
    return null;
  }
''',
    '''  function validateAge() {
    const numeric = Number(age);
    if (!race) return "Choose an ancestry before continuing.";
    if (race.min_age === null) return "This ancestry has no playable age range configured.";
    if (!Number.isInteger(numeric)) return "Choose a valid whole-number age.";
    if (numeric < race.min_age) return `${race.name} characters must be at least ${race.min_age} years old.`;
    if (race.max_age !== null && numeric > race.max_age)
      return `${race.name} characters may be no older than ${race.max_age} years.`;
    return null;
  }

  function validateBirthday() {
    const month = Number(birthdayMonth);
    const day = Number(birthdayDay);

    if (!Number.isInteger(month) || month < 1 || month > 12)
      return "Choose your character's birth month.";
    if (!Number.isInteger(day) || day < 1 || day > 31)
      return "Choose your character's birth day.";
    return null;
  }
''',
    "CharacterForm validation",
)

form = replace_once(
    form,
    '''      else if (!["male", "female", "non_binary"].includes(value("gender")))
        message = "Choose a gender before continuing.";
      else message = validateAge();
''',
    '''      else if (!["male", "female", "non_binary"].includes(value("gender")))
        message = "Choose a gender before continuing.";
      else message = validateAge() ?? validateBirthday();
''',
    "CharacterForm identity validation",
)

old_age_ui = '''            <label className="character_characterform_label_label_2">
              <Label>Age *</Label>
              <input
                name="age"
                type="number"
                required
                value={age}
                min={race?.min_age ?? undefined}
                max={race?.max_age ?? undefined}
                disabled={!race || race.min_age === null}
                onChange={(event) => setAge(event.target.value)}
                className={[((inputClass)), "character_characterform_input_age"].filter(Boolean).join(" ")}
              />
              <span className="mt-2 block text-xs text-[rgb(var(--sep-colour-766b5d))] character_characterform_span_text_5">
                {race?.min_age === null || !race
                  ? "Choose a configured ancestry first."
                  : race.max_age === null
                    ? `${race.min_age}+ years`
                    : `${race.min_age}\u2013${race.max_age} years`}
              </span>
            </label>
'''

new_age_ui = '''            <label className="character_characterform_label_label_2">
              <Label>Starting age *</Label>
              <input
                name="age"
                type="number"
                required
                value={age}
                min={race?.min_age ?? undefined}
                max={race?.max_age ?? undefined}
                disabled={!race || race.min_age === null}
                onChange={(event) => setAge(event.target.value)}
                className={[((inputClass)), "character_characterform_input_age"].filter(Boolean).join(" ")}
              />
              <span className="mt-2 block text-xs text-[rgb(var(--sep-colour-766b5d))] character_characterform_span_text_5">
                {race?.min_age === null || !race
                  ? "Choose a configured ancestry first."
                  : race.max_age === null
                    ? `${race.min_age}+ years at character creation`
                    : `${race.min_age}\u2013${race.max_age} years at character creation`}
              </span>
            </label>

            <label className="character_characterform_label_birthday_month">
              <Label>Birth month *</Label>
              <select
                name="birthday_month"
                required
                value={birthdayMonth}
                onChange={(event) => setBirthdayMonth(event.target.value)}
                className={[inputClass, "character_characterform_select_birthday_month"].filter(Boolean).join(" ")}
              >
                <option value="">Choose Aureth month</option>
                {AURETH_MONTHS.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </label>

            <label className="character_characterform_label_birthday_day">
              <Label>Birth day *</Label>
              <select
                name="birthday_day"
                required
                value={birthdayDay}
                onChange={(event) => setBirthdayDay(event.target.value)}
                className={[inputClass, "character_characterform_select_birthday_day"].filter(Boolean).join(" ")}
              >
                <option value="">Choose day</option>
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </label>
'''
form = replace_once(form, old_age_ui, new_age_ui, "CharacterForm age UI")

save = replace_once(
    save,
    'import {\n  applyGiftOwnershipHealthEffects,\n} from "@/lib/gifts/gift-health-effects";\n',
    'import {\n  applyGiftOwnershipHealthEffects,\n} from "@/lib/gifts/gift-health-effects";\nimport { buildCharacterDateOfBirth } from "@/lib/characters/character-age";\n',
    "save-character-v2 import",
)

save = replace_once(
    save,
    '''  if (
    !Number.isInteger(age) ||
    age < 0
  ) {
    fail(
      mode,
      "Choose a valid whole-number age.",
    );
  }

  const portraitUrl = text(
''',
    '''  if (
    !Number.isInteger(age) ||
    age < 0
  ) {
    fail(
      mode,
      "Choose a valid whole-number age.",
    );
  }

  const birthdayMonth = Number(
    text(formData, "birthday_month", 2),
  );
  const birthdayDay = Number(
    text(formData, "birthday_day", 2),
  );

  let dateOfBirth: string;

  try {
    dateOfBirth = buildCharacterDateOfBirth(
      age,
      birthdayMonth,
      birthdayDay,
    );
  } catch (error) {
    fail(
      mode,
      error instanceof Error
        ? error.message
        : "Choose a valid birthday.",
    );
  }

  const portraitUrl = text(
''',
    "save-character-v2 birthday parsing",
)

save = replace_once(
    save,
    '''    age,

    birthplace: "Sepulchria",
''',
    '''    age,

    date_of_birth:
      dateOfBirth,

    birthplace: "Sepulchria",
''',
    "save-character-v2 common DOB",
)

save = replace_once(
    save,
    '''          date_of_birth: null,

          /*
''',
    '''          date_of_birth:
            dateOfBirth,

          /*
''',
    "save-character-v2 create DOB",
)

own_sheet = replace_once(
    own_sheet,
    'import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";\n',
    'import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";\nimport { calculateCharacterAge, formatCharacterBirthday } from "@/lib/characters/character-age";\n',
    "own sheet age import",
)

own_sheet = replace_once(
    own_sheet,
    '''  const canSubmit =
    own &&
    (status === "draft" ||
      status === "rejected");

  const items = [
''',
    '''  const canSubmit =
    own &&
    (status === "draft" ||
      status === "rejected");

  const effectiveAge = calculateCharacterAge(
    character.date_of_birth,
    character.age,
  );

  const birthday = formatCharacterBirthday(
    character.date_of_birth,
  );

  const items = [
''',
    "own sheet age calculation",
)

own_sheet = replace_once(
    own_sheet,
    '''  [
    "Age",
    character.age !== null &&
    character.age !== undefined
      ? `${character.age} years`
      : null,
  ],
  [
    "Birthplace",
''',
    '''  [
    "Age",
    effectiveAge !== null
      ? `${effectiveAge} years`
      : null,
  ],
  [
    "Birthday",
    birthday,
  ],
  [
    "Birthplace",
''',
    "own sheet age display",
)

public_age = '''import {
  calculateCharacterAge,
  formatCharacterBirthday,
} from "@/lib/characters/character-age";
import { createClient } from "@/lib/supabase/server";

export async function PublicCharacterAgeDetail({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("characters")
    .select("age, date_of_birth")
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load public character age:",
      error.message,
    );
  }

  const storedAge =
    typeof data?.age === "number"
      ? data.age
      : null;

  const age = calculateCharacterAge(
    data?.date_of_birth ?? null,
    storedAge,
  );

  const birthday = formatCharacterBirthday(
    data?.date_of_birth ?? null,
  );

  return (
    <div className="space-y-2 components_characters_public_character_age_detail_div_container">
      <div>
        <dt className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Age
        </dt>
        <dd className="mt-1 text-sm text-[rgb(var(--sep-colour-d4c4ad))]">
          {age !== null ? `${age} years` : "Not provided"}
        </dd>
      </div>
      <div>
        <dt className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Birthday
        </dt>
        <dd className="mt-1 text-sm text-[rgb(var(--sep-colour-d4c4ad))]">
          {birthday ?? "Not provided"}
        </dd>
      </div>
    </div>
  );
}
'''

admin_age = replace_once(
    admin_age,
    'import { createAdminClient } from "@/lib/supabase/admin";\n',
    'import { createAdminClient } from "@/lib/supabase/admin";\nimport { buildCharacterDateOfBirth, calculateCharacterAge, getCharacterBirthdayParts } from "@/lib/characters/character-age";\n',
    "admin age imports",
)

admin_age = replace_once(
    admin_age,
    '''export type AdminAgeConfig = {
  age: number | null;
  races: RaceAgeOption[];
};
''',
    '''export type AdminAgeConfig = {
  age: number | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  races: RaceAgeOption[];
};
''',
    "AdminAgeConfig",
)

admin_age = replace_once(
    admin_age,
    '''      .from("characters")
      .select("age")
      .eq("id", characterId)
''',
    '''      .from("characters")
      .select("age, date_of_birth")
      .eq("id", characterId)
''',
    "admin age query",
)

admin_age = replace_once(
    admin_age,
    '''  return {
    age:
      typeof characterResult.data
        .age === "number"
        ? characterResult.data.age
        : null,

    races:
''',
    '''  const birthday = getCharacterBirthdayParts(
    characterResult.data.date_of_birth,
  );

  return {
    age: calculateCharacterAge(
      characterResult.data.date_of_birth,
      typeof characterResult.data.age === "number"
        ? characterResult.data.age
        : null,
    ),
    birthdayMonth: birthday?.month ?? null,
    birthdayDay: birthday?.day ?? null,

    races:
''',
    "admin age config response",
)

admin_age = replace_once(
    admin_age,
    '''    const age =
      Number(ageRaw);

    const selectedGiftIds =
''',
    '''    const age =
      Number(ageRaw);

    const birthdayMonthRaw = String(
      formData.get("birthdayMonth") ?? "",
    ).trim();
    const birthdayDayRaw = String(
      formData.get("birthdayDay") ?? "",
    ).trim();
    const birthdayMonth = Number(birthdayMonthRaw);
    const birthdayDay = Number(birthdayDayRaw);

    const selectedGiftIds =
''',
    "admin birthday parsing",
)

admin_age = replace_once(
    admin_age,
    '''    if (
      ageRaw &&
      race.max_age !== null &&
      age >
        race.max_age
    ) {
      return {
        ok: false,
        error:
          `${race.name} characters may be no older than ${race.max_age} years.`,
      };
    }

    /*
     * Validate the submitted Ancestry Feats.
''',
    '''    /*
     * max_age is a creation ceiling only. Existing Characters may
     * naturally age beyond it.
     */
    let dateOfBirth: string | null = null;

    if (ageRaw && !isNpcCharacter) {
      if (!birthdayMonthRaw || !birthdayDayRaw) {
        return {
          ok: false,
          error: "Birthday month and day are required.",
        };
      }

      try {
        dateOfBirth = buildCharacterDateOfBirth(
          age,
          birthdayMonth,
          birthdayDay,
        );
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Birthday is invalid.",
        };
      }
    }

    /*
     * Validate the submitted Ancestry Feats.
''',
    "admin max age / birthday validation",
)

admin_age = replace_once(
    admin_age,
    '''        race_id:
          raceId,

        /*
         * Retire legacy DOB once the
         * character uses the Age system.
         */
        date_of_birth:
          null,

        updated_at:
''',
    '''        race_id:
          raceId,

        date_of_birth:
          dateOfBirth,

        updated_at:
''',
    "admin DOB save",
)

admin_form = replace_once(
    admin_form,
    '} from "@/app/(portal)/admin/characters/age-actions";\n\nconst ATTRIBUTE_NAMES = [\n',
    '} from "@/app/(portal)/admin/characters/age-actions";\nimport { AURETH_MONTHS } from "@/lib/world/calendar";\n\nconst ATTRIBUTE_NAMES = [\n',
    "admin form Aureth import",
)

admin_form = replace_once(
    admin_form,
    '''  const [age, setAge] =
    useState("");

  const [loadingAge, setLoadingAge] =
''',
    '''  const [age, setAge] =
    useState("");

  const [birthdayMonth, setBirthdayMonth] =
    useState("");

  const [birthdayDay, setBirthdayDay] =
    useState("");

  const [loadingAge, setLoadingAge] =
''',
    "admin form birthday state",
)

admin_form = replace_once(
    admin_form,
    '''          setAge(
            config.age === null
              ? ""
              : String(config.age),
          );
        })
''',
    '''          setAge(
            config.age === null
              ? ""
              : String(config.age),
          );
          setBirthdayMonth(
            config.birthdayMonth === null
              ? ""
              : String(config.birthdayMonth),
          );
          setBirthdayDay(
            config.birthdayDay === null
              ? ""
              : String(config.birthdayDay),
          );
        })
''',
    "admin form config load",
)

admin_form = replace_once(
    admin_form,
    '''    if (
      selectedRace.max_age !==
        null &&
      numericAge >
        selectedRace.max_age
    ) {
      setAgeError(
        `${selectedRace.name} characters may be no older than ${selectedRace.max_age} years.`,
      );
      return false;
    }

    setAgeError(null);
    return true;
''',
    '''    if (!birthdayMonth || !birthdayDay) {
      setAgeError(
        "Choose the Character's Aureth birth month and day.",
      );
      return false;
    }

    setAgeError(null);
    return true;
''',
    "admin form age validation",
)

admin_form = replace_once(
    admin_form,
    '''    formData.set("age", age);

    const result =
''',
    '''    formData.set("age", age);
    formData.set("birthdayMonth", birthdayMonth);
    formData.set("birthdayDay", birthdayDay);

    const result =
''',
    "admin form submit birthday",
)

admin_form = replace_once(
    admin_form,
    '''          max={
            selectedRace?.max_age ??
            undefined
          }
''',
    '',
    "admin age max attribute",
)

admin_form = replace_once(
    admin_form,
    '''        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_edit_form_p_text_2">
''',
    '''        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Aureth birth month
            </span>
            <select
              name="birthdayMonth"
              value={birthdayMonth}
              onChange={(event) => setBirthdayMonth(event.target.value)}
              required
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            >
              <option value="">Choose month</option>
              {AURETH_MONTHS.map((monthName, index) => (
                <option key={monthName} value={index + 1}>{monthName}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Birth day
            </span>
            <select
              name="birthdayDay"
              value={birthdayDay}
              onChange={(event) => setBirthdayDay(event.target.value)}
              required
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            >
              <option value="">Choose day</option>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_edit_form_p_text_2">
''',
    "admin birthday controls",
)

admin_form = replace_once(
    admin_form,
    '''                  : `${selectedRace.name}: ${selectedRace.min_age} - ${selectedRace.max_age} years`}
''',
    '''                  : `${selectedRace.name}: starting range ${selectedRace.min_age} - ${selectedRace.max_age} years; existing Characters may age beyond it`}
''',
    "admin range help text",
)

FILES["age_util"].parent.mkdir(parents=True, exist_ok=True)
FILES["age_util"].write_text(age_util, encoding="utf-8")
FILES["form"].write_text(form, encoding="utf-8")
FILES["save"].write_text(save, encoding="utf-8")
FILES["own_sheet"].write_text(own_sheet, encoding="utf-8")
FILES["public_age"].write_text(public_age, encoding="utf-8")
FILES["admin_age"].write_text(admin_age, encoding="utf-8")
FILES["admin_form"].write_text(admin_form, encoding="utf-8")

print("SUCCESS")
print("Created:")
print(f"  {FILES['age_util']}")
print("Updated:")
for key in ("form", "save", "own_sheet", "public_age", "admin_age", "admin_form"):
    print(f"  {FILES[key]}")
print()
print("No SQL migration required: characters.date_of_birth already exists.")
print("Next: npm run build")
