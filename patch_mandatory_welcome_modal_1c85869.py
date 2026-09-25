from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "1c85869"


def fail(message: str):
    print(f"PATCH FAILED: {message}")
    sys.exit(1)


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail(result.stderr.strip() or "Git command failed.")
    return result.stdout.strip()


head = git("rev-parse", "--short=7", "HEAD")
if head != EXPECTED_HEAD:
    fail(
        f"Expected baseline {EXPECTED_HEAD}, but current HEAD is {head}. "
        "Checkout/pull the requested baseline before running this patch."
    )

root = Path.cwd()
layout_path = root / "app/(portal)/layout.tsx"
component_path = root / "components/onboarding/mandatory-welcome-modal.tsx"
api_path = root / "app/api/onboarding/welcome/route.ts"

if not layout_path.exists():
    fail(f"Missing expected file: {layout_path}")

layout = layout_path.read_text(encoding="utf-8")

import_anchor = 'import { PortalFirstVisitTour } from "@/components/tutorial/portal-first-visit-tour";\n'
import_line = 'import { MandatoryWelcomeModal } from "@/components/onboarding/mandatory-welcome-modal";\n'

render_anchor = '''        <PortalMessageSoundListener
          characterId={
            context.character?.id ??
            null
          }
          currentRoomId={
            context.character
              ?.current_room_id ??
            null
          }
        />

'''

render_block = '''        <PortalMessageSoundListener
          characterId={
            context.character?.id ??
            null
          }
          currentRoomId={
            context.character
              ?.current_room_id ??
            null
          }
        />

        <MandatoryWelcomeModal />

'''

if import_line not in layout:
    if import_anchor not in layout:
        fail("Could not find layout import anchor.")
    layout = layout.replace(import_anchor, import_anchor + import_line, 1)

if "<MandatoryWelcomeModal />" not in layout:
    if render_anchor not in layout:
        fail("Could not find layout render anchor.")
    layout = layout.replace(render_anchor, render_block, 1)

component = r'''"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

type WelcomeStatus = {
  ok: boolean;
  acknowledged?: boolean;
  error?: string;
};

export function MandatoryWelcomeModal() {
  const router = useRouter();
  const pathname = usePathname();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch("/api/onboarding/welcome", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = (await response.json()) as WelcomeStatus;

        if (!cancelled && result.ok && result.acknowledged === false) {
          setVisible(true);
        }
      } catch {
        // Do not hard-block the portal if this check temporarily fails.
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    function preventEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("keydown", preventEscape, true);
    return () => window.removeEventListener("keydown", preventEscape, true);
  }, [visible]);

  const checkBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element || reachedBottom) return;

    const remaining =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    if (remaining <= 4) {
      setReachedBottom(true);
    }
  }, [reachedBottom]);

  async function acknowledge() {
    if (!confirmed || !reachedBottom || saving) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      });

      const result = (await response.json().catch(() => null)) as WelcomeStatus | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error ?? "Unable to save your acknowledgement.");
      }

      setVisible(false);

      if (pathname !== "/character/create") {
        router.push("/character/create");
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save your acknowledgement.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      data-onboarding-welcome-modal="true"
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
      aria-describedby="onboarding-welcome-intro"
    >
      <div className="flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-8d6d3e))]/75 bg-[rgb(var(--sep-colour-100c09))] shadow-[0_28px_90px_rgba(0,0,0,0.78)]">
        <header className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/55 px-5 py-5 text-center sm:px-8">
          <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8f7b61))]">
            The Living World Awaits
          </p>

          <h1
            id="onboarding-welcome-title"
            className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e7c98f))] sm:text-3xl"
          >
            Welcome to Sepulchria
          </h1>

          <p
            id="onboarding-welcome-intro"
            className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a58f70))]"
          >
            Please read this welcome before continuing.
          </p>
        </header>

        <div
          ref={scrollRef}
          onScroll={checkBottom}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8"
          style={{ maxHeight: "min(48dvh, 390px)" }}
        >
          <div className="space-y-5 text-[13px] leading-7 text-[rgb(var(--sep-colour-cbbba3))] sm:text-sm">
            <p>Welcome to Sepulchria — the Living World.</p>
            <p>Your account has now been created, and you are ready to begin.</p>
            <p>Before you can enter the world fully, you will need to create the Character through whom you will experience Sepulchria.</p>
            <p>Your Character is more than a name and portrait. They are your identity within the setting: their Ancestry, appearance, personality, history, ambitions, relationships and choices will shape how they exist within the City and how others come to know them.</p>
            <p>Take your time when creating them.</p>
            <p>Some choices may affect what your Character can do, how they are perceived, which opportunities become available to them, and how their story develops over time.</p>
            <p>Sepulchria is a persistent roleplaying world. Your actions, relationships and decisions can have lasting consequences, and the world may remember what your Character has done.</p>
            <p>Before creating your Character, we strongly recommend familiarising yourself with the core setting and rules available throughout the portal. You do not need to memorise everything before you begin, but understanding the basics will make Character Creation much easier.</p>
            <p>Once your Character has been created, they may need to be reviewed and approved by Staff before they can fully enter play.</p>
            <p>When you are ready, proceed to Character Creation and begin your story.</p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c28e))]">
              Welcome to Sepulchria. Your journey begins here.
            </p>
            <div aria-hidden="true" className="h-px w-full bg-[rgb(var(--sep-colour-60482e))]/55" />
            <p className="pb-1 text-center text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f7b61))]">
              You have reached the end of the welcome.
            </p>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-5 py-4 sm:px-8">
          {!reachedBottom ? (
            <p className="text-center text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a58f70))]">
              Scroll to the bottom to continue.
            </p>
          ) : (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-17110d))] px-4 py-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-b28149))]"
                />
                <span className="text-[11px] leading-5 text-[rgb(var(--sep-colour-cbbba3))]">
                  I confirm that I have read and understood the information above.
                </span>
              </label>

              {error ? (
                <p className="text-center text-[10px] text-red-300" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                disabled={!confirmed || saving}
                onClick={() => void acknowledge()}
                className="w-full border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-2a1d13))] px-4 py-3 font-serif text-sm tracking-[0.06em] text-[rgb(var(--sep-colour-e7c98f))] transition hover:bg-[rgb(var(--sep-colour-362519))] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving..." : "Continue to Character Creation"}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
'''

api = r'''import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function authenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function GET() {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_onboarding_acknowledgements")
    .select("welcome_acknowledged_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      acknowledged: Boolean(data?.welcome_acknowledged_at),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || body.action !== "acknowledge") {
    return NextResponse.json(
      { ok: false, error: "Invalid action." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_onboarding_acknowledgements")
    .upsert(
      {
        user_id: user.id,
        welcome_acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, acknowledged: true });
}
'''

for path in (component_path, api_path):
    path.parent.mkdir(parents=True, exist_ok=True)

component_path.write_text(component, encoding="utf-8")
api_path.write_text(api, encoding="utf-8")
layout_path.write_text(layout, encoding="utf-8")

updated = layout_path.read_text(encoding="utf-8")
if updated.count('import { MandatoryWelcomeModal }') != 1:
    fail("Layout import verification failed.")
if updated.count("<MandatoryWelcomeModal />") != 1:
    fail("Layout render verification failed.")

print("PATCH APPLIED SUCCESSFULLY")
print("Changed: app/(portal)/layout.tsx")
print("Created: components/onboarding/mandatory-welcome-modal.tsx")
print("Created: app/api/onboarding/welcome/route.ts")
print("IMPORTANT: run the companion Supabase SQL before testing.")
