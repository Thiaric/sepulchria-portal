import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { CodexPreviewButton } from "@/components/admin/codex-preview-button";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  publishCodexChapter,
  unpublishCodexChapter,
  updateCodexChapter,
} from "../actions";

export const dynamic =
  "force-dynamic";

type AdminCodexEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CodexChapter = {
  id: string;
  title: string;
  slug: string;
  chapter_number: number | null;
  sort_order: number;
  body: string;
  status: "draft" | "published";
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
};

export default async function AdminCodexEditPage({
  params,
}: AdminCodexEditPageProps) {
  await requireAdminSection(
    "codex",
  );

  const { id } = await params;

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
          body,
          status,
          created_at,
          updated_at,
          published_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const chapter =
    data as CodexChapter;

  return (
    <div className="p-5 sm:p-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-4">
          <div>
            <Link
              href="/admin/codex"
              className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806a4b))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"
            >
              ← Codex administration
            </Link>

            <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-dfc99f))]">
              {chapter.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={chapter.status}
              />

              <span className="text-[9px] text-[rgb(var(--sep-colour-746958))]">
                Chapter{" "}
                {chapter.chapter_number ?? "—"}
                {" · "}
                order {chapter.sort_order}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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
        </header>

        <AdminActionForm
          action={updateCodexChapter}
          className="grid gap-5"
        >
          <input
            type="hidden"
            name="id"
            value={chapter.id}
          />

          <section className="grid gap-3 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <AdminField label="Title">
              <input
                name="title"
                required
                defaultValue={chapter.title}
                className={inputClass}
              />
            </AdminField>

            <AdminField label="Slug">
              <input
                name="slug"
                required
                defaultValue={chapter.slug}
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
                defaultValue={
                  chapter.chapter_number ?? ""
                }
                className={inputClass}
              />
            </AdminField>

            <AdminField label="Sort order">
              <input
                name="sort_order"
                type="number"
                defaultValue={chapter.sort_order}
                className={inputClass}
              />
            </AdminField>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4 sm:p-5">
            <AdminField label="Chapter body">
              <RichTextEditor
                name="body"
                defaultValue={chapter.body ?? ""}
                variant="lore"
                minHeight={520}
                maxTextLength={100_000}
                placeholder="Write the chapter..."
              />
            </AdminField>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[9px] leading-5 text-[rgb(var(--sep-colour-6f6457))]">
              <p>
                Created:{" "}
                {formatDate(chapter.created_at)}
              </p>
              <p>
                Updated:{" "}
                {formatDate(chapter.updated_at)}
              </p>
              <p>
                Published:{" "}
                {formatDate(chapter.published_at)}
              </p>
            </div>

            <button
              type="submit"
              className={primaryButtonClass}
            >
              Save chapter
            </button>
          </div>
        </AdminActionForm>
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
