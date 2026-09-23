from pathlib import Path
import subprocess

EXPECTED_HEAD = 'a01652ce245e577f107cdc94c02a340ca543e3f7'
OPS = [{'path': 'app/(portal)/admin/gifts/actions.ts',
  'old': 'function validateShapeStylePayload(\n  payload: any,\n) {',
  'new': 'function validateShapeStylePayload(\n  payload: any,\n  effectMode: string,\n) {',
  'label': 'Pass Feat effect mode into Shape-style validation',
  'expected': 1},
 {'path': 'app/(portal)/admin/gifts/actions.ts',
  'old': '    payload.duration_unit === "until_dispelled" &&\n    payload.feat_id &&\n    passiveMaxHp &&',
  'new': '    effectMode === "passive" &&\n    passiveMaxHp &&',
  'label': 'Limit fixed Max HP rule to Passive Feats',
  'expected': 1},
 {'path': 'app/(portal)/admin/gifts/actions.ts',
  'old': '  validateShapeStylePayload(payload);',
  'new': '  validateShapeStylePayload(\n    payload,\n    values.effect_mode,\n  );',
  'label': 'Validate Shape-style mechanics with effect mode',
  'expected': 1},
 {'path': 'lib/warping/shape-access.ts',
  'old': '    .eq("resource_type","character")\n    .gte("created_at",boundaryResult.data);',
  'new': '    .eq("resource_type","character")\n    .neq("status","failed")\n    .gte("created_at",boundaryResult.data);',
  'label': 'Exclude rolled-back Shape casts from normal daily usage',
  'expected': 1},
 {'path': 'app/(portal)/game/warping-actions.ts',
  'old': 'export type WarpingActionState={ok:boolean;message:string;submittedAt?:number};\n',
  'new': 'export type WarpingActionState={ok:boolean;message:string;submittedAt?:number};\n'
         '\n'
         'async function ownedCharacterId(){\n'
         ' const db=await createClient(),au=await db.auth.getUser();\n'
         ' if(!au.data.user)throw Error("Authentication required.");\n'
         ' const q=await admin().from("characters").select("id").eq("user_id",au.data.user.id).maybeSingle();\n'
         ' if(q.error||!q.data)throw Error(q.error?.message??"Character not found.");\n'
         ' return String(q.data.id);\n'
         '}\n'
         '\n'
         'export async function rollbackFailedShapeCast(\n'
         ' castId:string,\n'
         '):Promise<WarpingActionState>{\n'
         ' try{\n'
         '  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(castId)){\n'
         '   throw Error("Invalid Shape cast.");\n'
         '  }\n'
         '  const characterId=await ownedCharacterId();\n'
         '  const q=await admin().rpc("rollback_failed_shape_cast",{\n'
         '   p_cast_id:castId,\n'
         '   p_character_id:characterId,\n'
         '  });\n'
         '  if(q.error)throw Error(q.error.message);\n'
         '  const result=(q.data??{}) as any;\n'
         '  return{\n'
         '   ok:result.rolled_back===true,\n'
         '   message:result.rolled_back===true\n'
         '    ?"Warp cancelled and its Warp / Item charge was restored."\n'
         '    :String(result.reason??"This Warp could not be safely rolled back."),\n'
         '   submittedAt:Date.now(),\n'
         '  };\n'
         ' }catch(e){\n'
         '  return{\n'
         '   ok:false,\n'
         '   message:e instanceof Error?e.message:"Unable to roll back failed Warp.",\n'
         '  };\n'
         ' }\n'
         '}\n'
         '\n'
         'export async function commitShapeCast(\n'
         ' castId:string,\n'
         '):Promise<WarpingActionState>{\n'
         ' try{\n'
         '  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(castId)){\n'
         '   throw Error("Invalid Shape cast.");\n'
         '  }\n'
         '  const characterId=await ownedCharacterId();\n'
         '  const q=await admin()\n'
         '   .from("shape_casts")\n'
         '   .update({status:"resolved"})\n'
         '   .eq("id",castId)\n'
         '   .eq("caster_character_id",characterId)\n'
         '   .eq("status","resolving")\n'
         '   .select("id")\n'
         '   .maybeSingle();\n'
         '  if(q.error)throw Error(q.error.message);\n'
         '  return{\n'
         '   ok:Boolean(q.data),\n'
         '   message:q.data?"Warp committed.":"Warp was already finalised.",\n'
         '   submittedAt:Date.now(),\n'
         '  };\n'
         ' }catch(e){\n'
         '  return{\n'
         '   ok:false,\n'
         '   message:e instanceof Error?e.message:"Unable to finalise Warp.",\n'
         '  };\n'
         ' }\n'
         '}\n',
  'label': 'Add safe Shape-cast rollback and commit helpers',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': 'import {\n  prepareDispelEffect,\n  resolveImmediateShapeCast,\n} from "../warping-actions";',
  'new': 'import {\n'
         '  commitShapeCast,\n'
         '  prepareDispelEffect,\n'
         '  resolveImmediateShapeCast,\n'
         '  rollbackFailedShapeCast,\n'
         '} from "../warping-actions";',
  'label': 'Import Shape-cast rollback helpers',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': '    setBusy(true);\n    setMsg("");\n\n    try {',
  'new': '    setBusy(true);\n'
         '    setMsg("");\n'
         '\n'
         '    let castId = "";\n'
         '    let irreversibleResolutionAttempted = false;\n'
         '    let castCommitted = false;\n'
         '\n'
         '    try {',
  'label': 'Track rollback safety during Warp',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': '      let castId = "";\n      let itemChargeRemaining:',
  'new': '      let itemChargeRemaining:',
  'label': 'Use outer cast id for rollback',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': '        if (!immediate.ok) {\n'
         '          throw Error(\n'
         '            immediate.message ||\n'
         '              "Automatic Shape effects could not be applied.",\n'
         '          );\n'
         '        }\n'
         '\n'
         '        immediateResolutionMessage =\n'
         '          immediate.message;',
  'new': '        if (!immediate.ok) {\n'
         '          irreversibleResolutionAttempted = true;\n'
         '          throw Error(\n'
         '            immediate.message ||\n'
         '              "Automatic Shape effects could not be applied.",\n'
         '          );\n'
         '        }\n'
         '\n'
         '        immediateResolutionMessage =\n'
         '          immediate.message;\n'
         '\n'
         '        if (immediate.message) {\n'
         '          irreversibleResolutionAttempted = true;\n'
         '        }',
  'label': 'Track whether immediate Shape mechanics resolved',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': '        if (!prepared.ok) {\n'
         '          throw Error(\n'
         '            prepared.message ||\n'
         '              "Unable to prepare Dispel.",\n'
         '          );\n'
         '        }\n'
         '\n'
         '        preparedDispelMessage =\n'
         '          prepared.message;',
  'new': '        if (!prepared.ok) {\n'
         '          irreversibleResolutionAttempted = true;\n'
         '          throw Error(\n'
         '            prepared.message ||\n'
         '              "Unable to prepare Dispel.",\n'
         '          );\n'
         '        }\n'
         '\n'
         '        preparedDispelMessage =\n'
         '          prepared.message;\n'
         '\n'
         '        if (\n'
         '          prepared.message ===\n'
         '          "Effect dispelled."\n'
         '        ) {\n'
         '          irreversibleResolutionAttempted = true;\n'
         '        }',
  'label': 'Track irreversible Dispel resolution',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': '      if (!posted.ok) {\n'
         '        throw Error(\n'
         '          posted.message ||\n'
         '            "Shape was recorded but its room message could not be posted.",\n'
         '        );\n'
         '      }\n'
         '\n'
         '      setTargets([]);',
  'new': '      if (!posted.ok) {\n'
         '        throw Error(\n'
         '          posted.message ||\n'
         '            "Shape was recorded but its room message could not be posted.",\n'
         '        );\n'
         '      }\n'
         '\n'
         '      castCommitted = true;\n'
         '\n'
         '      const committed =\n'
         '        await commitShapeCast(\n'
         '          castId,\n'
         '        );\n'
         '\n'
         '      if (!committed.ok) {\n'
         '        console.error(\n'
         '          "Unable to mark Shape cast resolved:",\n'
         '          committed.message,\n'
         '        );\n'
         '      }\n'
         '\n'
         '      setTargets([]);',
  'label': 'Commit Shape cast after successful room announcement',
  'expected': 1},
 {'path': 'app/(portal)/game/components/WarpingPanel.tsx',
  'old': '    } catch (e) {\n'
         '      setMsg(\n'
         '        e instanceof Error\n'
         '          ? e.message\n'
         '          : "Warp failed.",\n'
         '      );\n'
         '    } finally {',
  'new': '    } catch (e) {\n'
         '      const originalMessage =\n'
         '        e instanceof Error\n'
         '          ? e.message\n'
         '          : "Warp failed.";\n'
         '\n'
         '      if (\n'
         '        castId &&\n'
         '        !castCommitted &&\n'
         '        !irreversibleResolutionAttempted\n'
         '      ) {\n'
         '        const rollback =\n'
         '          await rollbackFailedShapeCast(\n'
         '            castId,\n'
         '          );\n'
         '\n'
         '        if (rollback.ok) {\n'
         '          setMsg(\n'
         '            `${originalMessage} · ${rollback.message}`,\n'
         '          );\n'
         '          await load();\n'
         '        } else {\n'
         '          setMsg(\n'
         '            `${originalMessage} · Automatic rollback failed: ${rollback.message}`,\n'
         '          );\n'
         '        }\n'
         '      } else if (\n'
         '        castId &&\n'
         '        !castCommitted &&\n'
         '        irreversibleResolutionAttempted\n'
         '      ) {\n'
         '        setMsg(\n'
         '          `${originalMessage} · The Warp was not refunded because its mechanics may already have been applied.`,\n'
         '        );\n'
         '      } else {\n'
         '        setMsg(\n'
         '          originalMessage,\n'
         '        );\n'
         '      }\n'
         '    } finally {',
  'label': 'Refund failed Warp only when rollback is safe',
  'expected': 1}]

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    text=True,
).strip()

if head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOP: patch targets {EXPECTED_HEAD}, current HEAD is {head}. No files were written."
    )

contents = {}

for op in OPS:
    path = Path(op["path"])

    if not path.exists():
        raise SystemExit(
            f"STOP: missing file {path}. No files were written."
        )

    current = contents.get(path)
    if current is None:
        current = path.read_text(encoding="utf-8")

    count = current.count(op["old"])

    if count != op["expected"]:
        raise SystemExit(
            f'STOP: {op["label"]}: expected {op["expected"]} match(es) in {path}, found {count}. No files were written.'
        )

    contents[path] = current.replace(
        op["old"],
        op["new"],
        op["expected"],
    )

for path, current in contents.items():
    path.write_text(
        current,
        encoding="utf-8",
    )

print("Passive validation + safe Warp rollback patch applied.")
print("Changed files:")
for path in sorted(str(p) for p in contents):
    print("  " + path)

print()
print("NEXT:")
print("  1. Run the accompanying Supabase SQL migration.")
print("  2. npm run build")
print("  3. git diff --check")
print("  4. git diff")
