#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "aa1b4a012b57748081706e388f8b8c0baffe479e"

FILES = [
    "app/(portal)/character/CharacterForm.tsx",
    "app/(portal)/character/actions.ts",
    "app/(portal)/character/page.tsx",
    "types/public-character.ts",
    "lib/characters/get-public-character.ts",
    "components/characters/public-character-profile.tsx",
    "app/(portal)/admin/characters/actions.ts",
    "app/(portal)/admin/characters/[id]/page.tsx",
]

def die(message):
    raise SystemExit(f"ERROR: {message}. Nothing written.")

def baseline_text(path):
    try:
        return subprocess.check_output(
            ["git", "show", f"{BASELINE}:{path}"],
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError:
        die(f"could not read {path} from baseline commit")

def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        die(f"{label}: expected exact baseline block once, found {n}")
    return text.replace(old, new, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        die("run from sepulchria-portal root")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    if head != BASELINE:
        die(f"HEAD is {head}; expected {BASELINE}")

    out = {path: baseline_text(path) for path in FILES}

    p = "app/(portal)/character/CharacterForm.tsx"
    s = out[p]
    s = once(
        s,
        '''            <Area label="Public notes" name="public_notes" rows={7} maxLength={10000} defaultValue={character?.public_notes} />

            {mode === "update" ? (
              <Area
                label="Offgame"
                name="offgame"
                rows={7}
                maxLength={10000}
                defaultValue={character?.offgame}
              />
            ) : null}''',
        '''            <Area label="Public notes" name="public_notes" rows={7} maxLength={10000} defaultValue={character?.public_notes} />

            {mode === "update" ? (
              <>
                <Area
                  label="Relationships"
                  name="relationships"
                  rows={9}
                  maxLength={10000}
                  defaultValue={character?.relationships}
                />

                <Area
                  label="Offgame"
                  name="offgame"
                  rows={7}
                  maxLength={10000}
                  defaultValue={character?.offgame}
                />
              </>
            ) : null}''',
        "CharacterForm update-only Relationships",
    )
    out[p] = s

    p = "app/(portal)/character/actions.ts"
    s = out[p]
    s = once(
        s,
        '''    ...(mode === "update"
      ? {
          offgame:
            text(
              formData,
              "offgame",
              10000,
            ) || null,
        }
      : {}),''',
        '''    ...(mode === "update"
      ? {
          relationships:
            text(
              formData,
              "relationships",
              10000,
            ) || null,

          offgame:
            text(
              formData,
              "offgame",
              10000,
            ) || null,
        }
      : {}),''',
        "draft/rejected update payload",
    )

    s = once(
        s,
        '''  const publicNotes = text(
    formData,
    "public_notes",
    10000,
  );

  const offgame = text(''',
        '''  const publicNotes = text(
    formData,
    "public_notes",
    10000,
  );

  const relationships = text(
    formData,
    "relationships",
    10000,
  );

  const offgame = text(''',
        "approved profile read Relationships",
    )

    s = once(
        s,
        '''    public_notes:
      publicNotes || null,

    offgame:
      offgame || null,''',
        '''    public_notes:
      publicNotes || null,

    relationships:
      relationships || null,

    offgame:
      offgame || null,''',
        "approved profile payload Relationships",
    )
    out[p] = s

    p = "app/(portal)/character/page.tsx"
    s = out[p]
    s = once(
        s,
        '''  public_notes?: string | null;
  offgame?: string | null;''',
        '''  public_notes?: string | null;
  relationships?: string | null;
  offgame?: string | null;''',
        "own type Relationships",
    )
    s = once(
        s,
        '''      public_notes,
      offgame,''',
        '''      public_notes,
      relationships,
      offgame,''',
        "own query Relationships",
    )
    s = once(
        s,
        '''            <div className="mt-4 px-2">
              <ProfileTextSection
                title="Public notes"
                value={character.public_notes}
                subtle
              />
            </div>
          </div>''',
        '''            <div className="mt-4 px-2">
              <ProfileTextSection
                title="Public notes"
                value={character.public_notes}
                subtle
              />
            </div>

            <div className="mt-4 px-2">
              <ProfileTextSection
                title="Relationships"
                value={character.relationships}
              />
            </div>
          </div>''',
        "own Profile tab Relationships",
    )
    s = once(
        s,
        '''                <ApprovedProfileTextArea
                  label="Public notes"
                  name="public_notes"
                  defaultValue={
                    character.public_notes
                  }
                  rows={6}
                />

                <ApprovedProfileTextArea
                  label="Offgame"''',
        '''                <ApprovedProfileTextArea
                  label="Public notes"
                  name="public_notes"
                  defaultValue={
                    character.public_notes
                  }
                  rows={6}
                />

                <ApprovedProfileTextArea
                  label="Relationships"
                  name="relationships"
                  defaultValue={
                    character.relationships
                  }
                  rows={8}
                />

                <ApprovedProfileTextArea
                  label="Offgame"''',
        "approved edit Relationships",
    )
    out[p] = s

    p = "types/public-character.ts"
    s = out[p]
    s = once(
        s,
        '''  public_notes: string | null;
  offgame: string | null;''',
        '''  public_notes: string | null;
  relationships: string | null;
  offgame: string | null;''',
        "public type Relationships",
    )
    out[p] = s

    p = "lib/characters/get-public-character.ts"
    s = out[p]
    s = once(
        s,
        '''  public_notes: string | null;
  offgame: string | null;''',
        '''  public_notes: string | null;
  relationships: string | null;
  offgame: string | null;''',
        "public row type Relationships",
    )
    s = once(
        s,
        '''        public_notes,
        offgame,''',
        '''        public_notes,
        relationships,
        offgame,''',
        "public select Relationships",
    )
    s = once(
        s,
        '''      public_notes: row.public_notes,
      offgame: row.offgame,''',
        '''      public_notes: row.public_notes,
      relationships: row.relationships,
      offgame: row.offgame,''',
        "public return Relationships",
    )
    out[p] = s

    p = "components/characters/public-character-profile.tsx"
    s = out[p]
    s = once(
        s,
        '''          <div className="mt-4 px-2">
            <ProfileSection
              title="Public Notes"
              content={character.public_notes}
              subtle
            />
          </div>
        </div>''',
        '''          <div className="mt-4 px-2">
            <ProfileSection
              title="Public Notes"
              content={character.public_notes}
              subtle
            />
          </div>

          <div className="mt-4 px-2">
            <ProfileSection
              title="Relationships"
              content={character.relationships}
            />
          </div>
        </div>''',
        "public Profile tab Relationships",
    )
    out[p] = s

    p = "app/(portal)/admin/characters/actions.ts"
    s = out[p]
    s = once(
        s,
        '''  const publicNotes =
    readOptionalText(
      formData.get(
        "publicNotes",
      ),
      10000,
    );

  const offgame =''',
        '''  const publicNotes =
    readOptionalText(
      formData.get(
        "publicNotes",
      ),
      10000,
    );

  const relationships =
    readOptionalText(
      formData.get(
        "relationships",
      ),
      10000,
    );

  const offgame =''',
        "admin read Relationships",
    )
    s = once(
        s,
        '''      public_notes,
      offgame,''',
        '''      public_notes,
      relationships,
      offgame,''',
        "admin original select Relationships",
    )
    s = once(
        s,
        '''    public_notes:
      publicNotes,
    offgame,''',
        '''    public_notes:
      publicNotes,
    relationships,
    offgame,''',
        "admin update Relationships",
    )
    s = once(
        s,
        '''          public_notes:
            character.public_notes,
          offgame:
            character.offgame,''',
        '''          public_notes:
            character.public_notes,
          relationships:
            character.relationships,
          offgame:
            character.offgame,''',
        "admin rollback Relationships",
    )
    out[p] = s

    p = "app/(portal)/admin/characters/[id]/page.tsx"
    s = out[p]
    s = once(
        s,
        '''  public_notes: string | null;
  offgame: string | null;''',
        '''  public_notes: string | null;
  relationships: string | null;
  offgame: string | null;''',
        "admin page type Relationships",
    )
    s = once(
        s,
        '''        public_notes,
        offgame,''',
        '''        public_notes,
        relationships,
        offgame,''',
        "admin page query Relationships",
    )
    s = once(
        s,
        '''            <CharacterTextSection
              title="Public notes"
              content={
                character.public_notes
              }
            />

            <CharacterTextSection
              title="Offgame"''',
        '''            <CharacterTextSection
              title="Public notes"
              content={
                character.public_notes
              }
            />

            <CharacterTextSection
              title="Relationships"
              content={
                character.relationships
              }
            />

            <CharacterTextSection
              title="Offgame"''',
        "admin read-only Relationships",
    )
    s = once(
        s,
        '''                <AdminField label="Public notes">
                  <textarea
                    name="publicNotes"
                    rows={6}
                    maxLength={10000}
                    defaultValue={
                      character.public_notes ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <AdminField label="Offgame">''',
        '''                <AdminField label="Public notes">
                  <textarea
                    name="publicNotes"
                    rows={6}
                    maxLength={10000}
                    defaultValue={
                      character.public_notes ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <AdminField label="Relationships">
                  <textarea
                    name="relationships"
                    rows={8}
                    maxLength={10000}
                    defaultValue={
                      character.relationships ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>

                <AdminField label="Offgame">''',
        "admin editable Relationships",
    )
    out[p] = s

    print("Baseline:", head[:7])
    print("Prepared Relationships field changes:")
    for path in FILES:
        print(" ", path.replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for rel, content in out.items():
        (root / rel).write_text(content, encoding="utf-8")

    print("\nApplied LOCALLY only.")
    print("Run the supplied SQL before testing the app.")
    print("Then: npm run build")

if __name__ == "__main__":
    main()
