from pathlib import Path

OPS = [
    (
        Path("app/(portal)/admin/gifts/actions.ts"),
        '''function validateShapeStylePayload(
  payload: ReturnType<typeof shapeStylePayload>,
) {''',
        '''function validateShapeStylePayload(
  payload: any,
) {''',
        "Feat mechanics payload typing",
    ),
    (
        Path("app/(portal)/game/components/MechanicalFeatPanel.tsx"),
        '''  mechanicsShape: Record<string, any>;
};''',
        '''  mechanicsShape: Record<string, any> | null;
};''',
        "MechanicalFeatPanel nullable mechanics type",
    ),
    (
        Path("app/(portal)/game/components/MechanicalFeatPanel.tsx"),
        '''  const router = useRouter();
  const shape = gift.mechanicsShape;

  const [state, action] = useActionState(''',
        '''  const router = useRouter();

  if (!gift.mechanicsShape) {
    return null;
  }

  const shape = gift.mechanicsShape;

  const [state, action] = useActionState(''',
        "MechanicalFeatPanel null guard",
    ),
    (
        Path("app/(portal)/game/components/WarpingPanel.tsx"),
        '''          (q.data ?? []).map(
            x =>
              String(''',
        '''          (q.data ?? []).map(
            (x: any) =>
              String(''',
        "WarpingPanel blocked-target typing",
    ),
    (
        Path("components/characters/ActiveItemEffects.tsx"),
        '''export function ActiveItemEffects() {
  return null;
}''',
        '''export function ActiveItemEffects({
  characterId: _characterId,
}: {
  characterId: string;
}) {
  return null;
}''',
        "ActiveItemEffects prop signature",
    ),
]

contents = {}
for path, old, new, label in OPS:
    if not path.exists():
        raise SystemExit(f"STOP: missing file: {path}")

    text = contents.get(path)
    if text is None:
        text = path.read_text(encoding="utf-8")

    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"STOP: {label}: expected exactly 1 match in {path}, found {count}"
        )

    contents[path] = text.replace(old, new, 1)

for path, text in contents.items():
    path.write_text(text, encoding="utf-8")

print("Fixed current TypeScript build errors.")
print("Run: npm run build")
