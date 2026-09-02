from pathlib import Path

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"

if not TARGET.exists():
    raise SystemExit(f"Missing required file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old_fn = '''  function renderShapeTagGroups(characterId:string,trailingDivider:boolean){
    const tags=activeShapeTags[characterId];
    if(!tags)return null;
'''
new_fn = '''  function renderShapeTagGroups(
    characterId:string,
    trailingDivider:boolean,
    metadataColour?:string,
  ){
    const tags=activeShapeTags[characterId];
    if(!tags)return null;
'''

old_span = '''      <span className="text-[9px] uppercase tracking-[.04em] text-[rgb(var(--sep-colour-b99765))]">
'''
new_span = '''      <span
        className="text-[9px] uppercase tracking-[.04em] text-[rgb(var(--sep-colour-b99765))]"
        style={
          metadataColour
            ? { color: metadataColour }
            : undefined
        }
      >
'''

old_header = '''  function shapeTagHeaderText(characterId:string){
    return renderShapeTagGroups(characterId,false);
  }
'''
new_header = '''  function shapeTagHeaderText(
    characterId:string,
    metadataColour?:string,
  ){
    return renderShapeTagGroups(
      characterId,
      false,
      metadataColour,
    );
  }
'''

old_time = '''                        <time
                          dateTime={
                            item.created_at
                          }
                          className="mt-1.5 block text-[7px] uppercase leading-4 tracking-[0.12em] text-[rgb(var(--sep-colour-776b5b))]"
                        >
                          {time}
                        </time>
'''
new_time = '''                        <time
                          dateTime={
                            item.created_at
                          }
                          className="mt-1.5 block text-[7px] uppercase leading-4 tracking-[0.12em] text-[rgb(var(--sep-colour-776b5b))]"
                          style={{
                            color:
                              "rgb(var(--sep-colour-776b5b))",
                          }}
                        >
                          {time}
                        </time>
'''

old_call = '''                          {author
                            ? shapeTagHeaderText(author.id)
                            : null}
'''
new_call = '''                          {author
                            ? shapeTagHeaderText(
                                author.id,
                                "rgb(var(--sep-colour-776b5b))",
                              )
                            : null}
'''

replacements = [
    (old_fn, new_fn, "renderShapeTagGroups signature"),
    (old_span, new_span, "shape/price metadata span"),
    (old_header, new_header, "shapeTagHeaderText"),
    (old_time, new_time, "whisper/OOC timestamp"),
    (old_call, new_call, "whisper/OOC shape tag call"),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly 1 match, found {count}. "
            "Nothing written."
        )
    text = text.replace(old, new, 1)

TARGET.write_text(text, encoding="utf-8")

print("✓ app/(portal)/game/components/RoomMessageList.tsx")
print("  - whisper/OOC timestamp forced to neutral OOC metadata colour")
print("  - Price/condition tags in whisper/OOC use the same neutral colour")
print("  - whisper label/body colours remain unchanged")
print("  - other normal chat shape/price tags remain unchanged")
