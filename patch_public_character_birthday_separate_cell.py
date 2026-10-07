from pathlib import Path

PROFILE = Path("components/characters/public-character-profile.tsx")
AGE = Path("components/characters/public-character-age-detail.tsx")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for path in (PROFILE, AGE):
    if not path.exists():
        fail(f"Missing expected file: {path}")

profile = PROFILE.read_text(encoding="utf-8")
age = AGE.read_text(encoding="utf-8")

old_profile = '''                <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 [&_dt]:text-[7px] [&_dt]:uppercase [&_dt]:tracking-[0.19em] [&_dt]:text-[rgb(var(--sep-colour-796448))] [&_dd]:mt-1 [&_dd]:text-[11px] [&_dd]:leading-5 [&_dd]:text-[rgb(var(--sep-colour-cab89b))] components_characters_public_character_profile_div_container_16">
                  <PublicCharacterAgeDetail
                    characterId={character.id}
                  />
                </div>
'''

new_profile = '''                <PublicCharacterAgeDetail
                  characterId={character.id}
                />
'''

if profile.count(old_profile) != 1:
    fail(
        "Could not uniquely locate the wrapped PublicCharacterAgeDetail "
        f"(matches: {profile.count(old_profile)})."
    )

profile = profile.replace(
    old_profile,
    new_profile,
    1,
)

old_age = '''  return (
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
'''

new_age = '''  const detailClass =
    "min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2";

  const termClass =
    "text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]";

  const descriptionClass =
    "mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]";

  return (
    <>
      <div
        className={`${detailClass} components_characters_public_character_age_detail_age`}
      >
        <dt className={termClass}>
          Age
        </dt>

        <dd className={descriptionClass}>
          {age !== null
            ? `${age} years`
            : "Not provided"}
        </dd>
      </div>

      <div
        className={`${detailClass} components_characters_public_character_age_detail_birthday`}
      >
        <dt className={termClass}>
          Birthday
        </dt>

        <dd className={descriptionClass}>
          {birthday ??
            "Not provided"}
        </dd>
      </div>
    </>
  );
'''

if age.count(old_age) != 1:
    fail(
        "Could not uniquely locate the current Age/Birthday render block "
        f"(matches: {age.count(old_age)}). "
        "Make sure the birthday patches are already applied."
    )

age = age.replace(
    old_age,
    new_age,
    1,
)

PROFILE.write_text(
    profile,
    encoding="utf-8",
)
AGE.write_text(
    age,
    encoding="utf-8",
)

print("SUCCESS")
print("Updated:")
print(f"  {PROFILE}")
print(f"  {AGE}")
print()
print("Result:")
print("  Age is one grid rectangle.")
print("  Birthday is the next separate grid rectangle.")
print("Next: npm run build")
