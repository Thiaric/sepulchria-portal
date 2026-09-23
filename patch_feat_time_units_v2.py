from pathlib import Path
import subprocess

EXPECTED_HEAD = "29d84c219eee9af923e95f7c3bab2a18b798f993"

def git_head() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}"
        )
    return text.replace(old, new, 1)

current_head = git_head()
if current_head != EXPECTED_HEAD:
    raise SystemExit(
        "STOP: this patch was built for commit "
        f"{EXPECTED_HEAD}, but your current HEAD is {current_head}."
    )

root = Path.cwd()

paths = [
    "app/(portal)/admin/gifts/page.tsx",
    "app/(portal)/admin/gifts/actions.ts",
    "components/admin/gift-effect-form-logic.tsx",
    "components/gifts/gifts-catalogue.tsx",
    "app/(portal)/game/components/RoomChatForm.tsx",
]

files = {}
for rel in paths:
    path = root / rel
    if not path.exists():
        raise SystemExit(f"STOP: missing file: {rel}")
    files[rel] = path.read_text(encoding="utf-8")

# ------------------------------------------------------------------
# 1) Admin Feats page: input value + unit, and human-readable recaps.
# ------------------------------------------------------------------
rel = "app/(portal)/admin/gifts/page.tsx"
text = files[rel]

text = replace_once(
    text,
    """function adminDurationLabel(gift: Gift) {
  if (gift.effect_mode === "passive") return "Permanent";
  if (gift.effect_mode !== "temporary") return "Instant use";
  if (gift.duration_minutes === 0) return "Instantaneous";

  return gift.duration_minutes
    ? `${gift.duration_minutes} min`
    : "Not set";
}""",
    """function adminMinutesLabel(minutes: number) {
  const value = Math.max(0, Math.trunc(minutes));

  if (value > 0 && value % 1440 === 0) {
    const days = value / 1440;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  if (value > 0 && value % 60 === 0) {
    const hours = value / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${value} ${value === 1 ? "minute" : "minutes"}`;
}

function adminTimeParts(minutes: number) {
  const value = Math.max(0, Math.trunc(minutes));

  if (value > 0 && value % 1440 === 0) {
    return {
      value: value / 1440,
      unit: "days" as const,
    };
  }

  if (value > 0 && value % 60 === 0) {
    return {
      value: value / 60,
      unit: "hours" as const,
    };
  }

  return {
    value,
    unit: "minutes" as const,
  };
}

function adminDurationLabel(gift: Gift) {
  if (gift.effect_mode === "passive") return "Permanent";
  if (gift.effect_mode !== "temporary") return "Instant use";
  if (gift.duration_minutes === 0) return "Instantaneous";

  return gift.duration_minutes
    ? adminMinutesLabel(gift.duration_minutes)
    : "Not set";
}""",
    f"{rel}: time helper",
)

text = replace_once(
    text,
    """                      ? gift.cooldown_minutes === 0
                        ? "No cooldown"
                        : `${gift.cooldown_minutes} min cooldown`
                      : "No cooldown"
                  }`}""",
    """                      ? gift.cooldown_minutes === 0
                        ? "No cooldown"
                        : `${adminMinutesLabel(gift.cooldown_minutes)} cooldown`
                      : "No cooldown"
                  }`}""",
    f"{rel}: recap cooldown",
)

text = replace_once(
    text,
    """  const selectedRaces = new Set(gift?.races?.map((item) => item.race_id) ?? []);
  const selectedRoles = new Set(gift?.roles?.map((item) => item.order_job_id) ?? []);

  return (""",
    """  const selectedRaces = new Set(gift?.races?.map((item) => item.race_id) ?? []);
  const selectedRoles = new Set(gift?.roles?.map((item) => item.order_job_id) ?? []);

  const durationParts =
    gift?.duration_minutes && gift.duration_minutes > 0
      ? adminTimeParts(gift.duration_minutes)
      : { value: "", unit: "minutes" as const };

  const cooldownParts =
    adminTimeParts(gift?.cooldown_minutes ?? 360);

  return (""",
    f"{rel}: initial time parts",
)

