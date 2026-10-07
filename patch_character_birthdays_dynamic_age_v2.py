from pathlib import Path
import re

AGE_UTIL = Path("lib/characters/character-age.ts")
FORM = Path("app/(portal)/character/CharacterForm.tsx")
SAVE = Path("app/(portal)/character/save-character-v2.ts")
OWN_SHEET = Path("app/(portal)/character/page.tsx")
PUBLIC_AGE = Path("components/characters/public-character-age-detail.tsx")
ADMIN_AGE = Path("app/(portal)/admin/characters/age-actions.ts")
ADMIN_FORM = Path("components/admin/admin-character-edit-form.tsx")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for path in (FORM, SAVE, OWN_SHEET, PUBLIC_AGE, ADMIN_AGE, ADMIN_FORM):
    if not path.exists():
        fail(f"Missing expected file: {path}")

if AGE_UTIL.exists():
    fail(f"{AGE_UTIL} already exists. Revert/remove any partial previous attempt first.")

form = FORM.read_text(encoding="utf-8")
save = SAVE.read_text(encoding="utf-8")
own_sheet = OWN_SHEET.read_text(encoding="utf-8")
admin_age = ADMIN_AGE.read_text(encoding="utf-8")
admin_form = ADMIN_FORM.read_text(encoding="utf-8")

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
  if (!value) return null;

  const match =
    value.match(
      /^(\\d{4})-(\\d{2})-(\\d{2})$/,
    );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

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

  if (!parsed) return null;

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
    now.getUTCFullYear() -
    parsed.year;

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

  if (!parsed) return null;

  return `${parsed.day} ${
    AURETH_MONTHS[
      parsed.month - 1
    ]
  }`;
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
    (
      birthdayHasHappened
        ? 0
        : 1
    );

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

  const month =
    String(birthdayMonth).padStart(2, "0");

  const day =
    String(birthdayDay).padStart(2, "0");

  return `${birthYear}-${month}-${day}`;
}
'''

form = replace_once(
    form,
    'import { CharacterAttributeAllocator } from "@/components/characters/character-attribute-allocator";\n',
    '''import { CharacterAttributeAllocator } from "@/components/characters/character-attribute-allocator";
import {
  AURETH_MONTHS,
} from "@/lib/world/calendar";
import {
  calculateCharacterAge,
  getCharacterBirthdayParts,
} from "@/lib/characters/character-age";
''',
    "CharacterForm imports",
)

form = replace_once(
    form,
    '''  const [ancestryGiftIds, setAncestryGiftIds] = useState<string[]>([]);
  const [age, setAge] = useState(String(character?.age ?? ""));
  const [error, setError] = useState<string | null>(null);
''',
    '''  const [ancestryGiftIds, setAncestryGiftIds] = useState<string[]>([]);

  const initialBirthday =
    getCharacterBirthdayParts(
      typeof character?.date_of_birth ===
        "string"
        ? character.date_of_birth
        : null,
    );

  const [age, setAge] =
    useState(
      String(
        calculateCharacterAge(
          typeof character?.date_of_birth ===
            "string"
            ? character.date_of_birth
            : null,
          typeof character?.age ===
            "number"
            ? character.age
            : null,
        ) ?? "",
      ),
    );

  const [
    birthdayMonth,
    setBirthdayMonth,
  ] = useState(
    initialBirthday
      ? String(initialBirthday.month)
      : "",
  );

  const [
    birthdayDay,
    setBirthdayDay,
  ] = useState(
    initialBirthday
      ? String(initialBirthday.day)
      : "",
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
    if (
      mode === "create" &&
      race.max_age !== null &&
      numeric > race.max_age
    )
      return `${race.name} characters may be no older than ${race.max_age} years when created.`;
    return null;
  }

  function validateBirthday() {
    const month = Number(birthdayMonth);
    const day = Number(birthdayDay);

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return "Choose your character's birth month.";
    }

    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return "Choose your character's birth day.";
    }

    return null;
  }
''',
    "CharacterForm age validation",
)

form = replace_once(
    form,
    '''      else if (!["male", "female", "non_binary"].includes(value("gender")))
        message = "Choose a gender before continuing.";
      else message = validateAge();
