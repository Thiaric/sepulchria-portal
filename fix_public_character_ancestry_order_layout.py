from pathlib import Path

path = Path("components/characters/public-character-profile.tsx")

if not path.exists():
    raise SystemExit(
        "ERROR: Run this from the sepulchria-portal root."
    )

text = path.read_text(encoding="utf-8")

old = '''              <div className="mt-3">
                <CompactHeritageCard
                  label="Ancestry"
                  entry={character.race}
                  href={
                    character.race
                      ? `/races/${character.race.slug}`
                      : "/races"
                  }
                />

                <div className="mt-3">
                  <PublicCharacterOrder
                    membership={
                      character.orderMembership
                    }
                  />
                </div>
              </div>
            </div>
          </section>'''

new = '''            </div>

            <div className="h-full">
              <CompactHeritageCard
                label="Ancestry"
                entry={character.race}
                href={
                  character.race
                    ? `/races/${character.race.slug}`
                    : "/races"
                }
              />
            </div>

            <div className="h-full">
              <PublicCharacterOrder
                membership={
                  character.orderMembership
                }
              />
            </div>
          </section>'''

if old not in text:
    raise SystemExit(
        "ERROR: Could not find the current Ancestry / Order block. "
        "No changes were made."
    )

text = text.replace(old, new, 1)

old_class = 'className="group flex min-w-0 items-center gap-3 border bg-[#120e0b] p-3 transition hover:bg-[#1b140f]"'
new_class = 'className="group flex h-full min-w-0 items-center gap-3 border bg-[#120e0b] p-3 transition hover:bg-[#1b140f]"'

if old_class in text:
    text = text.replace(old_class, new_class, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Updated: components/characters/public-character-profile.tsx")
print("Now run: npm run build")
