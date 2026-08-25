from pathlib import Path

ROOT = Path.cwd()
PAGE = ROOT / "app/(portal)/admin/shapes/page.tsx"
PROGRESSION = ROOT / "app/(portal)/admin/shapes/ShapeProgression.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

for path in (PAGE, PROGRESSION):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

page = PAGE.read_text(encoding="utf-8")
progression = PROGRESSION.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# 1. Mark persistent controls in all profiles, and improve Other labels.
# ---------------------------------------------------------------------------

old_profile = '''function Profile({s,p,title}:{s?:S;p:"self"|"other"|"other_alt";title:string}){
  const mods=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">{title}</h4>
    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label><span className={lab}>Damage</span><input name={`${p}_damage_dice`} defaultValue={s?.[`${p}_damage_dice`]??""} placeholder="2d6 or 5" className={cls}/></label>
      <label><span className={lab}>Damage Attribute</span><Sel name={`${p}_damage_attribute`} value={s?.[`${p}_damage_attribute`]} options={ATTRIBUTES} none/></label>
      <label><span className={lab}>Healing</span><input name={`${p}_heal_dice`} defaultValue={s?.[`${p}_heal_dice`]??""} placeholder="1d8 or 4" className={cls}/></label>
      <label><span className={lab}>Healing Attribute</span><Sel name={`${p}_heal_attribute`} value={s?.[`${p}_heal_attribute`]} options={ATTRIBUTES} none/></label>
      <label><span className={lab}>Max HP change</span><input name={`${p}_max_hp_change`} defaultValue={s?.[`${p}_max_hp_change`]??""} placeholder="+5 or -2d6" className={cls}/></label>
      <label className="md:col-span-2 lg:col-span-3"><span className={lab}>Conditions</span><input name={`${p}_conditions`} defaultValue={(s?.[`${p}_conditions`]??[]).join(", ")} placeholder="Blinded, Poisoned" className={cls}/></label>
    </div><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{mods.map(([k,l])=><label key={k}><span className={lab}>{l} +/-</span><input type="number" name={`${p}_${k}_modifier`} defaultValue={s?.[`${p}_${k}_modifier`]??0} className={cls}/></label>)}</div>
  </section>;
}
'''

new_profile = '''function Profile({s,p,title}:{s?:S;p:"self"|"other"|"other_alt";title:string}){
  const mods=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4"><h4 data-other-main-title={p==="other"?"true":undefined} className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">{title}</h4>
    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label><span className={lab}>Damage</span><input name={`${p}_damage_dice`} defaultValue={s?.[`${p}_damage_dice`]??""} placeholder="2d6 or 5" className={cls}/></label>
      <label><span className={lab}>Damage Attribute</span><Sel name={`${p}_damage_attribute`} value={s?.[`${p}_damage_attribute`]} options={ATTRIBUTES} none/></label>
      <label><span className={lab}>Current Health +/-</span><input name={`${p}_heal_dice`} defaultValue={s?.[`${p}_heal_dice`]??""} placeholder="+1d8, +4, -1d6, -3" className={cls}/></label>
      <label><span className={lab}>Current Health Attribute</span><Sel name={`${p}_heal_attribute`} value={s?.[`${p}_heal_attribute`]} options={ATTRIBUTES} none/></label>
      <label data-persistent-effect><span className={lab}>Max HP change</span><input name={`${p}_max_hp_change`} defaultValue={s?.[`${p}_max_hp_change`]??""} placeholder="+5 or -2d6" className={cls}/></label>
      <label data-persistent-effect className="md:col-span-2 lg:col-span-3"><span className={lab}>Conditions</span><input name={`${p}_conditions`} defaultValue={(s?.[`${p}_conditions`]??[]).join(", ")} placeholder="Blinded, Poisoned" className={cls}/></label>
    </div><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{mods.map(([k,l])=><label data-persistent-effect key={k}><span className={lab}>{l} +/-</span><input type="number" name={`${p}_${k}_modifier`} defaultValue={s?.[`${p}_${k}_modifier`]??0} className={cls}/></label>)}</div>
  </section>;
}
'''

