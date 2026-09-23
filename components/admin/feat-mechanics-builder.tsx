import {
  ATTRIBUTES,
  SAVES,
} from "@/lib/warping/constants";

type AnyRow = Record<string, any>;

const controlClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";

const labelClass =
  "mb-1 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]";

function durationSeed(gift?: AnyRow) {
  const minutes = Number(gift?.duration_minutes ?? 0);
  if (minutes <= 0) return { mode: "instantaneous", amount: 1 };
  if (minutes % 1440 === 0) return { mode: "days", amount: minutes / 1440 };
  if (minutes % 60 === 0) return { mode: "hours", amount: minutes / 60 };
  return { mode: "minutes", amount: minutes };
}

function legacyHealing(gift?: AnyRow) {
  if (gift?.health_dice) return String(gift.health_dice);
  const fixed = Number(gift?.health_delta ?? 0);
  return fixed ? String(fixed) : "";
}

function value(shape: AnyRow | null | undefined, key: string, fallback: unknown = "") {
  return shape?.[key] ?? fallback;
}

function Select({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={controlClass}>
      {children}
    </select>
  );
}

function ProfileResolution({
  shape,
  profile,
}: {
  shape?: AnyRow | null;
  profile: "self" | "other" | "other_alt";
}) {
  const defaultMode = profile === "other_alt" ? "save" : "automatic";
  const mode = String(value(shape, `${profile}_resolution_mode`, defaultMode));
  const selectedSaves = new Set<string>(
    Array.isArray(shape?.[`${profile}_save_options`])
      ? shape?.[`${profile}_save_options`]
      : [],
  );

  return (
    <div className="mb-4 border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-15100d))] p-3">
      <p className="mb-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
        Resolution for this effect
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <label>
          <span className={labelClass}>Resolution</span>
          <Select
            name={`mechanics_${profile}_resolution_mode`}
            defaultValue={mode}
          >
            <option value="automatic">Automatic Success</option>
            <option value="save">Save Required</option>
          </Select>
        </label>

        <label>
          <span className={labelClass}>DC Attribute</span>
          <Select
            name={`mechanics_${profile}_dc_attribute`}
            defaultValue={String(value(shape, `${profile}_dc_attribute`, ""))}
          >
            <option value="">None</option>
            {ATTRIBUTES.map(([key, label]) => (
              <option key={String(key)} value={String(key)}>
                {String(label)}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className={labelClass}>Successful Save</span>
          <Select
            name={`mechanics_${profile}_save_success_damage`}
            defaultValue={String(
              value(shape, `${profile}_save_success_damage`, "none"),
            )}
          >
            <option value="none">No effect</option>
            <option value="half">Half damage only</option>
          </Select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {SAVES.map(([key, label]) => (
          <label
            key={String(key)}
            className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))]"
          >
            <input
              className="mr-2"
              type="checkbox"
              name={`mechanics_${profile}_save_options`}
              value={String(key)}
              defaultChecked={selectedSaves.has(String(key))}
            />
            {String(label)}
          </label>
        ))}
      </div>

      <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-766a5b))]">
        {profile === "self"
          ? "Self resolves immediately. A Save setting on Self does not open a response popup."
          : "Another Character receives the same Save / Do Nothing response used by Shapes."}
      </p>
    </div>
  );
}

