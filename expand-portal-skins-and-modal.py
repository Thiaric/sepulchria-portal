
from pathlib import Path
import colorsys
import re

ROOT = Path.cwd()

globals_path = ROOT / "app/globals.css"
switcher_path = ROOT / "components/portal/portal-skin-switcher.tsx"
modal_path = ROOT / "components/portal/portal-appearance-modal.tsx"

for required in (globals_path, switcher_path):
    if not required.exists():
        raise SystemExit(f"Missing expected file: {required.relative_to(ROOT)}")

css = globals_path.read_text(encoding="utf-8")

# Remove Moonlit's rounded-corner experiment.
css = css.replace(
    "--portal-skin-radius: 6px;",
    "--portal-skin-radius: 0px;",
)

css = re.sub(
    r'\.portal-skin-scope\[data-portal-skin="moonlit"\]\s*:where\(button,\s*input,\s*select,\s*textarea,\s*article\)\s*\{\s*border-radius:\s*var\(--portal-skin-radius\);\s*\}',
    "",
    css,
)

css = re.sub(
    r'\.portal-skin-scope\[data-portal-skin="moonlit"\]\s*\[data-portal-skin-surface\]\s*\{\s*border-radius:\s*var\(--portal-skin-radius\);\s*\}',
    "",
    css,
)

hex_token_pattern = re.compile(
    r"--sep-colour-([0-9a-fA-F]{6}):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3});"
)
rgb_token_pattern = re.compile(
    r"--sep-rgb-(\d{1,3})-(\d{1,3})-(\d{1,3}):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3});"
)

base_hex = {}
for match in hex_token_pattern.finditer(css):
    key = match.group(1).lower()
    base_hex[key] = tuple(
        int(key[i:i+2], 16)
        for i in (0, 2, 4)
    )

base_rgb = {}
for match in rgb_token_pattern.finditer(css):
    key = (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3)),
    )
    base_rgb[key] = key

if not base_hex:
    raise SystemExit(
        "Could not find the generated --sep-colour-* tokens in app/globals.css."
    )

THEMES = {
    "blood-court": {
        "hue": 352, "sat": 0.54, "neutral_hue": 350, "neutral_sat": 0.13, "light": 0.98,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": 'Georgia, "Times New Roman", serif',
        "icon_filter": "grayscale(1) sepia(0.55) saturate(4.2) hue-rotate(305deg) brightness(0.95) contrast(1.05)",
        "map": ((149,43,58),(191,58,74),(182,78,91),(248,210,211)),
    },
    "ivory-archive": {
        "hue": 38, "sat": 0.22, "neutral_hue": 42, "neutral_sat": 0.10, "light": 1.16,
        "font_body": 'Georgia, "Times New Roman", serif',
        "font_display": '"Palatino Linotype", Palatino, Georgia, serif',
        "icon_filter": "grayscale(1) sepia(0.42) saturate(1.4) hue-rotate(350deg) brightness(1.28) contrast(0.88)",
        "map": ((151,127,91),(190,160,111),(181,151,103),(244,226,190)),
    },
    "verdant-reliquary": {
        "hue": 118, "sat": 0.36, "neutral_hue": 124, "neutral_sat": 0.12, "light": 0.95,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": '"Palatino Linotype", Palatino, Georgia, serif',
        "icon_filter": "grayscale(1) sepia(0.5) saturate(2.8) hue-rotate(72deg) brightness(1.05) contrast(0.95)",
        "map": ((69,121,77),(88,153,98),(105,157,111),(202,231,203)),
    },
    "amethyst-veil": {
        "hue": 278, "sat": 0.45, "neutral_hue": 275, "neutral_sat": 0.14, "light": 0.97,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": 'Georgia, "Times New Roman", serif',
        "icon_filter": "grayscale(1) sepia(0.25) saturate(3.3) hue-rotate(218deg) brightness(1.1) contrast(0.95)",
        "map": ((111,75,150),(139,94,185),(151,113,191),(225,207,247)),
    },
    "emberforge": {
        "hue": 24, "sat": 0.62, "neutral_hue": 20, "neutral_sat": 0.14, "light": 0.92,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": 'Georgia, "Times New Roman", serif',
        "icon_filter": "sepia(0.9) saturate(3.1) hue-rotate(342deg) brightness(1.04) contrast(1.02)",
        "map": ((166,83,39),(207,103,45),(204,121,67),(255,218,181)),
    },
    "deepwater": {
        "hue": 187, "sat": 0.42, "neutral_hue": 191, "neutral_sat": 0.14, "light": 0.94,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": '"Palatino Linotype", Palatino, Georgia, serif',
        "icon_filter": "grayscale(1) sepia(0.3) saturate(2.9) hue-rotate(126deg) brightness(1.05) contrast(0.94)",
        "map": ((50,119,126),(66,151,159),(92,165,172),(198,235,237)),
    },
    "ashen": {
        "hue": 220, "sat": 0.06, "neutral_hue": 220, "neutral_sat": 0.04, "light": 1.00,
        "font_body": 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        "font_display": 'Georgia, "Times New Roman", serif',
        "icon_filter": "grayscale(1) brightness(1.18) contrast(0.92)",
        "map": ((108,113,121),(143,149,160),(160,165,174),(231,234,239)),
    },
    "rose-nocturne": {
        "hue": 330, "sat": 0.39, "neutral_hue": 326, "neutral_sat": 0.13, "light": 0.98,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": 'Georgia, "Times New Roman", serif',
        "icon_filter": "grayscale(1) sepia(0.28) saturate(2.8) hue-rotate(275deg) brightness(1.16) contrast(0.9)",
        "map": ((143,76,111),(177,97,137),(191,120,154),(245,213,229)),
    },
    "starfall": {
        "hue": 228, "sat": 0.52, "neutral_hue": 226, "neutral_sat": 0.15, "light": 0.96,
        "font_body": '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
        "font_display": '"Palatino Linotype", Palatino, Georgia, serif',
        "icon_filter": "grayscale(1) sepia(0.2) saturate(3.3) hue-rotate(184deg) brightness(1.2) contrast(0.93)",
        "map": ((69,88,163),(89,112,204),(117,137,218),(214,222,255)),
    },
}

