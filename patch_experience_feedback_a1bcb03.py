from __future__ import annotations

from pathlib import Path
import re
import textwrap

BASE = "a1bcb03"


def read(path: str | Path) -> str:
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run from repo root. Expected {BASE}.")
    return p.read_text(encoding="utf-8")


def write(path: str | Path, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print("✓", str(p))


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}. Expected {BASE}."
        )
    return text.replace(old, new, 1)


def insert_after_last_import(text: str, addition: str, label: str) -> str:
    matches = list(re.finditer(r"^import[\s\S]*?;\n", text, re.MULTILINE))
    if not matches:
        raise SystemExit(f"{label}: could not find import block. Expected {BASE}.")
    index = matches[-1].end()
    if addition in text:
        return text
    return text[:index] + addition + text[index:]


def find_portal_layout() -> Path:
    preferred = Path("app/(portal)/layout.tsx")
    if preferred.exists():
        return preferred

    for path in sorted(Path("app").glob("**/layout.tsx")):
        text = path.read_text(encoding="utf-8")
        if "{children}" in text:
            return path

    raise SystemExit(f"Could not find portal layout. Expected {BASE}.")


def detect_server_supabase_helper() -> tuple[str, str]:
    candidates = [
        (Path("lib/supabase/server.ts"), "@/lib/supabase/server"),
        (Path("src/lib/supabase/server.ts"), "@/src/lib/supabase/server"),
        (Path("utils/supabase/server.ts"), "@/utils/supabase/server"),
        (Path("src/utils/supabase/server.ts"), "@/src/utils/supabase/server"),
    ]

    for path, import_path in candidates:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for name in ["createServerClient", "createClient"]:
            if re.search(rf"\b{name}\b", text):
                return import_path, name

    raise SystemExit(
        "Could not detect the authenticated Supabase server helper "
        f"(looked for lib/utils supabase server.ts). Expected {BASE}."
    )


def repo_files(*patterns: str) -> list[Path]:
    results: list[Path] = []
    for pattern in patterns:
        results.extend(sorted(Path(".").glob(pattern)))
    return results


def validate_repo_root() -> None:
    if not Path("package.json").exists():
        raise SystemExit(f"Run this from the repo root (missing package.json). Expected {BASE}.")
    if not Path("app").exists():
        raise SystemExit(f"Run this from the repo root (missing app/). Expected {BASE}.")


validate_repo_root()
server_import_path, server_helper_name = detect_server_supabase_helper()
portal_layout = find_portal_layout()

# -----------------------------------------------------------------------------
# New files
# -----------------------------------------------------------------------------

experience_ratings = textwrap.dedent(
    """
    export type ExperienceRating = {
      value: 1 | 2 | 3 | 4 | 5;
      label: string;
      description: string;
      imageSrc: string;
      fallback: string;
    };

    export const EXPERIENCE_FEEDBACK_COOLDOWN_DAYS = 7;

    export const EXPERIENCE_RATINGS: ExperienceRating[] = [
      {
        value: 1,
        label: "Very bad",
        description: "A frustrating or unpleasant experience.",
        imageSrc: "/experience-faces/1-very-bad.svg",
        fallback: "☹",
      },
      {
        value: 2,
        label: "Not great",
        description: "Below expectations, with noticeable issues.",
        imageSrc: "/experience-faces/2-not-great.svg",
        fallback: "🙁",
      },
      {
        value: 3,
        label: "Okay",
        description: "Fine overall, with room to improve.",
        imageSrc: "/experience-faces/3-okay.svg",
        fallback: "😐",
      },
      {
        value: 4,
        label: "Good",
        description: "A pleasant and satisfying session.",
        imageSrc: "/experience-faces/4-good.svg",
        fallback: "🙂",
      },
      {
        value: 5,
        label: "Great",
        description: "A very positive and enjoyable experience.",
        imageSrc: "/experience-faces/5-great.svg",
        fallback: "😄",
      },
    ];
    """
).strip() + "\n"

