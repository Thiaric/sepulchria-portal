from pathlib import Path
import sys

PATH = Path("app/(portal)/game/npc-actions.ts")

OLD = """  const namesByCharacterId=new Map(
    (characterNames.data??[]).map((row:any)=>[
      row.id,
      {
        first_name:String(row.first_name??""),
        surname:String(row.surname??""),
      },
    ]),
  );"""

NEW = """  const namesByCharacterId=new Map<string,{first_name:string;surname:string}>(
    (characterNames.data??[]).map((row:any)=>[
      String(row.id),
      {
        first_name:String(row.first_name??""),
        surname:String(row.surname??""),
      },
    ]),
  );"""

def main():
    text = PATH.read_text(encoding="utf-8")
    count = text.count(OLD)
    if count != 1:
        raise RuntimeError(
            f"Expected exactly 1 target block, found {count}. No file was changed."
        )

    PATH.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
    print("Fixed TypeScript Map inference in npc-actions.ts")
    print("Now run: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
