from pathlib import Path

ROOT = Path.cwd()

SIDEBAR = ROOT / "components/portal/portal-sidebar.tsx"
RULES_PAGE = ROOT / "app/rules/page.tsx"
PUBLIC_RULES = ROOT / "components/rules/public-rules.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


for path in (SIDEBAR, RULES_PAGE, PUBLIC_RULES):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

sidebar = SIDEBAR.read_text(encoding="utf-8")
rules_page = RULES_PAGE.read_text(encoding="utf-8")
public_rules = PUBLIC_RULES.read_text(encoding="utf-8")

large_old = '''  const isLargeModal =
    item.href === "/messages" ||
    item.href.startsWith(
      "/messages/",
    ) ||
    item.href === "/characters" ||
    item.href.startsWith(
      "/characters/",
    ) ||
    item.href === "/forum" ||
    item.href.startsWith(
      "/forum/",
    );
'''

large_new = '''  const isLargeModal =
    item.href === "/messages" ||
    item.href.startsWith(
      "/messages/",
    ) ||
    item.href === "/characters" ||
    item.href.startsWith(
      "/characters/",
    ) ||
    item.href === "/forum" ||
    item.href.startsWith(
      "/forum/",
    ) ||
    item.href.startsWith(
      "/rules",
    );
'''

if large_new not in sidebar:
    if sidebar.count(large_old) != 1:
        fail("Could not find exact large-modal route block.")
    sidebar = sidebar.replace(large_old, large_new, 1)

page_original = '''  return (
    <div className="relative">
      <EmbeddedPortalSkinBridge />
'''

page_previous = '''  return (
    <div
      className={
        isEmbedded
          ? "relative h-screen overflow-y-auto overscroll-contain"
          : "relative"
      }
    >
      <EmbeddedPortalSkinBridge />
'''

page_new = '''  return (
    <div
      className={
        isEmbedded
          ? "relative h-full min-h-0 overflow-hidden"
          : "relative"
      }
    >
      <EmbeddedPortalSkinBridge />
'''

if page_new not in rules_page:
    if page_previous in rules_page:
        rules_page = rules_page.replace(page_previous, page_new, 1)
    elif page_original in rules_page:
        rules_page = rules_page.replace(page_original, page_new, 1)
    else:
        fail("Could not find current Rules page root block.")

public_call_old = '''      <PublicRules
        data={data}
        initialView={initialView}
      />
'''

public_call_new = '''      <PublicRules
        data={data}
        initialView={initialView}
        embedded={isEmbedded}
      />
'''

if public_call_new not in rules_page:
    if rules_page.count(public_call_old) != 1:
        fail("Could not find PublicRules call.")
    rules_page = rules_page.replace(public_call_old, public_call_new, 1)

type_old = '''type PublicRulesProps = {
  data: PublicRulesData;
  initialView?: "rules" | "glossary";
};
'''

type_new = '''type PublicRulesProps = {
  data: PublicRulesData;
  initialView?: "rules" | "glossary";
  embedded?: boolean;
};
'''

if type_new not in public_rules:
    if public_rules.count(type_old) != 1:
        fail("Could not find PublicRulesProps block.")
    public_rules = public_rules.replace(type_old, type_new, 1)

props_old = '''export function PublicRules({
  data,
  initialView = "rules",
}: PublicRulesProps) {
'''

props_new = '''export function PublicRules({
  data,
  initialView = "rules",
  embedded = false,
}: PublicRulesProps) {
'''

if props_new not in public_rules:
    if public_rules.count(props_old) != 1:
        fail("Could not find PublicRules props block.")
    public_rules = public_rules.replace(props_old, props_new, 1)

main_old = '''    <main className="min-h-screen bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d7c5a7))]">
'''

main_new = '''    <main
      className={[
        "bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d7c5a7))]",
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "min-h-screen",
      ].join(" ")}
    >
'''

if main_new not in public_rules:
    if public_rules.count(main_old) != 1:
        fail("Could not find PublicRules main element.")
    public_rules = public_rules.replace(main_old, main_new, 1)

header_old = '''      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0f0b09))]">
'''
header_new = '''      <header className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0f0b09))]">
'''