logout_guard = textwrap.dedent(
    """
    "use client";

    import { useEffect, useRef, useState } from "react";

    import { EXPERIENCE_RATINGS } from "@/lib/experience/experience-ratings";

    type StatusPayload = {
      due: boolean;
    };

    type PromptPayload = {
      due: boolean;
      promptId: string | null;
    };

    type PendingAction =
      | {
          kind: "anchor";
          element: HTMLAnchorElement;
        }
      | {
          kind: "form";
          form: HTMLFormElement;
          submitter?: HTMLElement | null;
        }
      | {
          kind: "button";
          element: HTMLButtonElement | HTMLInputElement;
        };

    const BYPASS_ATTR = "data-experience-logout-bypass";

    function normalise(value: string | null | undefined) {
      return (value ?? "").trim().toLowerCase();
    }

    function elementText(
      element: HTMLElement | HTMLInputElement | HTMLAnchorElement,
    ) {
      if (element instanceof HTMLInputElement) {
        return normalise(element.value);
      }

      return normalise(
        element.getAttribute("aria-label") ??
          element.getAttribute("title") ??
          element.textContent,
      );
    }

    function looksLikeLogoutText(value: string) {
      return ["logout", "log out", "sign out", "signout", "exit"].some(
        (token) => value.includes(token),
      );
    }

    function isLogoutAnchor(element: HTMLAnchorElement) {
      const href = normalise(element.getAttribute("href"));
      return (
        href.includes("logout") ||
        href.includes("signout") ||
        href.includes("sign-out") ||
        looksLikeLogoutText(elementText(element))
      );
    }

    function isBypassed(element: Element | null) {
      if (!element) {
        return false;
      }

      return element.getAttribute(BYPASS_ATTR) === "1";
    }

    async function readJson<T>(input: RequestInfo, init?: RequestInit) {
      const response = await fetch(input, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      return (await response.json()) as T;
    }

    export function ExperienceLogoutGuard() {
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const [selectedRating, setSelectedRating] = useState<number | null>(null);
      const [comment, setComment] = useState("");
      const pendingActionRef = useRef<PendingAction | null>(null);
      const promptIdRef = useRef<string | null>(null);
      const flowLockRef = useRef(false);

      function resetModal() {
        setOpen(false);
        setBusy(false);
        setSelectedRating(null);
        setComment("");
        promptIdRef.current = null;
      }

      function continueLogout() {
        const pending = pendingActionRef.current;
        pendingActionRef.current = null;

        if (!pending) {
          resetModal();
          return;
        }

        if (pending.kind === "anchor") {
          pending.element.setAttribute(BYPASS_ATTR, "1");
          pending.element.click();
          pending.element.removeAttribute(BYPASS_ATTR);
          resetModal();
          return;
        }

        if (pending.kind === "form") {
          pending.form.setAttribute(BYPASS_ATTR, "1");
          pending.form.requestSubmit();
          pending.form.removeAttribute(BYPASS_ATTR);
          resetModal();
          return;
        }

        pending.element.setAttribute(BYPASS_ATTR, "1");
        pending.element.click();
        pending.element.removeAttribute(BYPASS_ATTR);
        resetModal();
      }

      async function maybeStartPrompt(pending: PendingAction) {
        pendingActionRef.current = pending;

        if (flowLockRef.current) {
          return;
        }

        flowLockRef.current = true;

        try {
          const status = await readJson<StatusPayload>(
            "/api/experience-feedback/status",
            {
              method: "GET",
            },
          );

          if (!status.due) {
            continueLogout();
            return;
          }

          const prompt = await readJson<PromptPayload>(
            "/api/experience-feedback/prompt",
            {
              method: "POST",
              body: JSON.stringify({}),
            },
          );

          if (!prompt.due || !prompt.promptId) {
            continueLogout();
            return;
          }

          promptIdRef.current = prompt.promptId;
          setOpen(true);
        } catch {
          // Never trap a player in the logout flow.
          continueLogout();
        } finally {
          flowLockRef.current = false;
        }
      }

      async function completePrompt(payload: {
        rating?: number;
        comment?: string;
        skipped?: boolean;
      }) {
        const promptId = promptIdRef.current;

        if (!promptId || busy) {
          return;
        }

        setBusy(true);

        try {
          await readJson(
            "/api/experience-feedback/complete",
            {
              method: "POST",
              body: JSON.stringify({
                promptId,
                rating: payload.rating,
                comment: payload.comment,
                skipped: payload.skipped ?? false,
              }),
            },
          );
        } catch {
          // Ignore analytics errors and still let the player leave.
        } finally {
          continueLogout();
        }
      }

      useEffect(() => {
        function onAnchorClick(event: MouseEvent) {
          const target = event.target;
          if (!(target instanceof Element)) {
            return;
          }

          const anchor = target.closest("a");
          if (!(anchor instanceof HTMLAnchorElement)) {
            return;
          }

          if (isBypassed(anchor) || !isLogoutAnchor(anchor)) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          maybeStartPrompt({
            kind: "anchor",
            element: anchor,
          });
        }

        function onSubmit(event: SubmitEvent) {
          const form = event.target;
          if (!(form instanceof HTMLFormElement)) {
            return;
          }

          if (isBypassed(form)) {
            return;
          }

          const submitter = event.submitter;

          if (!(submitter instanceof HTMLElement)) {
            return;
          }

          if (!looksLikeLogoutText(elementText(submitter as HTMLButtonElement))) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          maybeStartPrompt({
            kind: "form",
            form,
            submitter,
          });
        }

        function onStandaloneButtonClick(event: MouseEvent) {
          const target = event.target;
          if (!(target instanceof Element)) {
            return;
          }

          const button = target.closest("button, input[type=button], input[type=submit]");
          if (
            !(button instanceof HTMLButtonElement) &&
            !(button instanceof HTMLInputElement)
          ) {
            return;
          }

          if (button.form || isBypassed(button)) {
            return;
          }

          if (!looksLikeLogoutText(elementText(button))) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          maybeStartPrompt({
            kind: "button",
            element: button,
          });
        }

        document.addEventListener("click", onAnchorClick, true);
        document.addEventListener("submit", onSubmit, true);
        document.addEventListener("click", onStandaloneButtonClick, true);

        return () => {
          document.removeEventListener("click", onAnchorClick, true);
          document.removeEventListener("submit", onSubmit, true);
          document.removeEventListener("click", onStandaloneButtonClick, true);
        };
      }, []);

      useEffect(() => {
        if (!open) {
          return;
        }

        function onKeyDown(event: KeyboardEvent) {
          if (event.key === "Escape" && !busy) {
            event.preventDefault();
            completePrompt({ skipped: true });
          }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
      }, [busy, open]);

      const needsCommentStep = selectedRating === 1 || selectedRating === 2;

      if (!open) {
        return null;
      }

      return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl border border-[rgb(var(--sep-colour-6c5434))] bg-[rgb(var(--sep-colour-120d0a))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8d775b))]">
                  Session feedback
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-efd6a3))]">
                  How was your experience?
                </h2>
                <p className="mt-2 max-w-xl text-sm text-[rgb(var(--sep-colour-c7b493))]">
                  Once every 7 days, when leaving Sepulchria, players can leave a quick feeling check so staff can understand how the world is landing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {EXPERIENCE_RATINGS.map((rating) => {
                const active = selectedRating === rating.value;
                return (
                  <button
                    key={rating.value}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (rating.value <= 2) {
                        setSelectedRating(rating.value);
                        return;
                      }

                      completePrompt({ rating: rating.value });
                    }}
                    className={[
                      "group flex flex-col items-center justify-center gap-2 border px-3 py-4 transition",
                      active
                        ? "border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-201710))]"
                        : "border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] hover:border-[rgb(var(--sep-colour-977242))] hover:bg-[rgb(var(--sep-colour-221912))]",
                      busy ? "cursor-wait opacity-60" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-2">
                      <img
                        src={rating.imageSrc}
                        alt={rating.label}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[rgb(var(--sep-colour-efd6a3))]">{rating.label}</p>
                      <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                        {rating.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {needsCommentStep ? (
              <div className="mt-5 border border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] p-4">
                <p className="text-sm text-[rgb(var(--sep-colour-efd6a3))]">
                  Want to tell us why?
                </p>
                <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                  Optional. Even a short note helps staff understand what needs attention.
                </p>
                <textarea
                  value={comment}
                  disabled={busy}
                  onChange={(event) => setComment(event.target.value.slice(0, 400))}
                  rows={4}
                  maxLength={400}
                  placeholder="Optional comment"
                  className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none"
                />
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => completePrompt({ rating: selectedRating ?? undefined })}
                    className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
                  >
                    Skip comment
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      completePrompt({
                        rating: selectedRating ?? undefined,
                        comment,
                      })
                    }
                    className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))]"
                  >
                    Send feedback
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                Your custom face images live in <span className="font-mono text-[rgb(var(--sep-colour-bd9c68))]">/public/experience-faces/</span>. Replace them whenever you are ready.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => completePrompt({ skipped: true })}
                className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      );
    }
    """
).strip() + "\n"

