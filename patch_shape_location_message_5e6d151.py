from pathlib import Path

path = Path(r"app/(portal)/game/components/WarpingPanel.tsx")
if not path.exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

text = path.read_text(encoding="utf-8")
start_marker = "      const targetNames = wt\n"
end_marker = "      const castText =\n"
start = text.find(start_marker)
end = text.find(end_marker, start)

if start < 0 or end < 0:
    raise SystemExit("ERROR: Could not locate the 5e6d151 Warp announcement block. No changes made.")

old = text[start:end]
for needle in [
    "`◆ Warp ${s.name}`",
    "`Save required: ${saveNames.join(\", \")}`",
    "`Profiles: ${castProfiles.join(\"; \")}`",
    "`Movement: ${s.movement}`",
]:
    if needle not in old:
        raise SystemExit("ERROR: Baseline does not match commit 5e6d151. Missing: " + needle + "\nNo changes made.")

new = r'''      const targetNames = wt
        ? written.trim()
        : self
          ? "Self"
          : targets
              .map(id => {
                if (id === me.data.id) return "Self";

                const entry =
                  presentCharacters.find(
                    c => c.id === id,
                  );

                return (
                  entry?.display_name ??
                  entry?.displayName ??
                  "Unknown"
                );
              })
              .join(" / ");

      const profileForTarget = (
        id: string,
      ): "self" | "other" | "other_alt" => {
        if (id === me.data.id) return "self";

        if (
          s.other_alternative_enabled &&
          (targetEffectChoices[id] ?? "beneficial") === "harmful"
        ) {
          return "other_alt";
        }

        return "other";
      };

      const activeProfiles: Array<
        "self" | "other" | "other_alt"
      > = wt
        ? []
        : self
          ? ["self"]
          : [
              ...new Set(
                targets.map(profileForTarget),
              ),
            ];

      const resolutionForProfile = (
        profile:
          | "self"
          | "other"
          | "other_alt",
      ) =>
        String(
          s[
            `${profile}_resolution_mode`
          ] ??
            s.resolution_mode ??
            "save",
        );

      const attributeLabel = (
        value: unknown,
      ) => {
        const key =
          String(value ?? "").trim();

        return key
          ? ATTR_LABEL[key] ?? key
          : "";
      };

      const parts: string[] = [];

      parts.push(
        `◆ Warp [${s.name}]`,
      );

      const wordAndMovement = [
        s.word_of_power
          ? String(s.word_of_power)
          : "",
        s.movement
          ? String(s.movement)
          : "",
      ]
        .filter(Boolean)
        .join(" | ");

      if (wordAndMovement) {
        parts.push(wordAndMovement);
      }

      if (
        s.level !== null &&
        s.level !== undefined
      ) {
        parts.push(
          `Level [${s.level}]`,
        );
      }

      if (s.school) {
        parts.push(
          `School [${s.school}]`,
        );
      }

      parts.push(
        `${
          !wt &&
          !self &&
          targets.length > 1
            ? "Targets"
            : "Target"
        } [${targetNames}]`,
      );

      if (s.effect_nature) {
        const rawNature =
          String(s.effect_nature).trim();

        const nature =
          rawNature
            ? rawNature.charAt(0).toUpperCase() +
              rawNature.slice(1)
            : "";

        if (nature) {
          parts.push(
            `Nature [${nature}]`,
          );
        }
      }

      if (wt) {
        parts.push(
          "Save Required [Fate]",
        );
      } else {
        const saveProfiles =
          activeProfiles.filter(
            profile =>
              resolutionForProfile(
                profile,
              ) === "save",
          );

        if (saveProfiles.length) {
          const dcAttributes = [
            ...new Set(
              saveProfiles
                .map(
                  profile =>
                    s[
                      `${profile}_dc_attribute`
                    ] ??
                    s.dc_attribute,
                )
                .filter(Boolean)
                .map(String),
            ),
          ];

          const dcParts =
            dcAttributes.map(
              attribute => {
                const runtimeKey =
                  attribute === "vigour"
                    ? "vigor"
                    : attribute === "presence"
                      ? "presence_score"
                      : attribute;

                const casterValue =
                  Number(
                    r?.[runtimeKey],
                  );

                return Number.isFinite(
                  casterValue,
                )
                  ? String(
                      11 + casterValue,
                    )
                  : `11 + ${attributeLabel(
                      attribute,
                    )}`;
              },
            );

          const saveOptions = [
            ...new Set(
              saveProfiles.flatMap(
                profile => {
                  const profileOptions =
                    s[
                      `${profile}_save_options`
                    ];

                  return Array.isArray(
                    profileOptions,
                  )
                    ? profileOptions
                    : Array.isArray(
                          s.save_options,
                        )
                      ? s.save_options
                      : [];
                },
              ),
            ),
          ];

          const saveAttributes = [
            ...new Set(
              saveOptions
                .map(option => {
                  switch (
                    String(option)
                  ) {
                    case "dodge":
                      return "Reflexes";
                    case "defend":
                      return "Vigour";
                    case "resist_vigour":
                    case "resist_vigor":
                      return "Vigour";
                    case "resist_shrewd":
                      return "Shrewd";
                    case "resist_brains":
                      return "Brains";
                    case "resist_presence":
                      return "Presence";
                    default:
                      return "";
                  }
                })
                .filter(Boolean),
            ),
          ];

          const dcText =
            dcParts.length
              ? dcParts.join(" / ")
              : "—";

          const saveAttributeText =
            saveAttributes.length
              ? saveAttributes.join(
                  " / ",
                )
              : "—";

          parts.push(
            `Save Required [DC ${dcText} - ${saveAttributeText}]`,
          );
        } else {
          parts.push(
            "Save Required [None]",
          );
        }
      }

      const components = [
        s.requires_verbal
          ? "Verbal"
          : "",
        s.requires_movement
          ? "Movement"
          : "",
      ]
        .filter(Boolean)
        .join(" + ");

      parts.push(
        `Components [${components || "None"}]`,
      );

      if (s.description) {
        const effect =
          String(s.description)
            .replace(/\s+/g, " ")
            .trim();

        if (effect) {
          parts.push(
            `Effect: [${effect}]`,
          );
        }
      }

      const uniqueValues = (
        values: string[],
      ) => [
        ...new Set(
          values.filter(Boolean),
        ),
      ];

      const damageValues =
        uniqueValues(
          activeProfiles.map(
            profile => {
              const dice =
                String(
                  s[
                    `${profile}_damage_dice`
                  ] ?? "",
                ).trim();

              const attribute =
                String(
                  s[
                    `${profile}_damage_attribute`
                  ] ?? "",
                ).trim();

              if (!dice && !attribute) {
                return "";
              }

              return [
                dice,
                attribute
                  ? `+ ${attributeLabel(
                      attribute,
                    )}`
                  : "",
                s.damage_type
                  ? String(s.damage_type)
                  : "",
              ]
                .filter(Boolean)
                .join(" ");
            },
          ),
        );

      if (damageValues.length) {
        parts.push(
          `Damage [${damageValues.join(
            " / ",
          )}]`,
        );
      }

      const healingValues =
        uniqueValues(
          activeProfiles.map(
            profile => {
              const dice =
                String(
                  s[
                    `${profile}_heal_dice`
                  ] ?? "",
                ).trim();

              const attribute =
                String(
                  s[
                    `${profile}_heal_attribute`
                  ] ?? "",
                ).trim();

              if (!dice && !attribute) {
                return "";
              }

              return [
                dice,
                attribute
                  ? `+ ${attributeLabel(
                      attribute,
                    )}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ");
            },
          ),
        );

      if (healingValues.length) {
        parts.push(
          `Healing [${healingValues.join(
            " / ",
          )}]`,
        );
      }

      const maxHealthValues =
        uniqueValues(
          activeProfiles.map(
            profile => {
              const raw =
                String(
                  s[
                    `${profile}_max_hp_change`
                  ] ?? "",
                ).trim();

              if (!raw || raw === "0") {
                return "";
              }

              const numeric =
                Number(raw);

              return (
                Number.isFinite(numeric) &&
                numeric > 0 &&
                !raw.startsWith("+")
                  ? `+${raw}`
                  : raw
              );
            },
          ),
        );

      if (maxHealthValues.length) {
        parts.push(
          `Max Health [${maxHealthValues.join(
            " / ",
          )}]`,
        );
      }

      const conditions =
        uniqueValues(
          activeProfiles.flatMap(
            profile => {
              const value =
                s[
                  `${profile}_conditions`
                ];

              return Array.isArray(value)
                ? value.map(String)
                : [];
            },
          ),
        );

      if (conditions.length) {
        parts.push(
          `Applies [${conditions.join(
            " / ",
          )}]`,
        );
      }

      let duration = "";

      if (s.is_instantaneous) {
        duration =
          "Instantaneous";
      } else if (
        s.duration_unit ===
        "until_dispelled"
      ) {
        duration =
          "Until Dispelled";
      } else if (
        s.duration_amount &&
        s.duration_unit
      ) {
        duration =
          `${s.duration_amount} ${s.duration_unit}`;
      }

      if (duration) {
        parts.push(
          `Duration [${duration}]`,
        );
      }

      const prerequisites = [
        ["muscles", "Muscles"],
        ["reflexes", "Reflexes"],
        ["vigour", "Vigour"],
        ["brains", "Brains"],
        ["shrewd", "Shrewd"],
        ["presence", "Presence"],
      ]
        .map(([key, label]) => {
          const minimum =
            s[`min_${key}`];

          if (
            minimum === null ||
            minimum === undefined ||
            minimum === "" ||
            Number(minimum) === 0
          ) {
            return "";
          }

          return `${label} ${minimum}+`;
        })
        .filter(Boolean);

      if (prerequisites.length) {
        parts.push(
          `Prerequisites [${prerequisites.join(
            " / ",
          )}]`,
        );
      }

      if (
        s.price_key &&
        PM[String(s.price_key)]
      ) {
        const [, , label] =
          PM[String(s.price_key)];

        parts.push(
          `Price [${label}]`,
        );
      }

      if (s.is_dispel) {
        const de =
          dispelEffects.find(
            (e: any) =>
              e.id ===
              selectedDispelEffect,
          );

        if (de) {
          parts.push(
            `Dispels [${de.shape_name} - Level ${de.shape_level}]`,
          );
        }
      }

'''

patched = text[:start] + new + text[end:]

backup = path.with_suffix(
    path.suffix + ".pre-shape-message-patch"
)
backup.write_text(
    text,
    encoding="utf-8",
)
path.write_text(
    patched,
    encoding="utf-8",
)

new_block = patched[
    patched.find(start_marker):
    patched.find(
        end_marker,
        patched.find(start_marker),
    )
]

for forbidden in [
    "Save required:",
    "Profiles:",
    "Movement:",
    "Automatic:",
    "Damage:",
]:
    if forbidden in new_block:
        raise SystemExit(
            "ERROR: old Warp output survived: " +
            forbidden
        )

print("PATCH APPLIED SUCCESSFULLY")
print("Changed:", path)
print("Backup :", backup)
print("Only WarpingPanel.tsx was modified.")