text = replace_once(
    text,
    """        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            step={1}
            name="durationMinutes"
            placeholder="Required when Timed"
            defaultValue={
              gift?.duration_minutes && gift.duration_minutes > 0
                ? gift.duration_minutes
                : ""
            }
            className={[((inputClass)), "admin_gifts_page_input_duration_minutes"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Cooldown (minutes)">
          <input
            type="number"
            min={0}
            step={1}
            name="cooldownMinutes"
            list="feat-cooldown-options"
            defaultValue={gift?.cooldown_minutes ?? 360}
            className={[((inputClass)), "admin_gifts_page_input_cooldown_minutes"].filter(Boolean).join(" ")}
          />
          <datalist id="feat-cooldown-options">
            <option className="admin_gifts_page_option_0" value="0" label="No cooldown" />
            <option className="admin_gifts_page_option_30" value="30" label="30 minutes" />
            <option className="admin_gifts_page_option_60" value="60" label="1 hour" />
            <option className="admin_gifts_page_option_120" value="120" label="2 hours" />
            <option className="admin_gifts_page_option_240" value="240" label="4 hours" />
            <option className="admin_gifts_page_option_360" value="360" label="6 hours" />
            <option className="admin_gifts_page_option_720" value="720" label="12 hours" />
            <option className="admin_gifts_page_option_1440" value="1440" label="24 hours" />
          </datalist>
        </Field>""",
    """        <Field label="Duration">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="number"
              min={1}
              step={1}
              name="durationValue"
              placeholder="Required when Timed"
              defaultValue={durationParts.value}
              className={[((inputClass)), "admin_gifts_page_input_duration_value"].filter(Boolean).join(" ")}
            />
            <select
              name="durationUnit"
              defaultValue={durationParts.unit}
              className={[((inputClass)), "admin_gifts_page_select_duration_unit"].filter(Boolean).join(" ")}
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </Field>

        <Field label="Cooldown">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="number"
              min={0}
              step={1}
              name="cooldownValue"
              defaultValue={cooldownParts.value}
              className={[((inputClass)), "admin_gifts_page_input_cooldown_value"].filter(Boolean).join(" ")}
            />
            <select
              name="cooldownUnit"
              defaultValue={cooldownParts.unit}
              className={[((inputClass)), "admin_gifts_page_select_cooldown_unit"].filter(Boolean).join(" ")}
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </Field>""",
    f"{rel}: duration/cooldown inputs",
)

files[rel] = text

# ------------------------------------------------------------------
# 2) Server action: convert selected units back into stored minutes.
# ------------------------------------------------------------------
rel = "app/(portal)/admin/gifts/actions.ts"
text = files[rel]

text = replace_once(
    text,
    """function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}""",
    """function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function timeInMinutes(
  formData: FormData,
  valueName: string,
  unitName: string,
  fallback = 0,
) {
  const amount = integer(
    formData,
    valueName,
    fallback,
  );

  const unit =
    optionalText(
      formData,
      unitName,
    ) ?? "minutes";

  const multiplier =
    unit === "days"
      ? 1440
      : unit === "hours"
        ? 60
        : unit === "minutes"
          ? 1
          : null;

  if (multiplier === null) {
    throw new Error(
      "Invalid Feat time unit.",
    );
  }

  return amount * multiplier;
}""",
    f"{rel}: time parser",
)

text = replace_once(
    text,
    """      durationMinutes =
        integer(formData, "durationMinutes", 0);

      if (durationMinutes <= 0) {
        throw new Error(
          "Timed Activated Feats need a duration greater than 0 minutes.",
        );
      }""",
    """      durationMinutes =
        timeInMinutes(
          formData,
          "durationValue",
          "durationUnit",
          0,
        );

      if (durationMinutes <= 0) {
        throw new Error(
          "Timed Activated Feats need a duration greater than 0.",
        );
      }""",
    f"{rel}: duration conversion",
)

text = replace_once(
    text,
    """  const cooldownMinutes =
    isPassive
      ? 0
      : integer(formData, "cooldownMinutes", 0);""",
    """  const cooldownMinutes =
    isPassive
      ? 0
      : timeInMinutes(
          formData,
          "cooldownValue",
          "cooldownUnit",
          0,
        );""",
    f"{rel}: cooldown conversion",
)

files[rel] = text

# ------------------------------------------------------------------
# 3) Client-side admin form logic: use the new controls.
# ------------------------------------------------------------------
rel = "components/admin/gift-effect-form-logic.tsx"
text = files[rel]

text = replace_once(
    text,
    """        setValue(form, "cooldownMinutes", "0");
        setValue(form, "durationMinutes", "");""",
    """        setValue(form, "cooldownValue", "0");
        setValue(form, "durationValue", "");""",
    f"{rel}: passive reset",
)

text = replace_once(
    text,
    """      setControlDisabled(form, "cooldownMinutes", passive);
      setControlDisabled(form, "healthDelta", passive);""",
    """      setControlDisabled(form, "cooldownValue", passive);
      setControlDisabled(form, "cooldownUnit", passive);
      setControlDisabled(form, "healthDelta", passive);""",
    f"{rel}: cooldown disable",
)

