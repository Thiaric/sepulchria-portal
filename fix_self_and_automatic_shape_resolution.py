from pathlib import Path
import subprocess

ROOT = Path.cwd()

ACTIONS_PATH = ROOT / "app/(portal)/game/warping-actions.ts"
PANEL_PATH = ROOT / "app/(portal)/game/components/WarpingPanel.tsx"

ACTIONS_REPO = "app/(portal)/game/warping-actions.ts"
PANEL_REPO = "app/(portal)/game/components/WarpingPanel.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not (ROOT / ".git").exists():
    fail(
        "Run this script from the root of the sepulchria-portal repository."
    )

try:
    subprocess.run(
        ["git", "fetch", "origin", "master"],
        cwd=ROOT,
        check=True,
    )
except subprocess.CalledProcessError:
    fail("Could not fetch origin/master.")

try:
    actions = subprocess.check_output(
        [
            "git",
            "show",
            f"origin/master:{ACTIONS_REPO}",
        ],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )

    panel = subprocess.check_output(
        [
            "git",
            "show",
            f"origin/master:{PANEL_REPO}",
        ],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
except subprocess.CalledProcessError:
    fail(
        "Could not read the current Warping files from origin/master."
    )


# ---------------------------------------------------------------------------
# Server-side immediate Shape resolver.
# Uses the SAME apply(...) function already used by Save resolution.
# ---------------------------------------------------------------------------

server_anchor = '''const SAVE_NAME:Record<string,string>={dodge:"Dodge",defend:"Defend",resist_vigour:"Resist Vigour",resist_vigor:"Resist Vigour",resist_shrewd:"Resist Shrewd",resist_brains:"Resist Brains",resist_presence:"Resist Presence"};
export async function resolveIncomingShape'''

server_insert = '''const SAVE_NAME:Record<string,string>={dodge:"Dodge",defend:"Defend",resist_vigour:"Resist Vigour",resist_vigor:"Resist Vigour",resist_shrewd:"Resist Shrewd",resist_brains:"Resist Brains",resist_presence:"Resist Presence"};

export async function resolveImmediateShapeCast(
  castId: string,
): Promise<WarpingActionState> {
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        castId,
      )
    ) {
      throw Error("Invalid Shape cast.");
    }

    const caster =
      await mine();

    const a =
      admin();

    const {
      data: castRow,
      error: castError,
    } = await a
      .from("shape_casts")
      .select(`
        id,
        room_id,
        caster_character_id,
        caster:characters!shape_casts_caster_character_id_fkey(
          id,
          display_name,
          muscles,
          reflexes,
          vigor,
          brains,
          shrewd,
          presence_score
        ),
        shape:shapes!shape_casts_shape_id_fkey(*)
      `)
      .eq("id", castId)
      .eq(
        "caster_character_id",
        caster.id,
      )
      .maybeSingle();

    if (
      castError ||
      !castRow
    ) {
      throw Error(
        castError?.message ??
          "Shape cast not found.",
      );
    }

    const cast =
      castRow as any;

    const shape =
      one(cast.shape);

    if (!shape) {
      throw Error(
        "Shape data unavailable.",
      );
    }

    /*
     * Dispel has its own preparation / response resolver and must not
     * use the ordinary Shape payload path here.
     */
    if (shape.is_dispel) {
      return {
        ok: true,
        message: "",
        submittedAt:
          Date.now(),
      };
    }

    const {
      data: targetRows,
      error: targetError,
    } = await a
      .from("shape_cast_targets")
      .select(`
        id,
        cast_id,
        target_character_id,
        target_kind,
        outcome,
        resolved_at
      `)
      .eq(
        "cast_id",
        castId,
      )
      .eq(
        "outcome",
        "pending",
      );

    if (targetError) {
      throw Error(
        targetError.message,
      );
    }

    const immediateRows =
      (targetRows ?? []).filter(
        (row) =>
          Boolean(
            row.target_character_id,
          ) &&
          (
            row.target_character_id ===
              caster.id ||
            shape.resolution_mode ===
              "automatic"
          ),
      );

    if (!immediateRows.length) {
      return {
        ok: true,
        message: "",
        submittedAt:
          Date.now(),
      };
    }

    const targetIds = [
      ...new Set(
        immediateRows
          .map(
            (row) =>
              row.target_character_id,
          )
          .filter(Boolean),
      ),
    ] as string[];

    const targetNames =
      new Map<string, string>();

    if (targetIds.length) {
      const {
        data: characters,
        error: characterError,
      } = await a
        .from("characters")
        .select(
          "id, display_name",
        )
        .in(
          "id",
          targetIds,
        );

      if (characterError) {
        throw Error(
          characterError.message,
        );
      }

      for (
        const character
        of characters ?? []
      ) {
        targetNames.set(
          character.id,
          character.display_name,
        );
      }
    }

    const summaries:
      string[] = [];

    for (
      const row
      of immediateRows
    ) {
      const claimedAt =
        new Date().toISOString();

      /*
       * Claim the still-pending target before applying mechanics.
       * This makes repeated clicks/retries unable to apply damage twice.
       */
      const {
        data: claimed,
        error: claimError,
      } = await a
        .from(
          "shape_cast_targets",
        )
        .update({
          resolved_at:
            claimedAt,
        })
        .eq(
          "id",
          row.id,
        )
        .eq(
          "outcome",
          "pending",
        )
        .is(
          "resolved_at",
          null,
        )
        .select("id")
        .maybeSingle();

      if (claimError) {
        throw Error(
          claimError.message,
        );
      }

      if (!claimed) {
        continue;
      }

      try {
        const result =
          await apply({
            ...row,
            cast,
          });

        const {
          error: finishError,
        } = await a
          .from(
            "shape_cast_targets",
          )
          .update({
            response:
              "automatic",
            outcome:
              "success",
            resolved_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            row.id,
          );

        if (finishError) {
          throw Error(
            finishError.message,
          );
        }

        const label =
          row.target_character_id ===
            caster.id
            ? "Self"
            : targetNames.get(
                String(
                  row.target_character_id,
                ),
              ) ??
              "Target";

        summaries.push(
          `${label}${effectSummary(
            result,
          )}`,
        );
      } catch (error) {
        /*
         * Release the claim if mechanics failed so the cast is not left
         * permanently resolved without its effects.
         */
        await a
          .from(
            "shape_cast_targets",
          )
          .update({
            resolved_at:
              null,
          })
          .eq(
            "id",
            row.id,
          )
          .eq(
            "outcome",
            "pending",
          );

        throw error;
      }
    }

    revalidatePath(
      "/game",
    );

    revalidatePath(
      "/character",
    );

    revalidatePath(
      "/characters",
    );

    return {
      ok: true,
      message:
        summaries.length
          ? `Resolved: ${summaries.join(
              " · ",
            )}`
          : "",
      submittedAt:
        Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to resolve automatic Shape.",
    };
  }
}

export async function resolveIncomingShape'''

if "export async function resolveImmediateShapeCast(" not in actions:
    if actions.count(server_anchor) != 1:
        fail(
            "origin/master no longer contains the expected Shape resolver anchor."
        )

    actions = actions.replace(
        server_anchor,
        server_insert,
        1,
    )


# ---------------------------------------------------------------------------
# Client import.
# ---------------------------------------------------------------------------

old_import = '''import { prepareDispelEffect } from "../warping-actions";'''

new_import = '''import {
  prepareDispelEffect,
  resolveImmediateShapeCast,
} from "../warping-actions";'''

if new_import not in panel:
    if panel.count(old_import) != 1:
        fail(
            "Could not find the current Warping action import."
        )

    panel = panel.replace(
        old_import,
        new_import,
        1,
    )


# ---------------------------------------------------------------------------
# Target creation:
# DO NOT mark automatic/self targets successful before mechanics execute.
# ---------------------------------------------------------------------------

old_rows = '''  const rows=wt?[{cast_id:cr.data.id,target_kind:"written",outcome:"manual"}]:self?[{cast_id:cr.data.id,target_character_id:me.data.id,target_kind:"self",outcome:"success",resolved_at:new Date().toISOString()}]:targets.map(id=>({cast_id:cr.data.id,target_character_id:id,target_kind:id===me.data.id?"self":"character",outcome:id===me.data.id||s.resolution_mode==="automatic"?"success":"pending",resolved_at:id===me.data.id||s.resolution_mode==="automatic"?new Date().toISOString():null}));
  const tr=await db.from("shape_cast_targets").insert(rows);if(tr.error)throw Error(tr.error.message);
  let preparedDispelMessage="";
'''

new_rows = '''  const rows=wt
    ? [{
        cast_id:cr.data.id,
        target_kind:"written",
        outcome:"manual",
      }]
    : self
      ? [{
          cast_id:cr.data.id,
          target_character_id:me.data.id,
          target_kind:"self",
          outcome:"pending",
          resolved_at:null,
        }]
      : targets.map(id=>({
          cast_id:cr.data.id,
          target_character_id:id,
          target_kind:
            id===me.data.id
              ?"self"
              :"character",
          outcome:"pending",
          resolved_at:null,
        }));

  const tr=
    await db
      .from("shape_cast_targets")
      .insert(rows);

  if(tr.error)
    throw Error(tr.error.message);

  let immediateResolutionMessage="";

  if(
    !wt &&
    !s.is_dispel &&
    (
      self ||
      s.resolution_mode==="automatic" ||
      targets.includes(me.data.id)
    )
  ){
    const immediate=
      await resolveImmediateShapeCast(
        cr.data.id,
      );

    if(!immediate.ok){
      throw Error(
        immediate.message ||
        "Automatic Shape effects could not be applied.",
      );
    }

    immediateResolutionMessage=
      immediate.message;
  }

  let preparedDispelMessage="";
'''

if new_rows not in panel:
    if panel.count(old_rows) != 1:
        fail(
            "Could not find the exact current Shape target creation block."
        )

    panel = panel.replace(
        old_rows,
        new_rows,
        1,
    )


# ---------------------------------------------------------------------------
# Add actual mechanical result to the existing Warp chat line.
# ---------------------------------------------------------------------------

old_cast_text = '''  const castText = parts.filter(Boolean).join(" · ");'''

new_cast_text = '''  if(immediateResolutionMessage){
    parts.push(
      immediateResolutionMessage,
    );
  }

  const castText =
    parts
      .filter(Boolean)
      .join(" · ");'''

if new_cast_text not in panel:
    if panel.count(old_cast_text) != 1:
        fail(
            "Could not find the current Shape chat-text anchor."
        )

    panel = panel.replace(
        old_cast_text,
        new_cast_text,
        1,
    )


# ---------------------------------------------------------------------------
# Final validation.
# ---------------------------------------------------------------------------

required_actions = [
    "export async function resolveImmediateShapeCast(",
    "await apply({",
    'response:\n              "automatic"',
    'outcome:\n              "success"',
    "const summaries:",
]

for marker in required_actions:
    if marker not in actions:
        fail(
            f"Warping server validation failed: missing {marker!r}"
        )

required_panel = [
    "resolveImmediateShapeCast,",
    'outcome:"pending"',
    "let immediateResolutionMessage=",
    "await resolveImmediateShapeCast(",
    "parts.push(\n      immediateResolutionMessage,",
]

for marker in required_panel:
    if marker not in panel:
        fail(
            f"Warping panel validation failed: missing {marker!r}"
        )

# The known broken immediate-success creation must be gone.
if 'outcome:"success",resolved_at:new Date().toISOString()' in panel:
    fail(
        "Old self-target immediate-success insertion still exists."
    )

# Write only after BOTH clean-origin transforms validate.
ACTIONS_PATH.write_text(
    actions,
    encoding="utf-8",
    newline="\n",
)

PANEL_PATH.write_text(
    panel,
    encoding="utf-8",
    newline="\n",
)

print(
    "WROTE  app/(portal)/game/warping-actions.ts"
)
print(
    "WROTE  app/(portal)/game/components/WarpingPanel.tsx"
)
print()
print(
    "AUTOMATIC / SELF SHAPE RESOLUTION FIX APPLIED"
)
print(
    "- Self Shapes now pass through the real Shape effect resolver."
)
print(
    "- Automatic Success Shapes now pass through the same resolver."
)
print(
    "- Multiple automatic targets are resolved individually."
)
print(
    "- Damage, Healing, Conditions, Attribute modifiers and Max HP use the existing apply(...) mechanics."
)
print(
    "- Targets are marked successful only AFTER mechanics apply."
)
print(
    "- A claim prevents retries from applying the same immediate Shape twice."
)
print(
    "- The Warp chat line now includes the actual resolved result."
)
print(
    "- Save-based and Dispel flows remain on their existing resolvers."
)
print()
print(
    "Next: npm run build"
)