if old_profile not in page:
    fail("Could not find the current Profile component.")

page = page.replace(old_profile, new_profile, 1)

# Mark effect-nature select so the helper can keep the mixed/alternative UI clear.
old_nature = '''<select name="effect_nature" defaultValue={s?.effect_nature??"harmful"} className={cls}>'''
new_nature = '''<select name="effect_nature" data-effect-nature defaultValue={s?.effect_nature??"harmful"} className={cls}>'''

if old_nature not in page:
    fail("Could not find Effect Nature select.")

page = page.replace(old_nature, new_nature, 1)

# Add an explanatory line under the alternative checkbox.
old_alt_label = '''      <label className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))]"><input className="mr-2" type="checkbox" name="other_alternative_enabled" data-alt-other-toggle defaultChecked={s?.other_alternative_enabled??false}/>Separate Beneficial and Harmful effects for Other targets</label>
      <div className="mt-4" data-alt-other-profile><Profile s={s} p="other_alt" title="Harmful Other Effect"/></div>
'''

new_alt_label = '''      <label className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))]"><input className="mr-2" type="checkbox" name="other_alternative_enabled" data-alt-other-toggle defaultChecked={s?.other_alternative_enabled??false}/>Separate Beneficial and Harmful effects for Other targets</label>
      <p data-alt-other-help className="mt-2 text-[9px] text-[rgb(var(--sep-colour-806b50))]">When enabled, the normal Other profile above becomes <b>Beneficial Other Effect</b> and the additional profile below is <b>Harmful Other Effect</b>. The caster chooses which branch to use when Warping.</p>
      <div className="mt-4" data-alt-other-profile><Profile s={s} p="other_alt" title="Harmful Other Effect"/></div>
'''

if old_alt_label not in page:
    fail("Could not find alternative Other profile block.")

page = page.replace(old_alt_label, new_alt_label, 1)

# ---------------------------------------------------------------------------
# 2. ShapeProgression: disable persistent controls for Instantaneous and
#    update the Beneficial Other title live.
# ---------------------------------------------------------------------------

old_alt_vars = '''    const altProfile =
      form.querySelector(
        "[data-alt-other-profile]",
      ) as HTMLElement | null;

    const syncResolution = () => {
'''

new_alt_vars = '''    const altProfile =
      form.querySelector(
        "[data-alt-other-profile]",
      ) as HTMLElement | null;

    const otherMainTitle =
      form.querySelector(
        "[data-other-main-title]",
      ) as HTMLElement | null;

    const effectNature =
      form.querySelector(
        "[data-effect-nature]",
      ) as HTMLSelectElement | null;

    const syncResolution = () => {
'''

if old_alt_vars not in progression:
    fail("Could not find ShapeProgression alternative-profile variables.")

progression = progression.replace(old_alt_vars, new_alt_vars, 1)

old_duration_tail = '''      if (amount) {
        amount.disabled =
          value ===
            "instantaneous" ||
          value ===
            "until_dispelled";

        amount
          .closest("label")
          ?.classList.toggle(
            "opacity-35",
            amount.disabled,
          );
      }
    };

    const syncAlternative = () => {
      if (altProfile) {
        altProfile.hidden =
          !altToggle?.checked;
      }
    };
'''

