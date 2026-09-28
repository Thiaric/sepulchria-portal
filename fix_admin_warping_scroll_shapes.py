from pathlib import Path
import sys

TARGET = Path("app/(portal)/admin/characters/[id]/warping/page.tsx")


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    print("No file was changed.")
    return 1


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return source.replace(old, new, 1)


def main() -> int:
    if not TARGET.exists():
        return fail(f"Missing {TARGET}. Run this from the repo root.")

    original = TARGET.read_text(encoding="utf-8")
    source = original

    try:
        source = replace_once(
            source,
            'const c=cq.data,effectiveWarping=await getEffectiveCharacterWarping(id),a=aq.data??[],manual=a.filter(x=>x.acquisition_source==="staff"),order=a.filter(x=>x.acquisition_source==="order");',
            'const c=cq.data,effectiveWarping=await getEffectiveCharacterWarping(id),a=aq.data??[],manual=a.filter(x=>x.acquisition_source==="staff"),order=a.filter(x=>x.acquisition_source==="order"),scroll=a.filter(x=>x.acquisition_source==="scroll"),other=a.filter(x=>!["staff","order","scroll"].includes(String(x.acquisition_source??"")));',
            "add scroll/other acquisition groups",
        )

        marker = '</section>\n</div></main>}'

        insert = '''</section>
<section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_characters_id_warping_page_section_scroll_shapes"><p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">Learned Shapes</p><h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">Scroll Shapes</h2><p className="mt-2 text-[10px] text-[rgb(var(--sep-colour-8f8271))]">Shapes learned permanently from Scroll Items.</p><div className="mt-4 space-y-2">{scroll.map((x:any)=>{const s=Array.isArray(x.shape)?x.shape[0]:x.shape;return <div key={x.shape_id} className={`flex items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] p-3 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(s?.school)}`}><span className="text-[10px] text-[rgb(var(--sep-colour-cdb48d))]">L{s?.level} - {s?.name}{x.level_override?" - LEVEL OVERRIDE":""}</span><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-b8bd83))]">Scroll Learned</span></div>})}{!scroll.length?<p className="p-3 text-[10px] italic text-[rgb(var(--sep-colour-746858))]">No Shapes learned from Scrolls.</p>:null}</div></section>
{other.length?<section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"><p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">Other Sources</p><h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">Other Known Shapes</h2><div className="mt-4 space-y-2">{other.map((x:any)=>{const s=Array.isArray(x.shape)?x.shape[0]:x.shape;return <div key={`${x.shape_id}-${x.acquisition_source}`} className={`flex items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] p-3 ${shapeSchoolBorderClass(s?.school)}`}><span className="text-[10px] text-[rgb(var(--sep-colour-cdb48d))]">L{s?.level} - {s?.name}{x.level_override?" - LEVEL OVERRIDE":""}</span><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-b8bd83))]">{String(x.acquisition_source??"Unknown")}</span></div>})}</div></section>:null}
</div></main>}'''

        source = replace_once(
            source,
            marker,
            insert,
            "append scroll Shapes section",
        )

    except RuntimeError as exc:
        return fail(str(exc))

    backup = TARGET.with_suffix(TARGET.suffix + ".before-scroll-shapes-admin-fix")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")

    TARGET.write_text(source, encoding="utf-8")

    print("Admin Warping now shows Scroll-learned Shapes.")
    print()
    print("Changes:")
    print("  - staff grants remain in Manual Shapes")
    print("  - Order grants remain in Order Shapes")
    print("  - scroll acquisitions now appear in Scroll Shapes")
    print("  - unknown acquisition sources also remain visible")
    print("  - scroll/order Shapes are display-only here; only staff grants keep Remove")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
