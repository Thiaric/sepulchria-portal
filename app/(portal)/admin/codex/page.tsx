import Link from "next/link";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { CodexPreviewButton } from "@/components/admin/codex-preview-button";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  createCodexChapter,
  publishCodexChapter,
  unpublishCodexChapter,
} from "./actions";

export const dynamic =
  "force-dynamic";

type CodexChapterRow = {
  id: string;
  title: string;
  slug: string;
  chapter_number: number | null;
  sort_order: number;
  status:
    | "draft"
    | "published";
  updated_at: string | null;
};

export default async function AdminCodexPage() {
  await requireAdminSection(
    "codex",
  );

  const supabase =
    createAdminClient();

  const { data, error } =
    await supabase
      .from("codex_chapters")
      .select(
        `
          id,
          title,
          slug,
          chapter_number,
          sort_order,
          status,
          updated_at
        `,
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("chapter_number", {
        ascending: true,
      });

  if (error) {
    throw new Error(error.message);
  }

  const chapters =
    (data ?? []) as CodexChapterRow[];

  return (
    <div className="p-5 sm:p-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806a4b))]">
              Lore management
            </p>

            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-dfc99f))]">
              Codex Administration
            </h1>
          </div>

          <a
            href="/codex"
            target="_blank"
            rel="noreferrer"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a78d68))] hover:border-[rgb(var(--sep-colour-8d693e))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"
          >
            View public Codex ↗
          </a>
        </header>

        <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4b))]">
              New document
            </p>

            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e1c89f))]">
              Create chapter
            </h2>
          </div>

          <AdminActionForm
            action={
              createCodexChapter
            }
            className="grid gap-4"
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <AdminField label="Title">
                <input
                  name="title"
                  required
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  name="slug"
                  required
                  placeholder="chapter-one"
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Chapter number">
                <input
                  name="chapter_number"
                  type="number"
                  min={1}
                  max={10}
                  required
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Sort order">
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={1}
                  className={inputClass}
                />
              </AdminField>
            </div>

            <AdminField label="Body">
              <RichTextEditor
                name="body"
                variant="lore"
                minHeight={260}
                maxTextLength={100_000}
                placeholder="Write the chapter..."
              />
            </AdminField>

            <div className="flex justify-end">
              <SubmitButton>
                Create chapter
              </SubmitButton>
            </div>
          </AdminActionForm>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4b))]">
                Existing documents
              </p>

              <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e1c89f))]">
                Chapters
              </h2>
            </div>

            <p className="text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-746958))]">
              {chapters.length} / 10
            </p>
          </div>

          {chapters.length === 0 ? (
            <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-5 text-sm text-[rgb(var(--sep-colour-8f806c))]">
              No Codex chapters exist yet.
            </div>
          ) : (
            <div className="space-y-2">
              {chapters.map(
                (chapter) => (
                  <article
                    key={chapter.id}
                    id={`codex-chapter-${chapter.id}`}
                    className="scroll-mt-4 grid gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 lg:grid-cols-[90px_minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756550))]">
                        Chapter
                      </p>
                      <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d2b98e))]">
                        {chapter.chapter_number ?? "—"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
                          {chapter.title}
                        </h3>

                        <StatusBadge
                          status={chapter.status}
                        />
                      </div>

                      <p className="mt-1 truncate text-xs text-[rgb(var(--sep-colour-817565))]">
                        /{chapter.slug}
                        {" · "}
                        order {chapter.sort_order}
                      </p>

                      <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-6f6457))]">
                        Updated{" "}
                        {formatDate(
                          chapter.updated_at,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Link
                        href={`/admin/codex/${chapter.id}`}
                        className={secondaryButtonClass}
                      >
                        Edit
                      </Link>

                      <CodexPreviewButton
                        chapterId={chapter.id}
                      />

                      {chapter.status === "published" ? (
                        <AdminActionForm
                          action={unpublishCodexChapter}
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={chapter.id}
                          />
                          <button
                            type="submit"
                            className={secondaryButtonClass}
                          >
                            Unpublish
                          </button>
                        </AdminActionForm>
                      ) : (
                        <AdminActionForm
                          action={publishCodexChapter}
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={chapter.id}
                          />
                          <button
                            type="submit"
                            className={primaryButtonClass}
                          >
                            Publish
                          </button>
                        </AdminActionForm>
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-806e59))]">
        {label}
      </span>
      {children}
    </div>
  );
}

function SubmitButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={primaryButtonClass}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: "draft" | "published";
}) {
  return (
    <span
      className={
        status === "published"
          ? "border border-emerald-800/55 bg-emerald-950/30 px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-emerald-300"
          : "border border-[rgb(var(--sep-colour-5d472e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9f907d))]"
      }
    >
      {status}
    </span>
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

const inputClass =
  "h-10 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 text-sm text-[rgb(var(--sep-colour-d6c3a3))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))]";

const primaryButtonClass =
  "inline-flex min-h-9 items-center justify-center border border-[rgb(var(--sep-colour-a77a42))]/75 bg-[rgb(var(--sep-colour-382313))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]";

const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a78d68))] transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:text-[rgb(var(--sep-colour-d8bb8a))]";