new_duration_tail = '''      if (amount) {
        amount.disabled =
          value ===
            "instantaneous" ||
          value ===
            "until_dispelled";

        amount
          .closest("label")
          ?.classList.toggle(
            "opacity-35",
            amount.disabled,
          );
      }

      const disablePersistent =
        value ===
        "instantaneous";

      form
        .querySelectorAll(
          "[data-persistent-effect]",
        )
        .forEach((node) => {
          const container =
            node as HTMLElement;

          container.classList.toggle(
            "opacity-35",
            disablePersistent,
          );

          container
            .querySelectorAll(
              "input, select, textarea",
            )
            .forEach((control) => {
              (
                control as
                  | HTMLInputElement
                  | HTMLSelectElement
                  | HTMLTextAreaElement
              ).disabled =
                disablePersistent;
            });
        });
    };

    const syncAlternative = () => {
      const enabled =
        Boolean(
          altToggle?.checked,
        );

      if (altProfile) {
        altProfile.hidden =
          !enabled;
        altProfile.style.display =
          enabled ? "" : "none";
      }

      if (otherMainTitle) {
        otherMainTitle.textContent =
          enabled
            ? "Beneficial Other Effect"
            : "Other Effect Profile";
      }

      if (
        altToggle &&
        effectNature
      ) {
        altToggle
          .closest("label")
          ?.classList.toggle(
            "opacity-60",
            effectNature.value !==
              "mixed",
          );
      }
    };
'''

if old_duration_tail not in progression:
    fail("Could not find current syncDuration/syncAlternative block.")

progression = progression.replace(old_duration_tail, new_duration_tail, 1)

old_listener = '''    altToggle?.addEventListener(
      "change",
      syncAlternative,
    );

    const directChildren =
'''

new_listener = '''    altToggle?.addEventListener(
      "change",
      syncAlternative,
    );

    effectNature?.addEventListener(
      "change",
      syncAlternative,
    );

    const directChildren =
'''

if old_listener not in progression:
    fail("Could not find alternative toggle listener.")

progression = progression.replace(old_listener, new_listener, 1)

old_cleanup = '''      altToggle?.removeEventListener(
        "change",
        syncAlternative,
      );
    };
'''

new_cleanup = '''      altToggle?.removeEventListener(
        "change",
        syncAlternative,
      );

      effectNature?.removeEventListener(
        "change",
        syncAlternative,
      );
    };
'''

if old_cleanup not in progression:
    fail("Could not find ShapeProgression cleanup block.")

progression = progression.replace(old_cleanup, new_cleanup, 1)

# Validate.
markers = {
    "page.tsx": [
        "data-persistent-effect",
        "Current Health +/-",
        "data-other-main-title",
        "data-effect-nature",
        "Beneficial Other Effect",
    ],
    "ShapeProgression.tsx": [
        "disablePersistent",
        '"[data-persistent-effect]"',
        "otherMainTitle.textContent",
        'effectNature?.addEventListener',
    ],
}

for marker in markers["page.tsx"]:
    if marker not in page:
        fail(f"page.tsx validation failed: missing {marker!r}")

for marker in markers["ShapeProgression.tsx"]:
    if marker not in progression:
        fail(f"ShapeProgression.tsx validation failed: missing {marker!r}")

PAGE.write_text(page, encoding="utf-8", newline="\n")
PROGRESSION.write_text(progression, encoding="utf-8", newline="\n")

print("WROTE  app/(portal)/admin/shapes/page.tsx")
print("WROTE  app/(portal)/admin/shapes/ShapeProgression.tsx")
print()
print("SHAPE PERSISTENT EFFECT + MIXED OTHER UX PATCH APPLIED")
print()
print("- Instantaneous disables Max HP, Conditions and all Attribute +/- controls")
print("  in Self, Other and Harmful Other profiles.")
print("- Timed / Until Dispelled durations re-enable them.")
print("- 'Healing' is relabelled 'Current Health +/-' because the existing field")
print("  already supports signed Health changes.")
print("- Enabling Separate Beneficial/Harmful Other effects immediately renames")
print("  the normal Other profile to 'Beneficial Other Effect'.")
print("- The additional profile is clearly 'Harmful Other Effect'.")
print("- Mixed nature is visually associated with the separate-profile option,")
print("  but it is still an explicit checkbox rather than automatic.")
print()
print("Next: npm run build")
