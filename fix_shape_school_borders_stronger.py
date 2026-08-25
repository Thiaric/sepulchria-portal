from pathlib import Path

ROOT = Path.cwd()
helper_path = ROOT / "lib/warping/shape-school-style.ts"
css_path = ROOT / "app/globals.css"

if not helper_path.exists():
    raise FileNotFoundError("lib/warping/shape-school-style.ts not found. Run the previous school-border patch first.")

helper = '''export function shapeSchoolBorderClass(
  school: string | null | undefined,
) {
  const key =
    String(school ?? "")
      .trim()
      .toLowerCase();

  if (
    key === "embercraft" ||
    key === "vitalcraft" ||
    key === "mindcraft" ||
    key === "veilcraft" ||
    key === "waycraft" ||
    key === "bondcraft" ||
    key === "runecraft"
  ) {
    return `shape-school-card shape-school-${key}`;
  }

  return "shape-school-card shape-school-default";
}
'''

helper_path.write_text(helper, encoding="utf-8", newline="\n")
print("Updated lib/warping/shape-school-style.ts")

css = css_path.read_text(encoding="utf-8")
marker = "/* === Shape School Borders === */"

block = '''
/* === Shape School Borders === */
.shape-school-card {
  border-width: 1px !important;
  border-style: solid !important;
  transition: border-color 180ms ease, box-shadow 180ms ease, filter 180ms ease;
}
.shape-school-card:hover { filter: brightness(1.05); }

.shape-school-embercraft {
  border-color: rgba(221,103,48,.92) !important;
  box-shadow: inset 0 0 0 1px rgba(255,177,112,.18), 0 0 10px rgba(221,103,48,.30), 0 0 24px rgba(221,103,48,.10);
}
.shape-school-embercraft:hover {
  border-color: rgb(255,136,76) !important;
  box-shadow: inset 0 0 0 1px rgba(255,198,145,.28), 0 0 14px rgba(255,116,53,.42), 0 0 30px rgba(255,116,53,.15);
}

.shape-school-vitalcraft {
  border-color: rgba(132,176,76,.92) !important;
  box-shadow: inset 0 0 0 1px rgba(194,222,139,.18), 0 0 10px rgba(116,164,67,.28), 0 0 24px rgba(173,185,82,.09);
}
.shape-school-vitalcraft:hover {
  border-color: rgb(166,207,103) !important;
  box-shadow: inset 0 0 0 1px rgba(220,239,168,.28), 0 0 14px rgba(133,183,79,.40), 0 0 30px rgba(174,194,86,.14);
}

.shape-school-mindcraft {
  border-color: rgba(147,112,210,.94) !important;
  box-shadow: inset 0 0 0 1px rgba(206,180,255,.18), 0 0 10px rgba(139,99,205,.30), 0 0 24px rgba(103,82,175,.10);
}
.shape-school-mindcraft:hover {
  border-color: rgb(178,141,239) !important;
  box-shadow: inset 0 0 0 1px rgba(225,207,255,.28), 0 0 14px rgba(157,113,225,.42), 0 0 30px rgba(121,91,191,.16);
}

.shape-school-veilcraft {
  border-color: rgba(122,84,151,.94) !important;
  box-shadow: inset 0 0 0 1px rgba(190,151,213,.17), 0 0 10px rgba(106,68,135,.31), 0 0 24px rgba(74,46,98,.12);
}
.shape-school-veilcraft:hover {
  border-color: rgb(155,108,187) !important;
  box-shadow: inset 0 0 0 1px rgba(211,178,230,.27), 0 0 14px rgba(135,86,170,.43), 0 0 30px rgba(91,57,117,.17);
}

.shape-school-waycraft {
  border-color: rgba(70,170,177,.94) !important;
  box-shadow: inset 0 0 0 1px rgba(155,224,226,.18), 0 0 10px rgba(59,151,158,.30), 0 0 24px rgba(42,115,120,.10);
}
.shape-school-waycraft:hover {
  border-color: rgb(92,205,211) !important;
  box-shadow: inset 0 0 0 1px rgba(188,242,244,.28), 0 0 14px rgba(67,183,190,.42), 0 0 30px rgba(48,135,141,.15);
}

.shape-school-bondcraft {
  border-color: rgba(107,145,190,.94) !important;
  box-shadow: inset 0 0 0 1px rgba(185,211,238,.18), 0 0 10px rgba(91,130,176,.29), 0 0 24px rgba(61,95,132,.10);
}
.shape-school-bondcraft:hover {
  border-color: rgb(139,180,222) !important;
  box-shadow: inset 0 0 0 1px rgba(211,230,248,.28), 0 0 14px rgba(110,157,204,.41), 0 0 30px rgba(73,112,153,.15);
}

.shape-school-runecraft {
  border-color: rgba(211,159,57,.96) !important;
  box-shadow: inset 0 0 0 1px rgba(246,210,132,.20), 0 0 10px rgba(192,137,37,.31), 0 0 24px rgba(147,102,30,.10);
}
.shape-school-runecraft:hover {
  border-color: rgb(241,188,79) !important;
  box-shadow: inset 0 0 0 1px rgba(255,226,163,.30), 0 0 14px rgba(222,160,49,.43), 0 0 30px rgba(171,119,31,.16);
}

.shape-school-default {
  border-color: rgba(141,109,62,.75) !important;
  box-shadow: inset 0 0 0 1px rgba(202,170,111,.10), 0 0 8px rgba(120,91,50,.12);
}
'''

if marker in css:
    css = css.split(marker, 1)[0].rstrip() + "\n\n" + block.strip() + "\n"
else:
    css = css.rstrip() + "\n\n" + block.strip() + "\n"

css_path.write_text(css, encoding="utf-8", newline="\n")
print("Updated app/globals.css")
print("Done.")