def transform(rgb, theme):
    r, g, b = rgb
    h, l, s = colorsys.rgb_to_hls(
        r / 255,
        g / 255,
        b / 255,
    )
    hue_deg = h * 360

    semantic = (
        s > 0.42
        and (
            80 <= hue_deg <= 170
            or 340 <= hue_deg <= 360
            or 0 <= hue_deg <= 8
        )
    )
    if semantic:
        return rgb

    if s < 0.13:
        new_h = theme["neutral_hue"] / 360
        new_s = theme["neutral_sat"]
    else:
        new_h = theme["hue"] / 360
        new_s = min(
            0.72,
            max(0.08, theme["sat"] * (0.62 + s * 0.62)),
        )

    new_l = max(
        0.018,
        min(0.94, l * theme["light"]),
    )

    nr, ng, nb = colorsys.hls_to_rgb(
        new_h,
        new_l,
        new_s,
    )
    return (
        round(nr * 255),
        round(ng * 255),
        round(nb * 255),
    )

marker = "SEPULCHRIA PORTAL - NINE PREMIUM SKINS V6"

if marker in css:
    css = css.split(
        f"/* =========================================================\n   {marker}",
        1,
    )[0].rstrip() + "\n"

blocks = [
    "",
    "/* =========================================================",
    f"   {marker}",
    "   Generated from the live Sepulchria token set.",
    "   ========================================================= */",
]

for slug, theme in THEMES.items():
    blocks.append(f'\n[data-portal-skin="{slug}"] {{')

    for key, rgb in sorted(base_hex.items()):
        nr, ng, nb = transform(rgb, theme)
        blocks.append(
            f"  --sep-colour-{key}: {nr} {ng} {nb};"
        )

    for key in sorted(base_rgb):
        nr, ng, nb = transform(key, theme)
        blocks.append(
            f"  --sep-rgb-{key[0]}-{key[1]}-{key[2]}: {nr} {ng} {nb};"
        )

    blocks.extend([
        f'  --portal-font-body: {theme["font_body"]};',
        f'  --portal-font-display: {theme["font_display"]};',
        "  --portal-skin-radius: 0px;",
        f'  --portal-navigation-icon-filter: {theme["icon_filter"]};',
    ])

    fill, active_fill, stroke, active_stroke = theme["map"]
    blocks.extend([
        f"  --portal-map-hotspot-fill: rgba({fill[0]}, {fill[1]}, {fill[2]}, 0.055);",
        f"  --portal-map-hotspot-fill-active: rgba({active_fill[0]}, {active_fill[1]}, {active_fill[2]}, 0.22);",
        f"  --portal-map-hotspot-stroke: rgba({stroke[0]}, {stroke[1]}, {stroke[2]}, 0.96);",
        f"  --portal-map-hotspot-stroke-active: rgba({active_stroke[0]}, {active_stroke[1]}, {active_stroke[2]}, 1);",
        f"  --portal-map-hotspot-glow: drop-shadow(0 0 2px rgba({stroke[0]}, {stroke[1]}, {stroke[2]}, 0.68));",
        f"  --portal-map-hotspot-glow-active: drop-shadow(0 0 5px rgba({active_stroke[0]}, {active_stroke[1]}, {active_stroke[2]}, 0.92)) drop-shadow(0 0 11px rgba({active_fill[0]}, {active_fill[1]}, {active_fill[2]}, 0.72));",
        f"  --portal-map-hotspot-missing-fill: rgba({fill[0]}, {fill[1]}, {fill[2]}, 0.025);",
        f"  --portal-map-hotspot-missing-stroke: rgba({stroke[0]}, {stroke[1]}, {stroke[2]}, 0.62);",
        f"  --portal-map-hotspot-missing-glow: drop-shadow(0 0 2px rgba({stroke[0]}, {stroke[1]}, {stroke[2]}, 0.42));",
        "}",
    ])

