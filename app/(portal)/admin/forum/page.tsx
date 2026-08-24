import Link from "next/link";

import ForumStaffTools from "@/components/forum/forum-staff-tools";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";

export default async function AdminForumPage() {
  await requireAdminSection("forum");

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Administration breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-746653))]"
        >
          <Link
            href="/admin"
            className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
          >
            Administration
          </Link>

          <span aria-hidden="true">/</span>

          <span className="text-[rgb(var(--sep-colour-a48c6c))]">
            Forum
          </span>
        </nav>

        

        <div className="mt-6">
          <ForumStaffTools />
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/forum/topics?status=deleted"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 transition hover:border-[rgb(var(--sep-colour-8d673d))] hover:bg-[rgb(var(--sep-colour-1a130e))]"
          >
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-400">
              Recycle bin
            </p>

            <h2 className="mt-3 font-serif text-xl text-[rgb(var(--sep-colour-d7bf98))]">
              Deleted discussions
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-817567))]">
              Inspect soft-deleted topics and permanently erase selected records.
            </p>
          </Link>

          <Link
            href="/admin/forum/replies"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 transition hover:border-[rgb(var(--sep-colour-8d673d))] hover:bg-[rgb(var(--sep-colour-1a130e))]"
          >
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-400">
              Recycle bin
            </p>

            <h2 className="mt-3 font-serif text-xl text-[rgb(var(--sep-colour-d7bf98))]">
              Deleted replies
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-817567))]">
              Review individual deleted replies and choose which ones to remove forever.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