status_route = textwrap.dedent(
    f"""
    import {{ NextResponse }} from "next/server";

    import {{ createAdminClient }} from "@/lib/supabase/admin";
    import {{ EXPERIENCE_FEEDBACK_COOLDOWN_DAYS }} from "@/lib/experience/experience-ratings";
    import {{ {server_helper_name} }} from "{server_import_path}";

    const COOLDOWN_MS =
      EXPERIENCE_FEEDBACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    export async function GET() {{
      const supabase = await {server_helper_name}();
      const {{
        data: {{ user }},
      }} = await supabase.auth.getUser();

      if (!user) {{
        return NextResponse.json({{ due: false }}, {{ status: 200 }});
      }}

      const admin = createAdminClient();
      const result = await admin
        .from("experience_feedback")
        .select("prompted_at")
        .eq("user_id", user.id)
        .order("prompted_at", {{ ascending: false }})
        .limit(1)
        .maybeSingle();

      if (result.error) {{
        return NextResponse.json(
          {{ error: result.error.message }},
          {{ status: 500 }},
        );
      }}

      const lastPromptAt = result.data?.prompted_at
        ? new Date(result.data.prompted_at).getTime()
        : null;

      const due =
        lastPromptAt === null ||
        Number.isNaN(lastPromptAt) ||
        Date.now() - lastPromptAt >= COOLDOWN_MS;

      return NextResponse.json({{ due }});
    }}
    """
).strip() + "\n"

