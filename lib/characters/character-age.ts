import {
  AURETH_MONTHS,
  REAL_MONTHS,
} from "@/lib/world/calendar";

function parseDateOfBirth(
  value: string | null | undefined,
) {
  if (!value) return null;

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
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

function ordinalDay(
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
