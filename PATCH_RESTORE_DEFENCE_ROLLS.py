from pathlib import Path
import shutil

ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8-sig")

def write(rel, content):
    p = ROOT / rel
    backup = ROOT / ".restore_defence_rolls_backup" / rel
    backup.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and not backup.exists():
        shutil.copy2(p, backup)
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"UPDATED: {rel}")

def replace_once(text, old, new, label):
    if new in text:
        print(f"ALREADY APPLIED: {label}")
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly one current-repo anchor, found {count}. "
            "No unsafe edit was made."
        )
    return text.replace(old, new, 1)

rel = "app/(portal)/game/components/RoomChatForm.tsx"
s = read(rel)

old = '''type CheckOption = {
  value: string;
  label: string;
  attribute: CharacterAttributeKey;
};

const CHECK_OPTIONS: CheckOption[] = [
  { value: "use_muscles", label: "Use your Muscles", attribute: "muscles" },
  { value: "use_reflexes", label: "Use your Reflexes", attribute: "reflexes" },
  { value: "use_brains", label: "Use your Brains", attribute: "brains" },
  { value: "use_shrewd", label: "Use your Shrewd", attribute: "shrewd" },
  { value: "use_presence", label: "Use your Presence", attribute: "presence_score" },
];
'''

new = '''type CheckOption = {
  value: string;
  label: string;
  attribute: CharacterAttributeKey;
};

const CHECK_OPTIONS: CheckOption[] = [
  { value: "use_muscles", label: "Use your Muscles", attribute: "muscles" },
  { value: "use_reflexes", label: "Use your Reflexes", attribute: "reflexes" },
  { value: "use_brains", label: "Use your Brains", attribute: "brains" },
  { value: "use_shrewd", label: "Use your Shrewd", attribute: "shrewd" },
  { value: "use_presence", label: "Use your Presence", attribute: "presence_score" },

  { value: "dodge", label: "Dodge", attribute: "reflexes" },
  { value: "defend", label: "Defend", attribute: "vigor" },
  { value: "resist_vigour", label: "Resist (Physical)", attribute: "vigor" },
  { value: "resist_shrewd", label: "Resist (Shrewd)", attribute: "shrewd" },
  { value: "resist_brains", label: "Resist (Brains)", attribute: "brains" },
  { value: "resist_presence", label: "Resist (Presence)", attribute: "presence_score" },
];
'''
s = replace_once(s, old, new, "Restore defence/check options")

old = '''              <select
                name="opposed_attribute"
                defaultValue="muscles"
                className="mt-2 w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2 text-[10px] text-[#d8c29b]"
              >
                {CHECK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.attribute}>
                    {option.label} — {ATTRIBUTE_LABELS[option.attribute]}: {formatSigned(Number(attributes[option.attribute] ?? 0))}
                  </option>
                ))}
              </select>
'''

new = '''              <select
                name="opposed_action"
                defaultValue="use_muscles"
                className="mt-2 w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2 text-[10px] text-[#d8c29b]"
              >
                {CHECK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {ATTRIBUTE_LABELS[option.attribute]}: {formatSigned(Number(attributes[option.attribute] ?? 0))}
                  </option>
                ))}
              </select>
'''
s = replace_once(s, old, new, "Send distinct check action code")
write(rel, s)

rel = "app/(portal)/game/opposed-actions.ts"
s = read(rel)

anchor = '''function defaultCounter(attribute: CharacterAttributeKey): CounterKind {
  if (attribute === "muscles") return "resist_vigour";
  if (attribute === "reflexes") return "dodge";
  if (attribute === "brains") return "resist_brains";
  if (attribute === "shrewd") return "resist_shrewd";
  return "resist_presence";
}
'''

addition = anchor + '''
type StandaloneActionCode =
  | "use_muscles"
  | "use_reflexes"
  | "use_brains"
  | "use_shrewd"
  | "use_presence"
  | "dodge"
  | "defend"
  | "resist_vigour"
  | "resist_shrewd"
  | "resist_brains"
  | "resist_presence";

const STANDALONE_ACTIONS: Record<
  StandaloneActionCode,
  {
    label: string;
    attribute: CharacterAttributeKey;
    defaultCounter: CounterKind;
  }
> = {
  use_muscles: {
    label: "Use your Muscles",
    attribute: "muscles",
    defaultCounter: "resist_vigour",
  },
  use_reflexes: {
    label: "Use your Reflexes",
    attribute: "reflexes",
    defaultCounter: "dodge",
  },
  use_brains: {
    label: "Use your Brains",
    attribute: "brains",
    defaultCounter: "resist_brains",
  },
  use_shrewd: {
    label: "Use your Shrewd",
    attribute: "shrewd",
    defaultCounter: "resist_shrewd",
  },
  use_presence: {
    label: "Use your Presence",
    attribute: "presence_score",
    defaultCounter: "resist_presence",
  },
  dodge: {
    label: "Dodge",
    attribute: "reflexes",
    defaultCounter: "dodge",
  },
  defend: {
    label: "Defend",
    attribute: "vigor",
    defaultCounter: "defend",
  },
  resist_vigour: {
    label: "Resist (Physical)",
    attribute: "vigor",
    defaultCounter: "resist_vigour",
  },
  resist_shrewd: {
    label: "Resist (Shrewd)",
    attribute: "shrewd",
    defaultCounter: "resist_shrewd",
  },
  resist_brains: {
    label: "Resist (Brains)",
    attribute: "brains",
    defaultCounter: "resist_brains",
  },
  resist_presence: {
    label: "Resist (Presence)",
    attribute: "presence_score",
    defaultCounter: "resist_presence",
  },
};
'''
s = replace_once(s, anchor, addition, "Standalone action definitions")

old = '''    const { character } = await ownedCharacter();
    const attribute = field(
      formData,
      "opposed_attribute",
    ) as CharacterAttributeKey;

    if (!(attribute in ATTRIBUTE_LABELS)) {
      return { ok: false, message: "Invalid Attribute." };
    }

    const targetId = field(formData, "opposed_target_character_id");
    const otherTarget = field(formData, "opposed_external_target");
    const modifier = await effective(character, attribute);
    const rolled = roll(20);
    const total = rolled + modifier;
    const label = `Use ${ATTRIBUTE_LABELS[attribute]}`;
'''

new = '''    const { character } = await ownedCharacter();

    const actionCode = field(
      formData,
      "opposed_action",
    ) as StandaloneActionCode;

    const selectedAction = STANDALONE_ACTIONS[actionCode];

    if (!selectedAction) {
      return { ok: false, message: "Invalid Action." };
    }

    const { attribute, label } = selectedAction;
    const targetId = field(formData, "opposed_target_character_id");
    const otherTarget = field(formData, "opposed_external_target");
    const modifier = await effective(character, attribute);
    const rolled = roll(20);
    const total = rolled + modifier;
'''
s = replace_once(s, old, new, "Read distinct standalone action")

old = '''    const counter = defaultCounter(attribute);
    const target = await createPending({
'''
new = '''    const counter = selectedAction.defaultCounter;
    const target = await createPending({
'''
s = replace_once(s, old, new, "Use selected action counter")
write(rel, s)

print("")
print("DONE.")
print("Restored Dodge, Defend, and all Resist rolls to the dropdown.")
print("They remain distinct labels for Fate rolls.")
print("Run: npm run build")
