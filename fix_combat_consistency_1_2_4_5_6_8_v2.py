from pathlib import Path
import subprocess

EXPECTED_HEAD='e97789f2a7eab2d9d7c38a86b177eba277770405'
OPS=[{'path': 'lib/warping/shape-access.ts',
  'old': '  const manualLevelOverride=assignments.some(\n'
         '    assignment=>\n'
         '      assignment.acquisition_source==="staff" &&\n'
         '      assignment.level_override===true,\n'
         '  );',
  'new': '  const assignmentLevelOverride=assignments.some(\n    assignment=>\n      assignment.level_override===true,\n  );',
  'label': 'Honor all assignment level overrides',
  'expected': 1},
 {'path': 'lib/warping/shape-access.ts',
  'old': '!manualLevelOverride &&',
  'new': '!assignmentLevelOverride &&',
  'label': 'Use all assignment overrides',
  'expected': 1},
 {'path': 'lib/warping/shape-access.ts',
  'old': 'override:manualLevelOverride,',
  'new': 'override:assignmentLevelOverride,',
  'label': 'Return all assignment overrides',
  'expected': 1},
 {'path': 'lib/gifts/get-character-gift-modifiers.ts',
  'old': '          presence_modifier,\n          max_health_modifier\n        )\n      `)',
  'new': '          presence_modifier,\n'
         '          max_health_modifier,\n'
         '          mechanics:shapes!shapes_feat_id_fkey(id)\n'
         '        )\n'
         '      `)',
  'label': 'Load passive mechanics relation',
  'expected': 1},
 {'path': 'lib/gifts/get-character-gift-modifiers.ts',
  'old': '    total.muscles +=\n      Number(\n        gift.muscles_modifier ??\n          0,\n      );',
  'new': '    const mechanics =\n'
         '      one<any>(\n'
         '        gift.mechanics as any,\n'
         '      );\n'
         '\n'
         '    if (mechanics) {\n'
         '      continue;\n'
         '    }\n'
         '\n'
         '    total.muscles +=\n'
         '      Number(\n'
         '        gift.muscles_modifier ??\n'
         '          0,\n'
         '      );',
  'label': 'Prevent passive legacy double count',
  'expected': 1},
 {'path': 'app/(portal)/game/opposed-actions.ts',
  'old': '    if (Date.parse(pending.expires_at) <= Date.now()) {',
  'new': '    const { data: attackerLocation, error: attackerLocationError } =\n'
         '      await admin\n'
         '        .from("characters")\n'
         '        .select("current_room_id")\n'
         '        .eq("id", pending.attacker_character_id)\n'
         '        .maybeSingle();\n'
         '\n'
         '    if (attackerLocationError) {\n'
         '      throw new Error(attackerLocationError.message);\n'
         '    }\n'
         '\n'
         '    if (\n'
         '      character.current_room_id !== pending.room_id ||\n'
         '      attackerLocation?.current_room_id !== pending.room_id\n'
         '    ) {\n'
         '      await admin\n'
         '        .from("opposed_actions")\n'
         '        .update({\n'
         '          status: "expired",\n'
         '          resolved_at: new Date().toISOString(),\n'
         '        })\n'
         '        .eq("id", pending.id)\n'
         '        .eq("status", "pending");\n'
         '\n'
         '      return {\n'
         '        ok: false,\n'
         '        message:\n'
         '          "That Action ended because one of the Characters left the Location.",\n'
         '      };\n'
         '    }\n'
         '\n'
         '    if (Date.parse(pending.expires_at) <= Date.now()) {',
  'label': 'Expire opposed action after room movement',
  'expected': 1},
 {'path': 'app/(portal)/game/actions.ts',
  'old': '      const { error: pendingError } = await admin\n        .from("opposed_actions")\n        .insert({',
  'new': '      const { data: pendingAction, error: pendingError } = await admin\n        .from("opposed_actions")\n        .insert({',
  'label': 'Capture opposed Item action',
  'expected': 1},
 {'path': 'app/(portal)/game/actions.ts',
  'old': '          damage_attribute: null,\n'
         '        });\n'
         '\n'
         '      if (pendingError) {\n'
         '        return { ok: false, message: pendingError.message };\n'
         '      }',
  'new': '          damage_attribute: null,\n'
         '        })\n'
         '        .select("id")\n'
         '        .single();\n'
         '\n'
         '      if (pendingError || !pendingAction) {\n'
         '        return {\n'
         '          ok: false,\n'
         '          message:\n'
         '            pendingError?.message ??\n'
         '            "Unable to create opposed Item action.",\n'
         '        };\n'
         '      }',
  'label': 'Require opposed Item action id',
  'expected': 1},
 {'path': 'app/(portal)/game/actions.ts',
  'old': '      if (messageError) {\n'
         '        throw new Error(\n'
         '          `Opposed Item created, but the room announcement failed: ${messageError.message}`,\n'
         '        );\n'
         '      }',
  'new': '      if (messageError) {\n'
         '        const rollback = await admin\n'
         '          .from("opposed_actions")\n'
         '          .delete()\n'
         '          .eq("id", pendingAction.id)\n'
         '          .eq("status", "pending");\n'
         '\n'
         '        if (rollback.error) {\n'
         '          throw new Error(\n'
         '            `Opposed Item announcement failed and rollback also failed: ${messageError.message} / ${rollback.error.message}`,\n'
         '          );\n'
         '        }\n'
         '\n'
         '        throw new Error(\n'
         '          `Opposed Item was not created because the room announcement failed: ${messageError.message}`,\n'
         '        );\n'
         '      }',
  'label': 'Rollback opposed Item on announcement failure',
  'expected': 1},
 {'path': 'app/(portal)/game/actions.ts',
  'old': '    } catch (effectError) {\n'
         '      await admin\n'
         '        .from("gift_activations")\n'
         '        .delete()\n'
         '        .eq("id", activation.id);\n'
         '\n'
         '      return {\n'
         '        ok: false,\n'
         '        message:\n'
         '          effectError instanceof Error\n'
         '            ? effectError.message\n'
         '            : "Feat effects could not be applied.",\n'
         '      };\n'
         '    }\n'
         '\n'
         '    const effectSummary: string[] = [successRoll.summary];\n'
         '\n'
         '    if (gift.health_dice) {',
  'new': '    } catch (effectError) {\n'
         '      await admin\n'
         '        .from("gift_activations")\n'
         '        .delete()\n'
         '        .eq("id", activation.id);\n'
         '\n'
         '      return {\n'
         '        ok: false,\n'
         '        message:\n'
         '          effectError instanceof Error\n'
         '            ? effectError.message\n'
         '            : "Feat effects could not be applied.",\n'
         '      };\n'
         '    }\n'
         '\n'
         '    const persistentLegacyModifiers = {\n'
         '      muscles: Number(gift.muscles_modifier ?? 0),\n'
         '      reflexes: Number(gift.reflexes_modifier ?? 0),\n'
         '      vigour: Number(gift.vigour_modifier ?? 0),\n'
         '      shrewd: Number(gift.shrewd_modifier ?? 0),\n'
         '      brains: Number(gift.brains_modifier ?? 0),\n'
         '      presence: Number(gift.presence_modifier ?? 0),\n'
         '      maxHealth: Number(gift.max_health_modifier ?? 0),\n'
         '    };\n'
         '\n'
         '    const hasPersistentLegacyModifiers =\n'
         '      Number(gift.duration_minutes ?? 0) > 0 &&\n'
         '      Object.values(persistentLegacyModifiers).some(\n'
         '        (value) => value !== 0,\n'
         '      );\n'
         '\n'
         '    if (hasPersistentLegacyModifiers) {\n'
         '      const { error: effectError } = await admin\n'
         '        .from("character_effects")\n'
         '        .insert({\n'
         '          target_character_id: target.id,\n'
         '          source_type: "feat",\n'
         '          source_definition_id: gift.id,\n'
         '          mechanics_definition_id: null,\n'
         '          source_instance_id: activation.id,\n'
         '          source_character_id: character.id,\n'
         '          source_name: gift.name,\n'
         '          source_level: 1,\n'
         '          effect_nature: "beneficial",\n'
         '          conditions: [],\n'
         '          muscles_modifier: persistentLegacyModifiers.muscles,\n'
         '          reflexes_modifier: persistentLegacyModifiers.reflexes,\n'
         '          vigour_modifier: persistentLegacyModifiers.vigour,\n'
         '          brains_modifier: persistentLegacyModifiers.brains,\n'
         '          shrewd_modifier: persistentLegacyModifiers.shrewd,\n'
         '          presence_modifier: persistentLegacyModifiers.presence,\n'
         '          max_health_modifier: persistentLegacyModifiers.maxHealth,\n'
         '          starts_at: activation.activated_at,\n'
         '          expires_at: activation.expires_at,\n'
         '          dispellable: true,\n'
         '        });\n'
         '\n'
         '      if (effectError) {\n'
         '        await admin\n'
         '          .from("gift_activations")\n'
         '          .delete()\n'
         '          .eq("id", activation.id);\n'
         '\n'
         '        return {\n'
         '          ok: false,\n'
         '          message:\n'
         '            `Unable to apply temporary Feat modifiers: ${effectError.message}`,\n'
         '        };\n'
         '      }\n'
         '    }\n'
         '\n'
         '    const effectSummary: string[] = [successRoll.summary];\n'
         '\n'
         '    if (gift.health_dice) {',
  'label': 'Apply legacy temporary Feat modifiers',
  'expected': 1},
 {'path': 'app/(portal)/admin/gifts/actions.ts',
  'old': '  const persistent =\n    payload.self_conditions.length ||',
  'new': '  const passiveMaxHp =\n'
         '    String(\n'
         '      payload.self_max_hp_change ??\n'
         '        "",\n'
         '    ).trim();\n'
         '\n'
         '  if (\n'
         '    payload.duration_unit === "until_dispelled" &&\n'
         '    payload.feat_id &&\n'
         '    passiveMaxHp &&\n'
         '    !/^[+-]?[0-9]+$/.test(passiveMaxHp)\n'
         '  ) {\n'
         '    throw new Error(\n'
         '      "Passive Feat Max HP change must be a fixed whole number, not dice.",\n'
         '    );\n'
         '  }\n'
         '\n'
         '  const persistent =\n'
         '    payload.self_conditions.length ||',
  'label': 'Validate passive Max HP as fixed',
  'expected': 1},
 {'path': 'app/(portal)/game/components/RoomChatForm.tsx',
  'old': '                <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c5a36f))] '
         'game_components_roomchatform_p_text_17">\n'
         '                  Success:{" "}\n'
         '                  {selectedGift.effectMode === "passive"\n'
         '                    ? "No roll - Passive Feat"\n'
         '                    : selectedGift.successDie\n'
         '                      ? `d${selectedGift.successDie}${\n'
         '                          selectedGift.successAttribute\n'
         '                            ? ` + ${ATTRIBUTE_LABELS[selectedGift.successAttribute]}`\n'
         '                            : ""\n'
         '                        } >= ${selectedGift.successThreshold}`\n'
         '                      : "Automatic"}\n'
         '                </p>',
  'new': '                <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c5a36f))] '
         'game_components_roomchatform_p_text_17">\n'
         '                  {selectedGift.mechanicsShape\n'
         '                    ? selectedGift.effectMode === "passive"\n'
         '                      ? "Passive · Shape-style Self profile is always active while owned"\n'
         '                      : "Shape-style mechanics · use the mechanical profile below"\n'
         '                    : `Success: ${\n'
         '                        selectedGift.effectMode === "passive"\n'
         '                          ? "No roll - Passive Feat"\n'
         '                          : selectedGift.successDie\n'
         '                            ? `d${selectedGift.successDie}${\n'
         '                                selectedGift.successAttribute\n'
         '                                  ? ` + ${ATTRIBUTE_LABELS[selectedGift.successAttribute]}`\n'
         '                                  : ""\n'
         '                              } >= ${selectedGift.successThreshold}`\n'
         '                            : "Automatic"\n'
         '                      }`}\n'
         '                </p>',
  'label': 'Use Shape-style Feat summary',
  'expected': 1},
 {'path': 'app/(portal)/game/components/RoomChatForm.tsx',
  'old': '                {(selectedGift.healthDice ||\n'
         '                  selectedGift.healthDelta !== 0 ||\n'
         '                  selectedGift.maxHealthModifier !== 0) ? (',
  'new': '                {!selectedGift.mechanicsShape &&\n'
         '                (selectedGift.healthDice ||\n'
         '                  selectedGift.healthDelta !== 0 ||\n'
         '                  selectedGift.maxHealthModifier !== 0) ? (',
  'label': 'Hide stale legacy health summary for Shape-style Feats',
  'expected': 1},
 {'path': 'app/(portal)/game/components/RoomChatForm.tsx',
  'old': '                {(selectedGift.damageDice ||\n                  selectedGift.musclesModifier ||',
  'new': '                {!selectedGift.mechanicsShape &&\n'
         '                (selectedGift.damageDice ||\n'
         '                  selectedGift.musclesModifier ||',
  'label': 'Hide stale legacy modifier summary for Shape-style Feats',
  'expected': 1}]

head=subprocess.check_output(["git","rev-parse","HEAD"], text=True).strip()
if head != EXPECTED_HEAD:
    raise SystemExit(f"STOP: patch targets {EXPECTED_HEAD}, current HEAD is {head}.")

contents={}
for op in OPS:
    path=Path(op["path"])
    if not path.exists():
        raise SystemExit(f"STOP: missing file {path}. No files written.")
    current=contents.get(path)
    if current is None:
        current=path.read_text(encoding="utf-8")
    count=current.count(op["old"])
    if count != op["expected"]:
        raise SystemExit(
            f'STOP: {op["label"]}: expected {op["expected"]} match(es) in {path}, found {count}. No files written.'
        )
    contents[path]=current.replace(op["old"], op["new"], op["expected"])

for path,current in contents.items():
    path.write_text(current, encoding="utf-8")

print("Combat consistency patch applied.")
print("Changed files:")
for path in sorted(str(p) for p in contents):
    print("  "+path)
print()
print("Run the SQL migration, then:")
print("  npm run build")
print("  git diff --check")
print("  git diff")