text = replace_once(
    text,
    """      if (!timed) {
        setValue(form, "durationMinutes", "");
      }

      setControlDisabled(
        form,
        "durationMinutes",
        !timed,
      );""",
    """      if (!timed) {
        setValue(form, "durationValue", "");
      }

      setControlDisabled(
        form,
        "durationValue",
        !timed,
      );

      setControlDisabled(
        form,
        "durationUnit",
        !timed,
      );""",
    f"{rel}: duration controls",
)

files[rel] = text

# ------------------------------------------------------------------
# 4) /feats and character Feat cards: human-readable time.
# ------------------------------------------------------------------
rel = "components/gifts/gifts-catalogue.tsx"
text = files[rel]

text = replace_once(
    text,
    """function durationLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Permanent while owned";
  if (gift.effectMode === "none") return "Instantaneous";
  if (gift.durationMinutes === 0) return "Instantaneous";
  return gift.durationMinutes ? `${gift.durationMinutes} min` : "Not set";
}""",
    """function minutesLabel(minutes: number) {
  const value = Math.max(0, Math.trunc(minutes));

  if (value > 0 && value % 1440 === 0) {
    const days = value / 1440;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  if (value > 0 && value % 60 === 0) {
    const hours = value / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${value} ${value === 1 ? "minute" : "minutes"}`;
}

function durationLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Permanent while owned";
  if (gift.effectMode === "none") return "Instantaneous";
  if (gift.durationMinutes === 0) return "Instantaneous";
  return gift.durationMinutes ? minutesLabel(gift.durationMinutes) : "Not set";
}""",
    f"{rel}: human duration",
)

text = replace_once(
    text,
    """                gift.cooldownMinutes
                  ? `${gift.cooldownMinutes} min cooldown`
                  : "No cooldown"
              }`}""",
    """                gift.cooldownMinutes
                  ? `${minutesLabel(gift.cooldownMinutes)} cooldown`
                  : "No cooldown"
              }`}""",
    f"{rel}: human cooldown",
)

files[rel] = text

# ------------------------------------------------------------------
# 5) Location chat Feat panel: human-readable duration/cooldown.
# ------------------------------------------------------------------
rel = "app/(portal)/game/components/RoomChatForm.tsx"
text = files[rel]

text = replace_once(
    text,
    """function formatSigned(
  value: number,
): string {
  return value >= 0
    ? `+${value}`
    : String(value);
}""",
    """function formatSigned(
  value: number,
): string {
  return value >= 0
    ? `+${value}`
    : String(value);
}

function formatMinutesLabel(
  minutes: number,
): string {
  const value =
    Math.max(
      0,
      Math.trunc(minutes),
    );

  if (
    value > 0 &&
    value % 1440 === 0
  ) {
    const days =
      value / 1440;

    return `${days} ${
      days === 1
        ? "day"
        : "days"
    }`;
  }

  if (
    value > 0 &&
    value % 60 === 0
  ) {
    const hours =
      value / 60;

    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`;
  }

  return `${value} ${
    value === 1
      ? "minute"
      : "minutes"
  }`;
}""",
    f"{rel}: time formatter",
)

text = replace_once(
    text,
    """                            selectedGift.durationMinutes === 0
                              ? "Instantaneous"
                              : `${selectedGift.durationMinutes ?? "?"} min`
                          } · Cooldown: ${
                            selectedGift.cooldownMinutes === 0
                              ? "None"
                              : `${selectedGift.cooldownMinutes} min`
                          }`""",
    """                            selectedGift.durationMinutes === 0
                              ? "Instantaneous"
                              : selectedGift.durationMinutes
                                ? formatMinutesLabel(
                                    selectedGift.durationMinutes,
                                  )
                                : "?"
                          } · Cooldown: ${
                            selectedGift.cooldownMinutes === 0
                              ? "None"
                              : formatMinutesLabel(
                                  selectedGift.cooldownMinutes,
                                )
                          }`""",
    f"{rel}: Feat timing display",
)

files[rel] = text

# Validate all edits before any write.
for rel in paths:
    if files[rel] == (root / rel).read_text(encoding="utf-8"):
        raise RuntimeError(
            f"{rel}: patch made no changes"
        )

# Write only after every replacement above succeeded.
for rel in paths:
    (root / rel).write_text(
        files[rel],
        encoding="utf-8",
    )

print("Feat duration/cooldown units patch applied.")
print()
print("Changed:")
for rel in paths:
    print(f"  - {rel}")
print()
print("Database format is unchanged: duration and cooldown are still stored as minutes.")
print()
print("Next:")
print("  npm run build")
print("  git diff --check")
print("  git diff")