prompt_route = textwrap.dedent(
    f"""
    import {{ NextResponse }} from "next/server";

    import {{ createAdminClient }} from "@/lib/supabase/admin";
    import {{ EXPERIENCE_FEEDBACK_COOLDOWN_DAYS }} from "@/lib/experience/experience-ratings";
    import {{ {server_helper_name} }} from "{server_import_path}";

    const COOLDOWN_MS =
      EXPERIENCE_FEEDBACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    export async function POST() {{
      const supabase = await {server_helper_name}();
      const {{
        data: {{ user }},
      }} = await supabase.auth.getUser();

      if (!user) {{
        return NextResponse.json(
          {{ due: false, promptId: null }},
          {{ status: 200 }},
        );
      }}

      const admin = createAdminClient();
      const latest = await admin
        .from("experience_feedback")
        .select("id, prompted_at")
        .eq("user_id", user.id)
        .order("prompted_at", {{ ascending: false }})
        .limit(1)
        .maybeSingle();

      if (latest.error) {{
        return NextResponse.json(
          {{ error: latest.error.message }},
          {{ status: 500 }},
        );
      }}

      const lastPromptAt = latest.data?.prompted_at
        ? new Date(latest.data.prompted_at).getTime()
        : null;

      const due =
        lastPromptAt === null ||
        Number.isNaN(lastPromptAt) ||
        Date.now() - lastPromptAt >= COOLDOWN_MS;

      if (!due) {{
        return NextResponse.json({{ due: false, promptId: null }});
      }}

      const inserted = await admin
        .from("experience_feedback")
        .insert({{
          user_id: user.id,
          prompted_at: new Date().toISOString(),
        }})
        .select("id")
        .single();

      if (inserted.error) {{
        return NextResponse.json(
          {{ error: inserted.error.message }},
          {{ status: 500 }},
        );
      }}

      return NextResponse.json({{
        due: true,
        promptId: inserted.data.id,
      }});
    }}
    """
).strip() + "\n"

complete_route = textwrap.dedent(
    f"""
    import {{ NextRequest, NextResponse }} from "next/server";

    import {{ createAdminClient }} from "@/lib/supabase/admin";
    import {{ {server_helper_name} }} from "{server_import_path}";

    export async function POST(request: NextRequest) {{
      const supabase = await {server_helper_name}();
      const {{
        data: {{ user }},
      }} = await supabase.auth.getUser();

      if (!user) {{
        return NextResponse.json(
          {{ error: "Unauthenticated." }},
          {{ status: 401 }},
        );
      }}

      const body = await request.json();
      const promptId =
        typeof body?.promptId === "string" ? body.promptId.trim() : "";
      const skipped = body?.skipped === true;
      const rating =
        typeof body?.rating === "number" ? Number(body.rating) : null;
      const comment =
        typeof body?.comment === "string" ? body.comment.trim().slice(0, 400) : null;

      if (!promptId) {{
        return NextResponse.json(
          {{ error: "Prompt ID is required." }},
          {{ status: 400 }},
        );
      }}

      if (!skipped && (rating === null || ![1, 2, 3, 4, 5].includes(rating))) {{
        return NextResponse.json(
          {{ error: "Rating is invalid." }},
          {{ status: 400 }},
        );
      }}

      const admin = createAdminClient();
      const update = await admin
        .from("experience_feedback")
        .update({{
          skipped,
          rating: skipped ? null : rating,
          comment: skipped ? null : comment,
          responded_at: new Date().toISOString(),
        }})
        .eq("id", promptId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (update.error) {{
        return NextResponse.json(
          {{ error: update.error.message }},
          {{ status: 500 }},
        );
      }}

      if (!update.data) {{
        return NextResponse.json(
          {{ error: "Prompt not found." }},
          {{ status: 404 }},
        );
      }}

      return NextResponse.json({{ ok: true }});
    }}
    """
).strip() + "\n"