function Profile({
  shape,
  gift,
  profile,
  title,
}: {
  shape?: AnyRow | null;
  gift?: AnyRow;
  profile: "self" | "other" | "other_alt";
  title: string;
}) {
  const firstProfile = profile === "self" || profile === "other";
  const seededDamage = firstProfile ? gift?.damage_dice ?? "" : "";
  const seededHealing = firstProfile ? legacyHealing(gift) : "";
  const seededMaxHealth =
    firstProfile && Number(gift?.max_health_modifier ?? 0)
      ? String(gift?.max_health_modifier)
      : "";

  const modifiers = [
    ["muscles", "Muscles"],
    ["reflexes", "Reflexes"],
    ["vigour", "Vigour"],
    ["brains", "Brains"],
    ["shrewd", "Shrewd"],
    ["presence", "Presence"],
  ] as const;

  const legacyModifier: Record<string, number> = {
    muscles: Number(gift?.muscles_modifier ?? 0),
    reflexes: Number(gift?.reflexes_modifier ?? 0),
    vigour: Number(gift?.vigour_modifier ?? 0),
    brains: Number(gift?.brains_modifier ?? 0),
    shrewd: Number(gift?.shrewd_modifier ?? 0),
    presence: Number(gift?.presence_modifier ?? 0),
  };

  return (
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
      <h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">
        {title}
      </h4>

      <div className="mt-3">
        <ProfileResolution shape={shape} profile={profile} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={labelClass}>Damage</span>
          <input
            name={`mechanics_${profile}_damage_dice`}
            defaultValue={String(
              value(shape, `${profile}_damage_dice`, seededDamage),
            )}
            placeholder="2d6 or 5"
            className={controlClass}
          />
        </label>

        <label>
          <span className={labelClass}>Damage Attribute</span>
          <Select
            name={`mechanics_${profile}_damage_attribute`}
            defaultValue={String(
              value(shape, `${profile}_damage_attribute`, ""),
            )}
          >
            <option value="">None</option>
            {ATTRIBUTES.map(([key, label]) => (
              <option key={String(key)} value={String(key)}>
                {String(label)}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className={labelClass}>Current Health +/-</span>
          <input
            name={`mechanics_${profile}_heal_dice`}
            defaultValue={String(
              value(shape, `${profile}_heal_dice`, seededHealing),
            )}
            placeholder="+1d8, +4, -1d6, -3"
            className={controlClass}
          />
        </label>

        <label>
          <span className={labelClass}>Current Health Attribute</span>
          <Select
            name={`mechanics_${profile}_heal_attribute`}
            defaultValue={String(
              value(shape, `${profile}_heal_attribute`, ""),
            )}
          >
            <option value="">None</option>
            {ATTRIBUTES.map(([key, label]) => (
              <option key={String(key)} value={String(key)}>
                {String(label)}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className={labelClass}>Max HP change</span>
          <input
            name={`mechanics_${profile}_max_hp_change`}
            defaultValue={String(
              value(shape, `${profile}_max_hp_change`, seededMaxHealth),
            )}
            placeholder="+5 or -2d6"
            className={controlClass}
          />
        </label>

        <label className="md:col-span-2 lg:col-span-3">
          <span className={labelClass}>Conditions</span>
          <input
            name={`mechanics_${profile}_conditions`}
            defaultValue={
              Array.isArray(shape?.[`${profile}_conditions`])
                ? shape?.[`${profile}_conditions`].join(", ")
                : ""
            }
            placeholder="Blinded, Poisoned"
            className={controlClass}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {modifiers.map(([key, label]) => (
          <label key={key}>
            <span className={labelClass}>{label} +/-</span>
            <input
              type="number"
              name={`mechanics_${profile}_${key}_modifier`}
              defaultValue={Number(
                value(
                  shape,
                  `${profile}_${key}_modifier`,
                  firstProfile ? legacyModifier[key] : 0,
                ),
              )}
              className={controlClass}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export function FeatMechanicsBuilder({
  gift,
  shape,
}: {
  gift?: AnyRow;
  shape?: AnyRow | null;
}) {
  const seed = durationSeed(gift);
  const durationMode = shape
    ? shape.is_instantaneous
      ? "instantaneous"
      : String(shape.duration_unit ?? "minutes")
    : seed.mode;
  const durationAmount = shape?.duration_amount ?? seed.amount;
  const targetMode = String(shape?.target_mode ?? gift?.target_mode ?? "self");

  return (
    <div className="md:col-span-2 mt-2 border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-120d09))] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9a7c54))]">
            Shape-style mechanical engine
          </p>
          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec89f))]">
            Advanced Feat Mechanics
          </h3>
        </div>
        <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
          No Affinity · No Warps/day · Feat ownership still applies
        </span>
      </div>

      <p className="mt-2 text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        These fields use the same target, Save and persistent-effect engine as Shapes.
        Existing Feat fields above are retained. Once saved, activated use in Location chat
        resolves through these profiles.
      </p>

      <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
        <h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">
          Targeting / Duration
        </h4>

        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-[10px] text-[rgb(var(--sep-colour-c6ae88))]">
            <input
              type="checkbox"
              name="mechanics_is_dispel"
              defaultChecked={Boolean(shape?.is_dispel)}
            />
            Dispel active effect
          </label>

          <label>
            <span className={labelClass}>Effect Nature</span>
            <Select
              name="mechanics_effect_nature"
              defaultValue={String(shape?.effect_nature ?? "harmful")}
            >
              <option value="beneficial">Beneficial</option>
              <option value="harmful">Harmful</option>
              <option value="mixed">Mixed</option>
            </Select>
          </label>

          <label>
            <span className={labelClass}>Target</span>
            <Select name="mechanics_target_mode" defaultValue={targetMode}>
              <option value="self">Self</option>
              <option value="other">Other</option>
              <option value="either">Either</option>
            </Select>
          </label>

          <label>
            <span className={labelClass}>Count</span>
            <Select
              name="mechanics_target_scope"
              defaultValue={String(shape?.target_scope ?? "single")}
            >
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
            </Select>
          </label>

          <label>
            <span className={labelClass}>Maximum targets</span>
            <input
              type="number"
              min={1}
              name="mechanics_max_targets"
              defaultValue={shape?.max_targets ?? 1}
              className={controlClass}
            />
          </label>

          <label>
            <span className={labelClass}>Damage Type</span>
            <input
              name="mechanics_damage_type"
              defaultValue={String(
                shape?.damage_type ?? gift?.damage_type ?? "",
              )}
              placeholder="free text"
              className={controlClass}
            />
          </label>

          <label>
            <span className={labelClass}>Duration</span>
            <Select
              name="mechanics_duration_mode"
              defaultValue={durationMode}
            >
              <option value="instantaneous">Instantaneous</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="until_dispelled">Until Dispelled</option>
            </Select>
          </label>

          <label>
            <span className={labelClass}>How many</span>
            <input
              type="number"
              min={1}
              name="mechanics_duration_amount"
              defaultValue={durationAmount}
              className={controlClass}
            />
          </label>
        </div>
      </section>

      <Profile
        shape={shape}
        gift={gift}
        profile="self"
        title="Self Effect Profile"
      />
      <Profile
        shape={shape}
        gift={gift}
        profile="other"
        title={
          shape?.other_alternative_enabled
            ? "Beneficial Other Effect"
            : "Other Effect Profile"
        }
      />

      <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
        <label className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))]">
          <input
            className="mr-2"
            type="checkbox"
            name="mechanics_other_alternative_enabled"
            defaultChecked={shape?.other_alternative_enabled ?? false}
          />
          Separate Beneficial and Harmful effects for Other targets
        </label>
        <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-806b50))]">
          When enabled, the normal Other profile is Beneficial and the additional profile
          below is Harmful. The player chooses the branch for each target in Location chat.
        </p>
      </section>

      <Profile
        shape={shape}
        gift={gift}
        profile="other_alt"
        title="Harmful Other Effect"
      />
    </div>
  );
}
