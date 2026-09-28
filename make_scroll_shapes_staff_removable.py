from pathlib import Path
import sys

PAGE = Path("app/(portal)/admin/characters/[id]/warping/page.tsx")
ACTIONS = Path("app/(portal)/admin/characters/[id]/warping/actions.ts")


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    print("No file was changed.")
    return 1


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}."
        )
    return source.replace(old, new, 1)


def main() -> int:
    if not PAGE.exists() or not ACTIONS.exists():
        return fail("Run this from the sepulchria-portal repository root.")

    page_original = PAGE.read_text(encoding="utf-8")
    actions_original = ACTIONS.read_text(encoding="utf-8")

    page = page_original
    actions = actions_original

    try:
        if "removeScrollShape" not in actions:
            anchor = 'export async function removeManualShape(f:FormData){await requireStaffCapability("character_warping");const db=await createClient(),id=v(f,"character_id");const{error}=await db.from("character_shapes").delete().eq("character_id",id).eq("shape_id",v(f,"shape_id")).eq("acquisition_source","staff");if(error)throw Error(error.message);refresh(id);}'

            replacement = anchor + '\nexport async function removeScrollShape(f:FormData){await requireStaffCapability("character_warping");const db=await createClient(),id=v(f,"character_id");const{error}=await db.from("character_shapes").delete().eq("character_id",id).eq("shape_id",v(f,"shape_id")).eq("acquisition_source","scroll");if(error)throw Error(error.message);refresh(id);}'

            actions = replace_once(
                actions,
                anchor,
                replacement,
                "add removeScrollShape action",
            )

        page = replace_once(
            page,
            'import {assignManualShape,removeManualShape,updateWarpingBase} from "./actions";',
            'import {assignManualShape,removeManualShape,removeScrollShape,updateWarpingBase} from "./actions";',
            "import removeScrollShape",
        )

        page = page.replace(
            "Shapes learned permanently from Scroll Items.",
            "Shapes learned from Scroll Items.",
        )

        old_scroll = '{scroll.map((x:any)=>{const s=Array.isArray(x.shape)?x.shape[0]:x.shape;return <div key={x.shape_id} className={`flex items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] p-3 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(s?.school)}`}><span className="text-[10px] text-[rgb(var(--sep-colour-cdb48d))]">L{s?.level} - {s?.name}{x.level_override?" - LEVEL OVERRIDE":""}</span><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-b8bd83))]">Scroll Learned</span></div>})}'

        new_scroll = '{scroll.map((x:any)=>{const s=Array.isArray(x.shape)?x.shape[0]:x.shape;return <AdminActionForm key={x.shape_id} action={removeScrollShape} className={`flex items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] p-3 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(s?.school)}`}><input type="hidden" name="character_id" value={id}/><input type="hidden" name="shape_id" value={x.shape_id}/><span className="text-[10px] text-[rgb(var(--sep-colour-cdb48d))]">L{s?.level} - {s?.name}{x.level_override?" - LEVEL OVERRIDE":""}</span><div className="flex items-center gap-3"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-b8bd83))]">Scroll Learned</span><button className="text-[8px] uppercase text-red-300">Remove</button></div></AdminActionForm>})}'

        page = replace_once(
            page,
            old_scroll,
            new_scroll,
            "make Scroll Shapes removable",
        )

    except RuntimeError as exc:
        return fail(str(exc))

    page_backup = PAGE.with_suffix(PAGE.suffix + ".before-scroll-shape-remove")
    actions_backup = ACTIONS.with_suffix(ACTIONS.suffix + ".before-scroll-shape-remove")

    if not page_backup.exists():
        page_backup.write_text(page_original, encoding="utf-8")

    if not actions_backup.exists():
        actions_backup.write_text(actions_original, encoding="utf-8")

    PAGE.write_text(page, encoding="utf-8")
    ACTIONS.write_text(actions, encoding="utf-8")

    print("Scroll-learned Shapes are now removable by staff.")
    print()
    print("Changed:")
    print("  - Scroll Shapes now have a Remove button in Manage Warping")
    print("  - removal is restricted to acquisition_source='scroll'")
    print("  - staff-only character_warping capability is still required")
    print("  - wording no longer says Scroll Shapes are permanent")
    print("  - Order Shapes remain non-removable here")
    print("  - existing Trophy awards are not revoked")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
