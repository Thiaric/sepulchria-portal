from pathlib import Path
import subprocess

BASE = '51f9e5c16aaca72559417a6e16eae7bc2ed71539'
root = Path.cwd()
path = root / 'components/portal/portal-sidebar.tsx'

def fail(message):
    print(f"ERROR: {message}")
    raise SystemExit(1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=root,
    text=True,
).strip()

if head != BASE:
    fail(
        f"This patch was built on pushed master {BASE}, "
        f"but local HEAD is {head}. No files were changed."
    )

if not path.exists():
    fail(f"Missing required file: {path.relative_to(root)}. No files were changed.")

text = path.read_text(encoding="utf-8")

replacements = [
    ('  const [\n    oddJobsRoomId,\n    setOddJobsRoomId,\n  ] = useState<string | null>(null);', '  const [\n    oddJobsRoomId,\n    setOddJobsRoomId,\n  ] = useState<string | null>(null);\n\n  const [\n    breezeLodgingsRoomId,\n    setBreezeLodgingsRoomId,\n  ] = useState<string | null>(null);'),
    ('  useEffect(() => {\n    if (!modalItem) {', '  useEffect(() => {\n    let cancelled = false;\n\n    async function loadBreezeLodgingsRoom() {\n      const supabase =\n        createClient();\n\n      const {\n        data: room,\n        error,\n      } = await supabase\n        .from("rooms")\n        .select("id")\n        .eq(\n          "slug",\n          "the-breeze-lodgings",\n        )\n        .eq("is_active", true)\n        .maybeSingle();\n\n      if (cancelled) {\n        return;\n      }\n\n      if (error) {\n        console.error(\n          "Unable to load The Breeze Lodgings:",\n          error,\n        );\n        setBreezeLodgingsRoomId(null);\n        return;\n      }\n\n      setBreezeLodgingsRoomId(\n        room?.id ?? null,\n      );\n    }\n\n    void loadBreezeLodgingsRoom();\n\n    return () => {\n      cancelled = true;\n    };\n  }, []);\n\n  useEffect(() => {\n    if (!modalItem) {'),
    ('  const mobileNavigationItems = [', '  function renderMobileBreezeLodgingsItem() {\n    const className = `\n      relative\n      flex\n      h-10\n      min-w-0\n      items-center\n      justify-center\n      border\n      text-[17px]\n      leading-none\n      transition\n      ${\n        breezeLodgingsRoomId\n          ? "border-transparent text-[rgb(var(--sep-colour-b68b4f))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-efd9aa))]"\n          : "cursor-not-allowed border-transparent text-[rgb(var(--sep-colour-51483d))] opacity-45"\n      }\n    `;\n\n    return (\n      <form\n        action={enterRoomFromMap}\n        className="min-w-0"\n      >\n        <input\n          type="hidden"\n          name="roomId"\n          value={\n            breezeLodgingsRoomId ?? ""\n          }\n        />\n\n        <button\n          type="submit"\n          disabled={!breezeLodgingsRoomId}\n          title={\n            breezeLodgingsRoomId\n              ? "The Breeze Lodgings"\n              : "The Breeze Lodgings are currently unavailable."\n          }\n          aria-label="The Breeze Lodgings"\n          className={`${className} w-full`}\n        >\n          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">\n            <img\n              src="/icons/lodging.png"\n              alt=""\n              aria-hidden="true"\n              className="h-full w-full object-contain"\n            />\n          </span>\n        </button>\n      </form>\n    );\n  }\n\n  const mobileNavigationItems = ['),
    ('    {renderMobileOddJobsItem()}\n\n    {/* RULES */}', '    {renderMobileOddJobsItem()}\n    {renderMobileBreezeLodgingsItem()}\n\n    {/* RULES */}'),
    ('                </form>\n\n                <ForumSidebarMenu', '                </form>\n\n                <form\n                  action={enterRoomFromMap}\n                >\n                  <input\n                    type="hidden"\n                    name="roomId"\n                    value={\n                      breezeLodgingsRoomId ?? ""\n                    }\n                  />\n\n                  <button\n                    type="submit"\n                    disabled={!breezeLodgingsRoomId}\n                    title={\n                      breezeLodgingsRoomId\n                        ? "Go directly to The Breeze Lodgings."\n                        : "The Breeze Lodgings are currently unavailable."\n                    }\n                    className="\n                      flex\n                      min-h-[var(--portal-nav-min-h)]\n                      w-full\n                      items-center\n                      gap-2\n                      border\n                      border-transparent\n                      px-2.5\n                      py-[var(--portal-nav-y)]\n                      text-left\n                      text-[11px]\n                      text-[rgb(var(--sep-colour-b6a894))]\n                      transition\n                      hover:border-[rgb(var(--sep-colour-5d4930))]\n                      hover:bg-[rgb(var(--sep-colour-1d1712))]\n                      hover:text-[rgb(var(--sep-colour-e8d8ba))]\n                      disabled:cursor-not-allowed\n                      disabled:opacity-45\n                      lg:text-xs\n                    "\n                  >\n                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">\n                      <img\n                        src="/icons/lodging.png"\n                        alt=""\n                        aria-hidden="true"\n                        className="h-full w-full object-contain"\n                      />\n                    </span>\n\n                    <span className="truncate">\n                      The Breeze Lodgings\n                    </span>\n                  </button>\n                </form>\n\n                <ForumSidebarMenu'),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        fail(
            f"Expected exactly one anchor, found {count}. "
            "No files were changed."
        )

for old, new in replacements:
    text = text.replace(old, new, 1)

for needle in [
    "breezeLodgingsRoomId",
    'src="/icons/lodging.png"',
    "The Breeze Lodgings",
]:
    if needle not in text:
        fail("Internal validation failed. No files were changed.")

path.write_text(text, encoding="utf-8")

print("Breeze Lodgings sidebar shortcut added successfully.")
print("Changed file:")
print(" - components/portal/portal-sidebar.tsx")
print()
print("Desktop: directly under The Odd Jobs Bureau.")
print("Mobile: directly after The Odd Jobs Bureau shortcut.")
print("No SQL is required.")
print("Next: npm run build")
