from pathlib import Path
import subprocess
import shutil

ROOT = Path.cwd()

def git(*args):
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        text=True,
    ).strip()

head = git("rev-parse", "HEAD")
if not head.startswith("4f4b74d"):
    raise SystemExit(
        f"STOP: expected commit 4f4b74d, but HEAD is {head[:12]}.\n"
        "No files were changed."
    )

layout = ROOT / "app" / "(portal)" / "layout.tsx"
proxy = ROOT / "proxy.ts"

if not layout.exists() or not proxy.exists():
    raise SystemExit(
        "Could not find layout.tsx and proxy.ts. "
        "Run this script from the sepulchria-portal repo root."
    )

layout_text = layout.read_text(encoding="utf-8")
proxy_text = proxy.read_text(encoding="utf-8")

react_import = 'import { Suspense, type ReactNode, type CSSProperties } from "react";\n'
headers_import = 'import { headers } from "next/headers";\n'

if headers_import not in layout_text:
    if react_import not in layout_text:
        raise SystemExit("Could not find the React import in layout.tsx.")
    layout_text = layout_text.replace(
        react_import,
        react_import + headers_import,
        1,
    )

old_start = """async function PortalLayoutContent({
  children,
}: PortalLayoutProps) {
  const [
    context,
    worldState,
    initialTidings,
    unreadForumCount,
    staffSession,
  ] = await Promise.all([
    getPortalContext(),
    getWorldState(),
    getActiveTidings(),
    getUnreadForumCount(),
    getStaffSession(),
  ]);
"""

new_start = """async function PortalLayoutContent({
  children,
}: PortalLayoutProps) {
  const requestHeaders =
    await headers();

  if (
    requestHeaders.get(
      "x-sepulchria-embedded",
    ) === "1"
  ) {
    const [
      context,
      worldState,
      staffSession,
    ] = await Promise.all([
      getPortalContext(),
      getWorldState(),
      getStaffSession(),
    ]);

    return (
      <EmbeddedPortalLayout
        context={context}
        worldState={worldState}
        staffRole={
          staffSession?.role ?? null
        }
      >
        {children}
      </EmbeddedPortalLayout>
    );
  }

  const [
    context,
    worldState,
    initialTidings,
    unreadForumCount,
    staffSession,
  ] = await Promise.all([
    getPortalContext(),
    getWorldState(),
    getActiveTidings(),
    getUnreadForumCount(),
    getStaffSession(),
  ]);
"""

if old_start not in layout_text:
    raise SystemExit(
        "Could not find the exact PortalLayoutContent block from commit 4f4b74d.\n"
        "No changes were written."
    )

layout_text = layout_text.replace(old_start, new_start, 1)

marker = "\nfunction PortalLoadingShell() {"

embedded_component = """
function EmbeddedPortalLayout({
  children,
  context,
  worldState,
  staffRole,
}: PortalLayoutProps & {
  context: Awaited<
    ReturnType<
      typeof getPortalContext
    >
  >;
  worldState: Awaited<
    ReturnType<
      typeof getWorldState
    >
  >;
  staffRole:
    | "owner"
    | "admin"
    | "moderator"
    | "master"
    | null;
}) {
  return (
    <WorldStateProvider
      initialState={worldState}
    >
      <PortalSkinProvider>
        <PortalAudioProvider>
          <PortalNotificationCountsProvider
            staffRole={staffRole}
          >
            <div
              data-portal-shell
              data-portal-modal-shell="true"
              className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]"
            >
              <div
                data-portal-shell-inner
                className="grid h-full min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_clamp(240px,18vw,300px)]"
              >
                <main
                  data-portal-centre-host
                  data-portal-column
                  data-portal-scroll
                  className="min-h-0 min-w-0 overflow-y-auto overscroll-contain"
                >
                  {children}
                </main>

                <div
                  className="portal-right-shell relative min-h-0 min-w-0"
                >
                  <PortalResponsiveRightSidebar
                    context={context}
                  />
                </div>
              </div>
            </div>
          </PortalNotificationCountsProvider>
        </PortalAudioProvider>
      </PortalSkinProvider>
    </WorldStateProvider>
  );
}

"""

if "function EmbeddedPortalLayout(" in layout_text:
    raise SystemExit(
        "EmbeddedPortalLayout already exists. "
        "Reset to 4f4b74d before running this patch."
    )

if marker not in layout_text:
    raise SystemExit(
        "Could not find PortalLoadingShell() insertion point."
    )

layout_text = layout_text.replace(
    marker,
    "\n" + embedded_component + "function PortalLoadingShell() {",
    1,
)

expected_proxy = """import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/pwa|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)",
  ],
};
"""

new_proxy = """import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(
  request: NextRequest,
) {
  if (
    request.nextUrl.searchParams.get(
      "embedded",
    ) === "1"
  ) {
    request.headers.set(
      "x-sepulchria-embedded",
      "1",
    );
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/pwa|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)",
  ],
};
"""

if proxy_text != expected_proxy:
    raise SystemExit(
        "proxy.ts does not exactly match commit 4f4b74d.\n"
        "No changes were written."
    )

# Only now make backups and write changes.
shutil.copy2(
    layout,
    layout.with_suffix(".tsx.before_fast_modals.bak"),
)
shutil.copy2(
    proxy,
    proxy.with_suffix(".ts.before_fast_modals.bak"),
)

layout.write_text(layout_text, encoding="utf-8")
proxy.write_text(new_proxy, encoding="utf-8")

print("DONE")
print()
print("Patched exact commit: 4f4b74d")
print()
print("Embedded iframe modals KEEP:")
print("  - requested modal page")
print("  - RIGHT contextual sidebar")
print("  - WorldStateProvider")
print("  - PortalSkinProvider")
print("  - PortalAudioProvider")
print("  - PortalNotificationCountsProvider")
print()
print("They SKIP:")
print("  - header")
print("  - LEFT sidebar")
print("  - tidings ticker")
print("  - mobile main navigation")
print("  - presence heartbeat")
print("  - invitation popups")
print("  - cosmetics runtime")
print("  - portal message listener")
print("  - tidings/unread-forum/cosmetics queries")
print()
print("Next:")
print("  npm run build")