if header_new not in public_rules:
    if public_rules.count(header_old) != 1:
        fail("Could not find Rules top header.")
    public_rules = public_rules.replace(header_old, header_new, 1)

nav_old = '''        <nav className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))]">
'''
nav_new = '''        <nav className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))]">
'''

if nav_new not in public_rules:
    if public_rules.count(nav_old) != 1:
        fail("Could not find Rules category nav.")
    public_rules = public_rules.replace(nav_old, nav_new, 1)

grid_old = '''      <div
        className={`mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 ${
          glossaryOpen
            ? ""
            : "lg:grid-cols-[280px_minmax(0,1fr)]"
        }`}
      >
'''

grid_new = '''      <div
        className={[
          "mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6",
          glossaryOpen
            ? ""
            : "lg:grid-cols-[280px_minmax(0,1fr)]",
          embedded
            ? "min-h-0 flex-1 overflow-hidden"
            : "",
        ].join(" ")}
      >
'''

if grid_new not in public_rules:
    if public_rules.count(grid_old) != 1:
        fail("Could not find Rules main grid block.")
    public_rules = public_rules.replace(grid_old, grid_new, 1)

aside_old = '''          <aside className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))]">
'''
aside_new = '''          <aside
            className={[
              "min-w-0 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))]",
              embedded
                ? "flex min-h-0 flex-col overflow-hidden"
                : "",
            ].join(" ")}
          >
'''

if aside_new not in public_rules:
    if public_rules.count(aside_old) != 1:
        fail("Could not find Rules index aside.")
    public_rules = public_rules.replace(aside_old, aside_new, 1)

index_old = '''            <div className="max-h-[calc(100vh-190px)] overflow-y-auto p-2">
'''
index_new = '''            <div
              className={
                embedded
                  ? "min-h-0 flex-1 overflow-y-auto p-2"
                  : "max-h-[calc(100vh-190px)] overflow-y-auto p-2"
              }
            >
'''

if index_new not in public_rules:
    if public_rules.count(index_old) != 1:
        fail("Could not find Rules index scroll container.")
    public_rules = public_rules.replace(index_old, index_new, 1)

section_old = '''        <section className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))]">
'''
section_new = '''        <section
          className={[
            "min-w-0 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))]",
            embedded
              ? "min-h-0 overflow-y-auto"
              : "",
          ].join(" ")}
        >
'''

if section_new not in public_rules:
    if public_rules.count(section_old) != 1:
        fail("Could not find Rules content section.")
    public_rules = public_rules.replace(section_old, section_new, 1)

for marker in [
    'item.href.startsWith(\n      "/rules",',
]:
    if marker not in sidebar:
        fail(f"Sidebar validation failed: {marker!r}")

for marker in [
    '"relative h-full min-h-0 overflow-hidden"',
    'embedded={isEmbedded}',
]:
    if marker not in rules_page:
        fail(f"Rules page validation failed: {marker!r}")

for marker in [
    'embedded?: boolean;',
    'embedded = false,',
    '"flex h-full min-h-0 flex-col overflow-hidden"',
    '"min-h-0 flex-1 overflow-y-auto p-2"',
    '"min-h-0 overflow-y-auto"',
]:
    if marker not in public_rules:
        fail(f"PublicRules validation failed: {marker!r}")

SIDEBAR.write_text(sidebar, encoding="utf-8", newline="\n")
RULES_PAGE.write_text(rules_page, encoding="utf-8", newline="\n")
PUBLIC_RULES.write_text(public_rules, encoding="utf-8", newline="\n")

print("WROTE  components/portal/portal-sidebar.tsx")
print("WROTE  app/rules/page.tsx")
print("WROTE  components/rules/public-rules.tsx")
print()
print("RULES LARGE MODAL + INTERNAL SCROLL LAYOUT APPLIED")
print("- Rules and Glossary now use the large modal size.")
print("- Embedded Rules fits the modal/iframe height exactly.")
print("- The outer Rules document does not scroll.")
print("- Rule Index scrolls independently.")
print("- Rule/Glossary content panel scrolls independently.")
print("- Standalone /rules keeps normal document layout.")
print("- Other modal mechanics are untouched.")
print()
print("Next: npm run build")
