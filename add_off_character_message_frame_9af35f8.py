from pathlib import Path
import subprocess

ROOT = Path.cwd()

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if not head.startswith("9af35f8"):
    raise SystemExit(
        f"Expected HEAD 9af35f8, found {head}. "
        "This patch targets the commit you said you just pushed."
    )

def read(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"Missing required file: {rel}")
    return path.read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly 1 match, found {count}. "
            "Nothing was written for this file."
        )
    return text.replace(old, new, 1)

# 1) Catalogue
rel = "lib/cosmetics/catalogue.ts"
text = read(rel)
text = replace_once(
    text,
    '  "whisper_style",\n  "header_control_frame",',
    '  "whisper_style",\n  "off_character_message_frame",\n  "header_control_frame",',
    "catalogue categories",
)
text = replace_once(
    text,
    '  "whisper_style",\n] as const satisfies readonly CosmeticCategory[];',
    '  "whisper_style",\n  "off_character_message_frame",\n] as const satisfies readonly CosmeticCategory[];',
    "public categories",
)
text = replace_once(
    text,
    '  whisper_style: "Whisper Veil",\n  header_control_frame: "Header Control Frame",',
    '  whisper_style: "Whisper Veil",\n  off_character_message_frame: "Off-Character Message Frame",\n  header_control_frame: "Header Control Frame",',
    "label",
)
text = replace_once(
    text,
    '  whisper_style: "equipped_whisper_style_id",\n  header_control_frame: "equipped_header_control_frame_id",',
    '  whisper_style: "equipped_whisper_style_id",\n  off_character_message_frame: "equipped_off_character_message_frame_id",\n  header_control_frame: "equipped_header_control_frame_id",',
    "preference column",
)
write(rel, text)

# 2) Runtime
rel = "components/cosmetics/cosmetic-runtime.tsx"
text = read(rel)
text = replace_once(
    text,
    '  whisper: ["whisper_style"],\n  pm: ["pm_frame"],',
    '  whisper: ["whisper_style"],\n  "off-character": ["off_character_message_frame"],\n  pm: ["pm_frame"],',
    "runtime surface map",
)

whisper_end = '''      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"] > * {
        position: relative;
        z-index: 2;
      }
'''

ooc_css = '''

      /* ---------------------------------------------------------------
       * OFF-CHARACTER MESSAGE FRAME
       * One complete transparent PNG over the whole OOC // message,
       * using the same rendering model as Whisper Veil.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="off-character"] {
        position: relative;
        isolation: isolate;
        overflow: visible;
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] {
        border-left-color: transparent !important;
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"]::before {
        content: "";
        position: absolute;
        z-index: 10;
        inset: 0;
        background-image:
          var(--sep-cosmetic-off-character-message-frame);
        background-position:
          center;
        background-repeat:
          no-repeat;
        background-size:
          101% 100%;
        pointer-events: none;
        filter:
          drop-shadow(0 0 5px rgba(98,127,159,.20));
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"]::after {
        content: none;
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] > * {
        position: relative;
        z-index: 2;
      }
'''

if whisper_end not in text:
    raise SystemExit("Could not find current Whisper Veil block end.")
text = text.replace(whisper_end, whisper_end + ooc_css, 1)
write(rel, text)

# 3) Location chat OOC surface
rel = "app/(portal)/game/components/RoomMessageList.tsx"
text = read(rel)
text = replace_once(
    text,
    '                      data-cosmetic-surface={isWhisper ? "whisper" : undefined}',
    '                      data-cosmetic-surface={isWhisper ? "whisper" : "off-character"}',
    "OOC chat surface",
)
write(rel, text)

# 4) Tracked SQL migration
migration = '''-- Add Off-Character Message Frame cosmetic category / equip slot.
-- Run once in the Supabase SQL editor before testing equip/unequip.

begin;

alter table public.character_cosmetic_preferences
  add column if not exists equipped_off_character_message_frame_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.character_cosmetic_preferences'::regclass
      and conname = 'character_cosmetic_preferences_off_character_message_frame_fkey'
  ) then
    alter table public.character_cosmetic_preferences
      add constraint character_cosmetic_preferences_off_character_message_frame_fkey
      foreign key (equipped_off_character_message_frame_id)
      references public.cosmetic_items(id)
      on delete set null;
  end if;
end
$$;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.cosmetic_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format(
      'alter table public.cosmetic_items drop constraint %I',
      constraint_record.conname
    );
  end loop;

  alter table public.cosmetic_items
    add constraint cosmetic_items_category_check
    check (
      category in (
        'sheet_frame',
        'chat_frame',
        'portrait_frame',
        'profile_background',
        'pm_frame',
        'instant_chat_frame',
        'forum_frame',
        'action_style',
        'nameplate',
        'profile_crest',
        'action_flourish',
        'whisper_style',
        'off_character_message_frame',
        'header_control_frame',
        'left_panel_frame',
        'right_panel_frame',
        'centre_panel_frame',
        'location_frame',
        'location_atmosphere'
      )
    );
end
$$;

commit;
'''
write("add_off_character_message_frame.sql", migration)

print("Applied Off-Character Message Frame code changes.")
print("Created add_off_character_message_frame.sql.")
print("Run that SQL once in Supabase, then npm run build.")