''',
    '''      else if (!["male", "female", "non_binary"].includes(value("gender")))
        message = "Choose a gender before continuing.";
      else message =
        validateAge() ??
        validateBirthday();
''',
    "CharacterForm identity validation",
)

age_start = form.find(
    '            <label className="character_characterform_label_label_2">\n              <Label>Age *</Label>'
)
if age_start < 0:
    fail("Could not locate CharacterForm age control start.")

age_end_marker = '''            </label>
          </div>
        </section>
'''
age_end = form.find(age_end_marker, age_start)
if age_end < 0:
    fail("Could not locate CharacterForm age control end.")
age_end += len('            </label>\n')

new_age_ui = '''            <label className="character_characterform_label_label_2">
              <Label>Starting age *</Label>
              <input
                name="age"
                type="number"
                required
                value={age}
                min={race?.min_age ?? undefined}
                max={
                  mode === "create"
                    ? race?.max_age ?? undefined
                    : undefined
                }
                disabled={!race || race.min_age === null}
                onChange={(event) => setAge(event.target.value)}
                className={[((inputClass)), "character_characterform_input_age"].filter(Boolean).join(" ")}
              />
              <span className="mt-2 block text-xs text-[rgb(var(--sep-colour-766b5d))] character_characterform_span_text_5">
                {race?.min_age === null || !race
                  ? "Choose a configured ancestry first."
                  : mode === "update"
                    ? "Age increases automatically on this character's birthday."
                    : race.max_age === null
                      ? `${race.min_age}+ years at character creation`
                      : `${race.min_age}–${race.max_age} years at character creation`}
              </span>
            </label>

            <label className="character_characterform_label_birthday_month">
              <Label>Birth month *</Label>
              <select
                name="birthday_month"
                required
                value={birthdayMonth}
                onChange={(event) =>
                  setBirthdayMonth(
                    event.target.value,
                  )
                }
                className={[
                  inputClass,
                  "character_characterform_select_birthday_month",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <option value="">
                  Choose Aureth month
                </option>

                {AURETH_MONTHS.map(
                  (monthName, index) => (
                    <option
                      key={monthName}
                      value={index + 1}
                    >
                      {monthName}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="character_characterform_label_birthday_day">
              <Label>Birth day *</Label>
              <select
                name="birthday_day"
                required
                value={birthdayDay}
                onChange={(event) =>
                  setBirthdayDay(
                    event.target.value,
                  )
                }
                className={[
                  inputClass,
                  "character_characterform_select_birthday_day",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <option value="">
                  Choose day
                </option>

                {Array.from(
                  {
                    length: 31,
                  },
                  (_, index) =>
                    index + 1,
                ).map(
                  (day) => (
                    <option
                      key={day}
                      value={day}
                    >
                      {day}
                    </option>
                  ),
                )}
              </select>
            </label>
'''

form = form[:age_start] + new_age_ui + form[age_end:]

save = replace_once(
    save,
    '''import {
  applyGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";
''',
    '''import {
  applyGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";
import {
  buildCharacterDateOfBirth,
} from "@/lib/characters/character-age";
''',
    "save-character-v2 imports",
)

save = replace_once(
    save,
    '''  if (
    race.max_age !== null &&
    age > race.max_age
  ) {
''',
    '''  if (
    mode === "create" &&
    race.max_age !== null &&
    age > race.max_age
  ) {
''',
    "save-character-v2 creation-only max age",
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

  const birthdayMonth =
    Number(
      text(
        formData,
        "birthday_month",
        2,
      ),
    );

  const birthdayDay =
    Number(
      text(
        formData,
        "birthday_day",
        2,
      ),
    );

  let dateOfBirth:
    string;

  try {
    dateOfBirth =
      buildCharacterDateOfBirth(
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
''',
    '''          date_of_birth:
            dateOfBirth,
''',
    "save-character-v2 create DOB override",
)

own_sheet = replace_once(
    own_sheet,
    'import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";\n',
    '''import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import {
  calculateCharacterAge,
  formatCharacterBirthday,
} from "@/lib/characters/character-age";
''',
    "own character sheet imports",
)

items_pos = own_sheet.find("  const items = [\n")
if items_pos < 0:
    fail("Could not locate own character sheet items array.")

own_sheet = (
    own_sheet[:items_pos]
    + '''  const effectiveAge =
    calculateCharacterAge(
      character.date_of_birth,
      character.age,
    );

  const birthday =
    formatCharacterBirthday(
      character.date_of_birth,
    );

'''
    + own_sheet[items_pos:]
)

age_item_pattern = re.compile(
    r'''  \[\n    "Age",\n    character\.age !== null &&\n    character\.age !== undefined\n      \? `\$\{character\.age\} years`\n      : null,\n  \],\n''',
    re.M,
)
if len(age_item_pattern.findall(own_sheet)) != 1:
    fail("Could not uniquely locate own character sheet Age item.")

own_sheet = age_item_pattern.sub(
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
''',
    own_sheet,
    count=1,
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
  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("characters")
      .select(
        "age, date_of_birth",
      )
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

  const age =
    calculateCharacterAge(
      data?.date_of_birth ?? null,
      storedAge,
    );

  const birthday =
    formatCharacterBirthday(
      data?.date_of_birth ?? null,
    );

  return (
    <div className="space-y-2 components_characters_public_character_age_detail_div_container">
      <div>
        <dt className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Age
        </dt>
        <dd className="mt-1 text-sm text-[rgb(var(--sep-colour-d4c4ad))]">
          {age !== null
            ? `${age} years`
            : "Not provided"}
        </dd>
      </div>

      <div>
        <dt className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Birthday
        </dt>
        <dd className="mt-1 text-sm text-[rgb(var(--sep-colour-d4c4ad))]">
          {birthday ??
            "Not provided"}
        </dd>
      </div>
    </div>
  );
}
'''

admin_age = replace_once(
    admin_age,
    'import { createAdminClient } from "@/lib/supabase/admin";\n',
    '''import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCharacterDateOfBirth,
  calculateCharacterAge,
  getCharacterBirthdayParts,
} from "@/lib/characters/character-age";
''',
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
      .select(
        "age, date_of_birth",
      )
      .eq("id", characterId)
''',
    "admin age config query",
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
    '''  const birthday =
    getCharacterBirthdayParts(
      characterResult.data
        .date_of_birth,
    );

  return {
    age:
      calculateCharacterAge(
        characterResult.data
          .date_of_birth,
        typeof characterResult.data
          .age === "number"
          ? characterResult.data.age
          : null,
      ),

    birthdayMonth:
      birthday?.month ?? null,

    birthdayDay:
      birthday?.day ?? null,

    races:
''',
    "admin age config result",
)

admin_age = replace_once(
    admin_age,
    '''    const age =
      Number(ageRaw);

    const selectedGiftIds =
''',
    '''    const age =
      Number(ageRaw);

    const birthdayMonthRaw =
      String(
        formData.get(
          "birthdayMonth",
        ) ?? "",
      ).trim();

    const birthdayDayRaw =
      String(
        formData.get(
          "birthdayDay",
        ) ?? "",
      ).trim();

    const birthdayMonth =
      Number(
        birthdayMonthRaw,
      );

    const birthdayDay =
      Number(
        birthdayDayRaw,
      );

    const selectedGiftIds =
''',
    "admin birthday parsing",
)

max_block = '''    if (
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

'''
admin_age = replace_once(
    admin_age,
    max_block,
    '''    /*
     * max_age is a character-creation ceiling only.
     * Existing Characters may naturally age beyond it.
     */

    let dateOfBirth:
      string | null = null;

    if (
      ageRaw &&
      !isNpcCharacter
    ) {
      if (
        !birthdayMonthRaw ||
        !birthdayDayRaw
      ) {
        return {
          ok: false,
          error:
            "Birthday month and day are required.",
        };
      }

      try {
        dateOfBirth =
          buildCharacterDateOfBirth(
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

''',
    "admin max-age rule",
)

admin_age = replace_once(
    admin_age,
    '''        /*
         * Retire legacy DOB once the
         * character uses the Age system.
         */
        date_of_birth:
          null,
''',
    '''        date_of_birth:
          dateOfBirth,
''',
    "admin DOB save",
)

admin_form = replace_once(
    admin_form,
    '''} from "@/app/(portal)/admin/characters/age-actions";

const ATTRIBUTE_NAMES = [
''',
    '''} from "@/app/(portal)/admin/characters/age-actions";
import {
  AURETH_MONTHS,
} from "@/lib/world/calendar";

const ATTRIBUTE_NAMES = [
''',
    "admin form imports",
)

admin_form = replace_once(
    admin_form,
    '''  const [age, setAge] =
    useState("");

  const [loadingAge, setLoadingAge] =
''',
    '''  const [age, setAge] =
    useState("");

  const [
    birthdayMonth,
    setBirthdayMonth,
  ] = useState("");

  const [
    birthdayDay,
    setBirthdayDay,
  ] = useState("");

  const [loadingAge, setLoadingAge] =
''',
    "admin birthday state",
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
    "admin birthday load",
)

vstart = admin_form.find(
    '''    if (
      selectedRace.max_age !==
        null &&
'''
)
if vstart < 0:
    fail("Could not locate admin client max-age validation.")

vend = admin_form.find(
    '''    setAgeError(null);
    return true;
''',
    vstart,
)
if vend < 0:
    fail("Could not locate end of admin age validation.")

admin_form = (
    admin_form[:vstart]
    + '''    /*
     * max_age is a creation limit only.
     */
    if (
      !birthdayMonth ||
      !birthdayDay
    ) {
      setAgeError(
        "Choose the Character's Aureth birth month and day.",
      );
      return false;
    }

'''
    + admin_form[vend:]
)

admin_form = replace_once(
    admin_form,
    '''    formData.set("age", age);

    const result =
''',
    '''    formData.set("age", age);
    formData.set(
      "birthdayMonth",
      birthdayMonth,
    );
    formData.set(
      "birthdayDay",
      birthdayDay,
    );

    const result =
''',
    "admin birthday submit",
)

admin_form = replace_once(
    admin_form,
    '''          max={
            selectedRace?.max_age ??
            undefined
          }
''',
    "",
    "admin age max attribute",
)

input_marker = '''          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-45 components_admin_admin_character_edit_form_input_age"
        />
'''
ipos = admin_form.find(input_marker)
if ipos < 0:
    fail("Could not locate admin age input.")
ipos += len(input_marker)

birthday_controls = '''
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Aureth birth month
            </span>
            <select
              name="birthdayMonth"
              value={birthdayMonth}
              onChange={(event) =>
                setBirthdayMonth(
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            >
              <option value="">
                Choose month
              </option>
              {AURETH_MONTHS.map(
                (monthName, index) => (
                  <option
                    key={monthName}
                    value={index + 1}
                  >
                    {monthName}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Birth day
            </span>
            <select
              name="birthdayDay"
              value={birthdayDay}
              onChange={(event) =>
                setBirthdayDay(
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            >
              <option value="">
                Choose day
              </option>
              {Array.from(
                {
                  length: 31,
                },
                (_, index) =>
                  index + 1,
              ).map(
                (day) => (
                  <option
                    key={day}
                    value={day}
                  >
                    {day}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
'''

admin_form = (
    admin_form[:ipos]
    + birthday_controls
    + admin_form[ipos:]
)

admin_form = replace_once(
    admin_form,
    ''': `${selectedRace.name}: ${selectedRace.min_age} - ${selectedRace.max_age} years`}
''',
    ''': `${selectedRace.name}: starting range ${selectedRace.min_age} - ${selectedRace.max_age} years; established Characters may age beyond it`}
''',
    "admin range help text",
)

# All validation succeeded: write only now.
AGE_UTIL.parent.mkdir(parents=True, exist_ok=True)
AGE_UTIL.write_text(age_util, encoding="utf-8")
FORM.write_text(form, encoding="utf-8")
SAVE.write_text(save, encoding="utf-8")
OWN_SHEET.write_text(own_sheet, encoding="utf-8")
PUBLIC_AGE.write_text(public_age, encoding="utf-8")
ADMIN_AGE.write_text(admin_age, encoding="utf-8")
ADMIN_FORM.write_text(admin_form, encoding="utf-8")

print("SUCCESS")
print("Created:")
print(f"  {AGE_UTIL}")
print("Updated:")
for path in (FORM, SAVE, OWN_SHEET, PUBLIC_AGE, ADMIN_AGE, ADMIN_FORM):
    print(f"  {path}")
print()
print("No SQL migration required.")
print("Next: npm run build")
