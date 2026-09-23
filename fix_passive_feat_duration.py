from pathlib import Path

OPS = [{'path': 'app/(portal)/admin/gifts/actions.ts',
  'old': '  const durationMode =\n'
         '    prefixedText(formData, "duration_mode") ??\n'
         '    "instantaneous";\n'
         '\n'
         '  const instantaneous = durationMode === "instantaneous";\n'
         '  const durationUnit = instantaneous ? "minutes" : durationMode;',
  'new': '  const passive =\n'
         '    values.effect_mode === "passive";\n'
         '\n'
         '  const durationMode =\n'
         '    passive\n'
         '      ? "until_dispelled"\n'
         '      : prefixedText(\n'
         '          formData,\n'
         '          "duration_mode",\n'
         '        ) ??\n'
         '        "instantaneous";\n'
         '\n'
         '  const instantaneous =\n'
         '    !passive &&\n'
         '    durationMode === "instantaneous";\n'
         '\n'
         '  const durationUnit =\n'
         '    passive\n'
         '      ? "until_dispelled"\n'
         '      : instantaneous\n'
         '        ? "minutes"\n'
         '        : durationMode;',
  'label': 'Passive Feat mechanics duration'},
 {'path': 'components/admin/gift-effect-form-logic.tsx',
  'old': '      if (passive) {\n'
         '        setValue(form, "targetMode", "self");\n'
         '        setValue(form, "healthDelta", "0");\n'
         '        setValue(form, "healthDice", "");\n'
         '        setValue(form, "damageDice", "");\n'
         '        setValue(form, "damageType", "");\n'
         '        setValue(form, "successDie", "");\n'
         '        setValue(form, "successThreshold", "");\n'
         '        setValue(form, "successAttribute", "");\n'
         '        setValue(form, "cooldownValue", "0");\n'
         '        setValue(form, "durationValue", "");\n'
         '      }',
  'new': '      if (passive) {\n'
         '        setValue(form, "targetMode", "self");\n'
         '        setValue(form, "healthDelta", "0");\n'
         '        setValue(form, "healthDice", "");\n'
         '        setValue(form, "damageDice", "");\n'
         '        setValue(form, "damageType", "");\n'
         '        setValue(form, "successDie", "");\n'
         '        setValue(form, "successThreshold", "");\n'
         '        setValue(form, "successAttribute", "");\n'
         '        setValue(form, "cooldownValue", "0");\n'
         '        setValue(form, "durationValue", "");\n'
         '        setValue(\n'
         '          form,\n'
         '          "mechanics_duration_mode",\n'
         '          "until_dispelled",\n'
         '        );\n'
         '        setValue(\n'
         '          form,\n'
         '          "mechanics_duration_amount",\n'
         '          "",\n'
         '        );\n'
         '      }',
  'label': 'Passive Feat advanced duration values'},
 {'path': 'components/admin/gift-effect-form-logic.tsx',
  'old': '      setControlDisabled(form, "targetMode", passive);\n'
         '      setControlDisabled(form, "durationMode", passive);\n'
         '      setControlDisabled(form, "cooldownValue", passive);',
  'new': '      setControlDisabled(form, "targetMode", passive);\n'
         '      setControlDisabled(form, "durationMode", passive);\n'
         '      setControlDisabled(\n'
         '        form,\n'
         '        "mechanics_duration_mode",\n'
         '        passive,\n'
         '      );\n'
         '      setControlDisabled(\n'
         '        form,\n'
         '        "mechanics_duration_amount",\n'
         '        passive,\n'
         '      );\n'
         '      setControlDisabled(form, "cooldownValue", passive);',
  'label': 'Passive Feat advanced duration controls'}]

contents = {}

for op in OPS:
    path = Path(op["path"])

    if not path.exists():
        raise SystemExit(
            f"STOP: missing file: {path}. No files were written."
        )

    text = contents.get(path)
    if text is None:
        text = path.read_text(encoding="utf-8")

    count = text.count(op["old"])
    if count != 1:
        raise SystemExit(
            f'STOP: {op["label"]}: expected exactly 1 match in {path}, found {count}. No files were written.'
        )

    contents[path] = text.replace(
        op["old"],
        op["new"],
        1,
    )

for path, text in contents.items():
    path.write_text(text, encoding="utf-8")

print("Passive Feat duration fix applied.")
print("Changed:")
for path in contents:
    print("  " + str(path))
print()
print("Run: npm run build")