admin_page = textwrap.dedent(
    """
    import Link from "next/link";

    import { createAdminClient } from "@/lib/supabase/admin";
    import {
      EXPERIENCE_RATINGS,
      type ExperienceRating,
    } from "@/lib/experience/experience-ratings";

    type SearchParams = Promise<
      Record<string, string | string[] | undefined>
    >;

    type FeedbackRow = {
      id: string;
      user_id: string;
      rating: number | null;
      comment: string | null;
      prompted_at: string;
      responded_at: string | null;
      skipped: boolean;
      created_at: string;
    };

    type CharacterRow = {
      user_id: string;
      display_name: string | null;
      public_slug: string | null;
    };

    type UserAggregate = {
      userId: string;
      displayName: string;
      publicSlug: string | null;
      prompts: number;
      answered: number;
      skipped: number;
      counts: Record<number, number>;
      latestPromptAt: string | null;
      latestComment: string | null;
    };

    function asSingle(value: string | string[] | undefined) {
      return Array.isArray(value) ? value[0] ?? "" : value ?? "";
    }

    function startOfDay(input: string) {
      return new Date(`${input}T00:00:00.000Z`).getTime();
    }

    function endOfDay(input: string) {
      return new Date(`${input}T23:59:59.999Z`).getTime();
    }

    function percentage(part: number, whole: number) {
      if (!whole) {
        return 0;
      }

      return Math.round((part / whole) * 1000) / 10;
    }

    function formatPercent(value: number) {
      return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
    }

    function getFace(value: number) {
      return EXPERIENCE_RATINGS.find((entry) => entry.value === value) as ExperienceRating;
    }

    export default async function AdminExperiencePage({
      searchParams,
    }: {
      searchParams?: SearchParams;
    }) {
      const params = searchParams ? await searchParams : {};
      const query = asSingle(params.query).trim().toLowerCase();
      const ratingFilter = Number(asSingle(params.rating) || 0);
      const from = asSingle(params.from);
      const to = asSingle(params.to);

      const admin = createAdminClient();
      const [feedbackResult, charactersResult] = await Promise.all([
        admin
          .from("experience_feedback")
          .select(
            "id, user_id, rating, comment, prompted_at, responded_at, skipped, created_at",
          )
          .order("prompted_at", { ascending: false }),
        admin
          .from("characters")
          .select("user_id, display_name, public_slug")
          .order("display_name", { ascending: true }),
      ]);

      if (feedbackResult.error) {
        throw new Error(
          `Unable to load experience feedback: ${feedbackResult.error.message}`,
        );
      }

      if (charactersResult.error) {
        throw new Error(
          `Unable to load characters: ${charactersResult.error.message}`,
        );
      }

      const feedbackRows = (feedbackResult.data ?? []) as FeedbackRow[];
      const characters = (charactersResult.data ?? []) as CharacterRow[];

      const characterByUserId = new Map(
        characters.map((row) => [
          row.user_id,
          {
            displayName: row.display_name?.trim() || "Unknown character",
            publicSlug: row.public_slug,
          },
        ]),
      );

      const filteredRows = feedbackRows.filter((row) => {
        const promptTime = new Date(row.prompted_at).getTime();

        if (from && promptTime < startOfDay(from)) {
          return false;
        }

        if (to && promptTime > endOfDay(to)) {
          return false;
        }

        if (ratingFilter > 0 && row.rating !== ratingFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const profile = characterByUserId.get(row.user_id);
        const haystack = [
          row.user_id,
          profile?.displayName ?? "",
          profile?.publicSlug ?? "",
          row.comment ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });

      const responseRows = filteredRows.filter(
        (row) => row.rating !== null && !row.skipped,
      );
      const answeredCount = responseRows.length;
      const promptedCount = filteredRows.length;
      const skippedCount = filteredRows.filter((row) => row.skipped).length;

      const overallCounts = Object.fromEntries(
        EXPERIENCE_RATINGS.map((rating) => [rating.value, 0]),
      ) as Record<number, number>;

      for (const row of responseRows) {
        if (row.rating !== null) {
          overallCounts[row.rating] += 1;
        }
      }

      const aggregates = new Map<string, UserAggregate>();

      for (const row of filteredRows) {
        const profile = characterByUserId.get(row.user_id);
        const aggregate =
          aggregates.get(row.user_id) ??
          {
            userId: row.user_id,
            displayName: profile?.displayName ?? row.user_id,
            publicSlug: profile?.publicSlug ?? null,
            prompts: 0,
            answered: 0,
            skipped: 0,
            counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            latestPromptAt: null,
            latestComment: null,
          };

        aggregate.prompts += 1;

        if (!aggregate.latestPromptAt || row.prompted_at > aggregate.latestPromptAt) {
          aggregate.latestPromptAt = row.prompted_at;
        }

        if (row.skipped) {
          aggregate.skipped += 1;
        }

        if (row.rating !== null && !row.skipped) {
          aggregate.answered += 1;
          aggregate.counts[row.rating] += 1;
        }

        if (!aggregate.latestComment && row.comment?.trim()) {
          aggregate.latestComment = row.comment.trim();
        }

        aggregates.set(row.user_id, aggregate);
      }

      const users = [...aggregates.values()].sort((left, right) => {
        if (right.answered !== left.answered) {
          return right.answered - left.answered;
        }

        return left.displayName.localeCompare(right.displayName);
      });

      const commentRows = filteredRows.filter((row) => row.comment?.trim());

      return (
        <div className="space-y-6">
          <header className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8d775b))]">
                  Admin · Experience
                </p>
                <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
                  How Was Your Experience?
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--sep-colour-c7b493))]">
                  Satisfaction prompts shown when players leave Sepulchria, at most once every 7 days. Replace the placeholder face files in <span className="font-mono text-[rgb(var(--sep-colour-dec69a))]">public/experience-faces/</span> with your own art whenever you are ready.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/admin"
                  className="border border-[rgb(var(--sep-colour-5c4b35))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
                >
                  Back to Admin
                </Link>
              </div>
            </div>
          </header>

          <form className="grid gap-3 border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4 md:grid-cols-4 xl:grid-cols-6">
            <label className="md:col-span-2 xl:col-span-2">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Search user / comment
              </span>
              <input
                name="query"
                defaultValue={asSingle(params.query)}
                placeholder="Character, slug, user ID, comment..."
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Rating
              </span>
              <select
                name="rating"
                defaultValue={String(ratingFilter || "")}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              >
                <option value="">All</option>
                {EXPERIENCE_RATINGS.map((rating) => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                From
              </span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                To
              </span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))]"
              >
                Filter
              </button>
              <Link
                href="/admin/experience"
                className="border border-[rgb(var(--sep-colour-5c4b35))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
              >
                Reset
              </Link>
            </div>
          </form>

          <section className="grid gap-4 lg:grid-cols-4">
            <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Prompted
              </p>
              <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
                {promptedCount}
              </p>
            </div>
            <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Answered
              </p>
              <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
                {answeredCount}
              </p>
              <p className="mt-2 text-xs text-[rgb(var(--sep-colour-8d775b))]">
                Response rate {formatPercent(percentage(answeredCount, promptedCount))}
              </p>
            </div>
            <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Skipped
              </p>
              <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
                {skippedCount}
              </p>
            </div>
            <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Distinct users
              </p>
              <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
                {users.length}
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {EXPERIENCE_RATINGS.map((rating) => {
              const count = overallCounts[rating.value] ?? 0;
              const percent = percentage(count, answeredCount);
              return (
                <article
                  key={rating.value}
                  className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-1">
                      <img src={rating.imageSrc} alt={rating.label} className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <p className="text-sm text-[rgb(var(--sep-colour-efd6a3))]">{rating.label}</p>
                      <p className="text-[11px] text-[rgb(var(--sep-colour-8d775b))]">{count} answers</p>
                    </div>
                  </div>
                  <p className="mt-4 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">
                    {formatPercent(percent)}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-efd6a3))]">
                  Per-user distribution
                </h2>
                <p className="mt-1 text-xs text-[rgb(var(--sep-colour-8d775b))]">
                  Percentages below are calculated from answered prompts only.
                </p>
              </div>
            </div>

            {users.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--sep-colour-4c3c2b))] text-left text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                      <th className="px-3 py-3">User</th>
                      <th className="px-3 py-3">Prompts</th>
                      <th className="px-3 py-3">Answered</th>
                      <th className="px-3 py-3">Response rate</th>
                      {EXPERIENCE_RATINGS.map((rating) => (
                        <th key={rating.value} className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <img src={rating.imageSrc} alt={rating.label} className="h-8 w-8 object-contain" />
                            <span>{rating.label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-3">Latest comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.userId}
                        className="border-b border-[rgb(var(--sep-colour-241b14))] align-top text-[rgb(var(--sep-colour-d7c4a5))]"
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-[rgb(var(--sep-colour-efd6a3))]">
                            {user.publicSlug ? (
                              <Link href={`/characters/${user.publicSlug}`} className="hover:underline">
                                {user.displayName}
                              </Link>
                            ) : (
                              user.displayName
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                            {user.userId}
                          </div>
                        </td>
                        <td className="px-3 py-3">{user.prompts}</td>
                        <td className="px-3 py-3">{user.answered}</td>
                        <td className="px-3 py-3">
                          {formatPercent(percentage(user.answered, user.prompts))}
                        </td>
                        {EXPERIENCE_RATINGS.map((rating) => (
                          <td key={rating.value} className="px-3 py-3 text-center">
                            <div className="font-medium">
                              {formatPercent(
                                percentage(user.counts[rating.value], user.answered),
                              )}
                            </div>
                            <div className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                              {user.counts[rating.value]}
                            </div>
                          </td>
                        ))}
                        <td className="max-w-xs px-3 py-3 text-[12px] text-[rgb(var(--sep-colour-bca788))]">
                          {user.latestComment ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--sep-colour-8d775b))]">
                No experience feedback matches the current filters.
              </p>
            )}
          </section>

          <section className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
            <div className="mb-4">
              <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-efd6a3))]">
                Recent comments
              </h2>
              <p className="mt-1 text-xs text-[rgb(var(--sep-colour-8d775b))]">
                Optional notes left by players, newest prompts first.
              </p>
            </div>

            {commentRows.length ? (
              <div className="space-y-3">
                {commentRows.slice(0, 25).map((row) => {
                  const profile = characterByUserId.get(row.user_id);
                  const face = row.rating ? getFace(row.rating) : null;
                  return (
                    <article
                      key={row.id}
                      className="border border-[rgb(var(--sep-colour-241b14))] bg-[rgb(var(--sep-colour-17110d))] p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--sep-colour-8d775b))]">
                        <span className="font-medium text-[rgb(var(--sep-colour-dec69a))]">
                          {profile?.displayName ?? row.user_id}
                        </span>
                        {face ? (
                          <span className="inline-flex items-center gap-1">
                            <img src={face.imageSrc} alt={face.label} className="h-5 w-5 object-contain" />
                            {face.label}
                          </span>
                        ) : null}
                        <span>{new Date(row.prompted_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]">
                        {row.comment}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--sep-colour-8d775b))]">
                No comments yet for the current filters.
              </p>
            )}
          </section>
        </div>
      );
    }
    """
).strip() + "\n"

