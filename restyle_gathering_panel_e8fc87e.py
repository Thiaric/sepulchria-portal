from pathlib import Path

path = Path("app/(portal)/game/components/GatheringPanel.tsx")
if not path.exists():
    raise SystemExit("Could not find GatheringPanel.tsx. Run this from the sepulchria-portal repository root.")

text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Could not find {label} in the e8fc87e GatheringPanel.tsx.")
    text = text.replace(old, new, 1)

replace_once(
    'import { formatRemnants } from "@/lib/economy/currency";\n',
    'import { formatRemnants } from "@/lib/economy/currency";\nimport { usePortalSkin } from "@/components/portal/portal-skin-provider";\n',
    "formatRemnants import",
)

if "const GATHERING_SKIN_ACCENTS" not in text:
    anchor = "export type GatheringStateRow = {\n"
    if anchor not in text:
        raise SystemExit("Could not find GatheringStateRow anchor.")
    accents = '''const GATHERING_SKIN_ACCENTS: Record<string, string> = {
  sepulchria: "#b68b4f",
  vellum: "#5d4930",
  starfall: "#758fd6",
  "rose-nocturne": "#b36d8b",
  "verdant-reliquary": "#4f9c70",
  "amethyst-veil": "#9b6ac4",
  moonlit: "#b58a4c",
  emberforge: "#c7773d",
  deepwater: "#4f969d",
  "blood-court": "#9d3744",
  ashen: "#9fd4ef",
  "ivory-archive": "#d1c6ad",
  "aelari-dawn": "#e7d9a8",
  "dwarven-deep": "#b37945",
  "mortal-hearth": "#aaa79d",
  "wolfs-moon": "#9aaeb7",
};

'''
    text = text.replace(anchor, accents + anchor, 1)

replace_once(
'''  const router = useRouter();
  const [pending, startTransition] = useTransition();
''',
'''  const router = useRouter();
  const { skin } = usePortalSkin();
  const skinAccent =
    GATHERING_SKIN_ACCENTS[skin] ??
    GATHERING_SKIN_ACCENTS.sepulchria;
  const readableTokenColour =
    "rgb(var(--sep-colour-e6cfaa))";

  const [pending, startTransition] = useTransition();
''',
    "router block",
)

replace_once(
'''                return (
                  <span
                    key={index}
                    aria-label={
                      remaining
                        ? "Gathering attempt available"
                        : "Gathering attempt spent"
                    }
                    className={[
                      "h-2.5 w-2.5 shrink-0 rounded-full border",
                      remaining
                        ? "border-[rgb(var(--sep-colour-c19a62))] bg-[rgb(var(--sep-colour-c19a62))]"
                        : "border-[rgb(var(--sep-colour-655744))] bg-transparent",
                    ].join(" ")}
                  />
                );
''',
'''                return (
                  <svg
                    key={index}
                    viewBox="0 0 12 12"
                    aria-label={
                      remaining
                        ? "Gathering attempt available"
                        : "Gathering attempt spent"
                    }
                    role="img"
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ color: readableTokenColour }}
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      fill={remaining ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                );
''',
    "attempt marker block",
)

replace_once(
'''        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(var(--sep-rgb-145-105-60),0.12),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(var(--sep-rgb-145-105-60),0.07),transparent_32%)]"
        />
''',
'''        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div
            className="motion-safe:animate-pulse absolute -left-[5%] top-[4%] h-56 w-56 rounded-full blur-3xl"
            style={{
              animationDuration: "15s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 17%, white 4%) 0%, color-mix(in srgb, ${skinAccent} 6%, transparent) 52%, transparent 74%)`,
              opacity: 0.38,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute -right-[7%] bottom-[-18%] h-64 w-64 rounded-full blur-3xl"
            style={{
              animationDuration: "20s",
              animationDelay: "-8s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 13%, white 3%) 0%, color-mix(in srgb, ${skinAccent} 5%, transparent) 50%, transparent 74%)`,
              opacity: 0.3,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute inset-0"
            style={{
              animationDuration: "12s",
              backgroundImage: `radial-gradient(circle at 14% 30%, color-mix(in srgb, ${skinAccent} 22%, white 5%) 0 1px, transparent 1.25px), radial-gradient(circle at 32% 72%, color-mix(in srgb, ${skinAccent} 14%, transparent) 0 1px, transparent 1.25px), radial-gradient(circle at 64% 24%, color-mix(in srgb, ${skinAccent} 18%, transparent) 0 1px, transparent 1.2px), radial-gradient(circle at 86% 68%, color-mix(in srgb, ${skinAccent} 15%, transparent) 0 1px, transparent 1.2px)`,
              opacity: 0.22,
            }}
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-[1] h-32 w-[68%] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: `color-mix(in srgb, ${skinAccent} 10%, transparent)`,
          }}
        />
''',
    "ambient background block",
)

replace_once(
'          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/92 p-4 sm:p-5">\n',
'''          <section
            className="relative overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] p-4 sm:p-5"
            style={{
              borderColor: `color-mix(in srgb, ${skinAccent} 52%, transparent)`,
              boxShadow: `0 16px 34px rgba(0,0,0,0.32), 0 0 22px color-mix(in srgb, ${skinAccent} 10%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 12%, transparent)`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[-48px] h-24 w-[70%] -translate-x-1/2 rounded-full blur-3xl"
              style={{
                background: `color-mix(in srgb, ${skinAccent} 9%, transparent)`,
              }}
            />
''',
    "left card",
)

replace_once(
'          <section className="relative flex min-h-[150px] items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 text-center">\n',
'''          <section
            className="relative flex min-h-[150px] items-center justify-center overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] p-4 text-center"
            style={{
              borderColor: `color-mix(in srgb, ${skinAccent} 58%, transparent)`,
              boxShadow: result
                ? `0 16px 34px rgba(0,0,0,0.34), 0 0 28px color-mix(in srgb, ${skinAccent} 16%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 14%, transparent)`
                : `0 16px 34px rgba(0,0,0,0.30), 0 0 20px color-mix(in srgb, ${skinAccent} 9%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 10%, transparent)`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[-42px] h-24 w-[80%] -translate-x-1/2 rounded-full blur-3xl"
              style={{
                background: `color-mix(in srgb, ${skinAccent} ${result ? 15 : 8}%, transparent)`,
              }}
            />
''',
    "result card",
)

path.write_text(text, encoding="utf-8")

print("Gathering visual patch applied successfully.")
print("Updated only: app/(portal)/game/components/GatheringPanel.tsx")
print("No Gathering logic or database behaviour changed.")