blocks.extend([
    "",
    '[data-portal-skin="moonlit"] :where(button, input, select, textarea, article, section, aside, nav, dialog, [role="dialog"]) {',
    "  border-radius: 0 !important;",
    "}",
])

for slug in THEMES:
    blocks.extend([
        f'[data-portal-skin="{slug}"] :where(button, input, select, textarea, article, section, aside, nav, dialog, [role="dialog"]) {{',
        "  border-radius: 0 !important;",
        "}",
    ])

css = css.rstrip() + "\n" + "\n".join(blocks) + "\n"
globals_path.write_text(css, encoding="utf-8")
print("Updated app/globals.css")

modal_code = '''"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  createPortal,
} from "react-dom";

import {
  PortalSkinGallery,
  type AppearanceSkin,
} from "@/components/portal/portal-skin-gallery";
import {
  usePortalSkin,
} from "@/components/portal/portal-skin-provider";
import {
  createClient,
} from "@/lib/supabase/client";

export function PortalAppearanceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { endPreview } =
    usePortalSkin();

  const [mounted, setMounted] =
    useState(false);
  const [skins, setSkins] =
    useState<AppearanceSkin[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        endPreview();
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previous;
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [
    open,
    onClose,
    endPreview,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setError(
            "You must be signed in.",
          );
          setLoading(false);
        }
        return;
      }

      const [
        skinsResult,
        entitlementsResult,
      ] = await Promise.all([
        supabase
          .from("portal_skins")
          .select(`
            id,
            slug,
            name,
            description,
            preview_image_url,
            price_pence,
            is_default,
            sort_order
          `)
          .eq("is_active", true)
          .order(
            "sort_order",
            { ascending: true },
          )
          .order(
            "name",
            { ascending: true },
          ),

        supabase
          .from(
            "user_portal_skin_entitlements",
          )
          .select(
            "skin_id, enabled, source",
          )
          .eq(
            "user_id",
            user.id,
          )
          .eq("enabled", true),
      ]);

      if (cancelled) {
        return;
      }

      const firstError =
        skinsResult.error ??
        entitlementsResult.error;

      if (firstError) {
        setError(
          firstError.message,
        );
        setLoading(false);
        return;
      }

      const entitlements =
        new Map(
          (
            entitlementsResult.data ??
            []
          ).map((entry) => [
            String(entry.skin_id),
            entry.source as
              | "paid"
              | "staff",
          ]),
        );

      setSkins(
        (skinsResult.data ?? []).map(
          (entry) => ({
            id:
              String(entry.id),
            slug:
              String(entry.slug),
            name:
              String(entry.name),
            description:
              entry.description ??
              "",
            previewImageUrl:
              entry.preview_image_url ??
              null,
            pricePence:
              entry.price_pence ??
              null,
            isDefault:
              entry.is_default ===
              true,
            owned:
              entry.is_default ===
                true ||
              entitlements.has(
                String(entry.id),
              ),
            source:
              entitlements.get(
                String(entry.id),
              ) ?? null,
          }),
        ),
      );

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  function close() {
    endPreview();
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-appearance-title"
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/65 bg-[rgb(var(--sep-colour-0d0a08))] shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
              Account
            </p>

            <h2
              id="portal-appearance-title"
              className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-ead5ac))]"
            >
              Portal Appearance
            </h2>

            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-928674))]">
              Preview your available skins or select an unlocked appearance.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close Appearance"
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-987344))]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <p className="py-12 text-center text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8271))]">
              Loading appearances...
            </p>
          ) : error ? (
            <div className="border border-red-900/55 bg-red-950/20 p-4 text-sm text-red-300">
              Unable to load Portal Appearance: {error}
            </div>
          ) : (
            <PortalSkinGallery
              skins={skins}
            />
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
'''

modal_path.parent.mkdir(parents=True, exist_ok=True)
modal_path.write_text(
    modal_code,
    encoding="utf-8",
)
print("Created components/portal/portal-appearance-modal.tsx")

switcher_code = '''"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  PortalAppearanceModal,
} from "@/components/portal/portal-appearance-modal";
import {
  usePortalSkin,
} from "@/components/portal/portal-skin-provider";

export function PortalSkinSwitcher() {
  const { selectedSkin } =
    usePortalSkin();

  const [open, setOpen] =
    useState(false);

  const close =
    useCallback(() => {
      setOpen(false);
    }, []);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        aria-label="Portal appearance"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Portal appearance - ${selectedSkin}`}
        className="hidden h-8 items-center gap-1.5 border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] px-2 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-d8bf91))] transition hover:border-[rgb(var(--sep-colour-987344))] sm:flex sm:h-9 2xl:h-10"
      >
        <span
          aria-hidden="true"
          className="text-[12px]"
        >
          ◐
        </span>

        <span className="hidden xl:inline">
          Appearance
        </span>
      </button>

      <PortalAppearanceModal
        open={open}
        onClose={close}
      />
    </>
  );
}
'''

switcher_path.write_text(
    switcher_code,
    encoding="utf-8",
)
print("Updated components/portal/portal-skin-switcher.tsx")

print()
print("Portal appearance expansion complete.")
print("Run the SQL migration, then npm run build.")