svg_templates = {
    "public/experience-faces/1-very-bad.svg": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none'>
  <rect width='128' height='128' rx='64' fill='#140f0b'/>
  <circle cx='64' cy='64' r='54' stroke='#d2aa63' stroke-width='6'/>
  <circle cx='45' cy='50' r='6' fill='#efd6a3'/>
  <circle cx='83' cy='50' r='6' fill='#efd6a3'/>
  <path d='M40 90c6-12 16-18 24-18s18 6 24 18' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
  <path d='M34 30l14 10M94 30L80 40' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
</svg>""",
    "public/experience-faces/2-not-great.svg": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none'>
  <rect width='128' height='128' rx='64' fill='#140f0b'/>
  <circle cx='64' cy='64' r='54' stroke='#d2aa63' stroke-width='6'/>
  <circle cx='45' cy='50' r='6' fill='#efd6a3'/>
  <circle cx='83' cy='50' r='6' fill='#efd6a3'/>
  <path d='M42 86c7-6 15-9 22-9 9 0 16 3 22 9' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
  <path d='M34 34l12 6M94 34l-12 6' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
</svg>""",
    "public/experience-faces/3-okay.svg": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none'>
  <rect width='128' height='128' rx='64' fill='#140f0b'/>
  <circle cx='64' cy='64' r='54' stroke='#d2aa63' stroke-width='6'/>
  <circle cx='45' cy='50' r='6' fill='#efd6a3'/>
  <circle cx='83' cy='50' r='6' fill='#efd6a3'/>
  <path d='M44 84h40' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
</svg>""",
    "public/experience-faces/4-good.svg": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none'>
  <rect width='128' height='128' rx='64' fill='#140f0b'/>
  <circle cx='64' cy='64' r='54' stroke='#d2aa63' stroke-width='6'/>
  <circle cx='45' cy='50' r='6' fill='#efd6a3'/>
  <circle cx='83' cy='50' r='6' fill='#efd6a3'/>
  <path d='M42 78c8 10 15 14 22 14s14-4 22-14' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
</svg>""",
    "public/experience-faces/5-great.svg": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none'>
  <rect width='128' height='128' rx='64' fill='#140f0b'/>
  <circle cx='64' cy='64' r='54' stroke='#d2aa63' stroke-width='6'/>
  <circle cx='45' cy='50' r='6' fill='#efd6a3'/>
  <circle cx='83' cy='50' r='6' fill='#efd6a3'/>
  <path d='M38 74c10 14 19 20 26 20s16-6 26-20' stroke='#efd6a3' stroke-width='6' stroke-linecap='round'/>
  <path d='M63 28l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z' fill='#d2aa63'/>
</svg>""",
}

new_files = {
    "lib/experience/experience-ratings.ts": experience_ratings,
    "components/experience/experience-logout-guard.tsx": logout_guard,
    "app/api/experience-feedback/status/route.ts": status_route,
    "app/api/experience-feedback/prompt/route.ts": prompt_route,
    "app/api/experience-feedback/complete/route.ts": complete_route,
    "app/(portal)/admin/experience/page.tsx": admin_page,
    **svg_templates,
}

for path_str, content in new_files.items():
    path = Path(path_str)
    if path.exists():
        raise SystemExit(f"{path} already exists. Expected clean {BASE} baseline.")

# -----------------------------------------------------------------------------
# Patch portal layout to mount the logout guard globally.
# -----------------------------------------------------------------------------

files_to_write: dict[Path, str] = {}
layout_text = read(portal_layout)
layout_text = insert_after_last_import(
    layout_text,
    'import { ExperienceLogoutGuard } from "@/components/experience/experience-logout-guard";\n',
    "Portal layout experience guard import",
)

if "<ExperienceLogoutGuard />" in layout_text:
    raise SystemExit("ExperienceLogoutGuard is already mounted. Expected clean baseline.")

children_count = layout_text.count("{children}")
if children_count < 1:
    raise SystemExit(
        f"Portal layout children slot: expected at least 1 match, found {children_count}. Expected {BASE}."
    )
layout_text = layout_text.replace(
    "{children}",
    "{children}\n      <ExperienceLogoutGuard />",
    1,
)
files_to_write[portal_layout] = layout_text

# -----------------------------------------------------------------------------
# Optional: add a simple admin landing-page link if the baseline contains a
# recognisable notifications link. This is non-fatal if not found.
# -----------------------------------------------------------------------------

admin_index = Path("app/(portal)/admin/page.tsx")
if admin_index.exists():
    admin_text = read(admin_index)
    if "/admin/experience" not in admin_text:
        candidates = [
            (
                'href="/admin/notifications"',
                'href="/admin/notifications"',
            ),
            (
                "href='/admin/notifications'",
                "href='/admin/notifications'",
            ),
        ]
        patched = False
        for needle, exact in candidates:
            if needle in admin_text:
                block = re.search(
                    r"(<[^>]+href=[\"']\/admin\/notifications[\"'][\s\S]{0,400}?<\/[^>]+>)",
                    admin_text,
                )
                if block:
                    original = block.group(1)
                    extra = original.replace("/admin/notifications", "/admin/experience")
                    extra = extra.replace("Notifications", "Experience")
                    extra = extra.replace("Notification", "Experience")
                    if extra != original:
                        admin_text = admin_text.replace(original, original + "\n" + extra, 1)
                        files_to_write[admin_index] = admin_text
                        patched = True
                        break
        if not patched:
            print("! Skipped optional admin landing-page link insertion.")

# -----------------------------------------------------------------------------
# Write new files and patched files.
# -----------------------------------------------------------------------------

for path_str, content in new_files.items():
    write(path_str, content)

for path, content in files_to_write.items():
    write(path, content)

print("\na1bcb03 experience feedback installed.")
print("Run the SQL first, then run this patch, then npm run build.")
print("Replace the placeholder face SVGs in public/experience-faces/ with your own art whenever you like.")
