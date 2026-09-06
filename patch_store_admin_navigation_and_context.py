from pathlib import Path

ROOT = Path.cwd()

def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding="utf-8")
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"{label}: expected block not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"{label}: patched")

access = ROOT / "lib/auth/admin-section-access.ts"
replace_once(
    access,
    '  | "market"\n  | "forum"',
    '  | "market"\n  | "store"\n  | "forum"',
    "AdminSection union",
)
replace_once(
    access,
    '  market: ["owner", "admin"],\n  forum: ["owner", "admin", "moderator"],',
    '  market: ["owner", "admin"],\n  store: ["owner", "admin"],\n  forum: ["owner", "admin", "moderator"],',
    "Store role access",
)

layout = ROOT / "app/(portal)/admin/layout.tsx"
replace_once(
    layout,
    '''            {can("market") ? (
              <AdminNavigationLink href="/admin/market">
                Market
              </AdminNavigationLink>
            ) : null}

            {can("media") ? (''',
    '''            {can("market") ? (
              <AdminNavigationLink href="/admin/market">
                Market
              </AdminNavigationLink>
            ) : null}

            {can("store") ? (
              <AdminNavigationLink href="/admin/store">
                Store
              </AdminNavigationLink>
            ) : null}

            {can("media") ? (''',
    "Administration Store button",
)

context_component = ROOT / "components/admin/store-context-panel.tsx"
context_component.parent.mkdir(parents=True, exist_ok=True)
context_component.write_text('''"use client";

function jumpTo(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

const button =
  "w-full border border-[rgb(var(--sep-skin-c1,169_138_96))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c2,211_194_170))] transition hover:border-[rgb(var(--sep-skin-c1,169_138_96))] hover:text-[rgb(var(--sep-skin-c1,169_138_96))]";

export function StoreContextPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-skin-c2,211_194_170))]">
        Store administration
      </p>
      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
        Sepulchria Store
      </h2>
      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-skin-c2,211_194_170))]">
        Jump between catalogue creation, product configuration and discounts.
      </p>

      <div className="mt-4 space-y-2">
        <button type="button" className={button} onClick={() => jumpTo("store-create-product")}>
          Create Product
        </button>
        <button type="button" className={button} onClick={() => jumpTo("store-products")}>
          Products & Bundles
        </button>
        <button type="button" className={button} onClick={() => jumpTo("store-discounts")}>
          Discount Codes
        </button>
      </div>
    </div>
  );
}
''', encoding="utf-8")
print("Store context panel: wrote")

router = ROOT / "components/portal/admin-context-panel.tsx"

replace_once(
    router,
    'import { CosmeticsContextPanel } from "@/components/admin/cosmetics-context-panel";\nimport { AdminCharacterPremiumFeaturesContext }',
    'import { CosmeticsContextPanel } from "@/components/admin/cosmetics-context-panel";\nimport { StoreContextPanel } from "@/components/admin/store-context-panel";\nimport { AdminCharacterPremiumFeaturesContext }',
    "Store context import",
)

replace_once(
    router,
    '  | "cosmetics"\n  | "media"',
    '  | "cosmetics"\n  | "store"\n  | "media"',
    "Store context mode",
)

replace_once(
    router,
    '''  if (pathname === "/admin/cosmetics") {
    return "cosmetics";
  }

  if (pathname === "/admin/media") {''',
    '''  if (pathname === "/admin/cosmetics") {
    return "cosmetics";
  }

  if (pathname === "/admin/store") {
    return "store";
  }

  if (pathname === "/admin/media") {''',
    "Store pathname mode",
)

replace_once(
    router,
    '''  if (mode === "cosmetics") {
    return (
      <CosmeticsContextPanel />
    );
  }

  if (mode === "media") {''',
    '''  if (mode === "cosmetics") {
    return (
      <CosmeticsContextPanel />
    );
  }

  if (mode === "store") {
    return (
      <StoreContextPanel />
    );
  }

  if (mode === "media") {''',
    "Store right context route",
)

replace_once(
    router,
    '  { section: "market", label: "Market", href: "/admin/market" },\n  { section: "media", label: "Media", href: "/admin/media" },',
    '  { section: "market", label: "Market", href: "/admin/market" },\n  { section: "store", label: "Store", href: "/admin/store", aliases: ["shop", "commerce", "paddle"] },\n  { section: "media", label: "Media", href: "/admin/media" },',
    "Store in admin overview context list",
)

page = ROOT / "app/(portal)/admin/store/page.tsx"
if not page.exists():
    raise SystemExit("app/(portal)/admin/store/page.tsx is missing. Run the Phase 2 Store patch first.")

text = page.read_text(encoding="utf-8")
text = text.replace(
    'import { requireStaffCapability } from "@/lib/auth/require-staff";',
    'import { requireAdminSection } from "@/lib/auth/require-staff";',
)
text = text.replace(
    'await requireStaffCapability("character_economy");',
    'await requireAdminSection("store");',
    1,
)
text = text.replace(
    '<section className="mt-8 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35',
    '<section id="store-create-product" className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35',
    1,
)
text = text.replace(
    '<section className="mt-6">',
    '<section id="store-products" className="mt-6 scroll-mt-6">',
    1,
)
text = text.replace(
    '<section className="mt-8 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35',
    '<section id="store-discounts" className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35',
    1,
)
page.write_text(text, encoding="utf-8")
print("Store page permission + anchors: patched")

actions = ROOT / "app/(portal)/admin/store/actions.ts"
if actions.exists():
    text = actions.read_text(encoding="utf-8")
    text = text.replace(
        'import { requireStaffCapability } from "@/lib/auth/require-staff";',
        'import { requireAdminSection } from "@/lib/auth/require-staff";',
    )
    text = text.replace(
        'await requireStaffCapability("character_economy");',
        'await requireAdminSection("store");',
    )
    actions.write_text(text, encoding="utf-8")
    print("Store actions permission: patched")

print("DONE: Store now has admin button + admin overview context entry + dedicated right-side context panel.")
