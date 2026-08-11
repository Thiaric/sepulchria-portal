import Link from "next/link";

import ForumStaffTools from "@/components/forum/forum-staff-tools";
import { requireStaff } from "@/lib/auth/require-staff";

export default async function AdminForumPage() {
  await requireStaff();

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Administration breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#746653]"
        >
          <Link
            href="/admin"
            className="transition hover:text-[#c7a16d]"
          >
            Administration
          </Link>

          <span aria-hidden="true">/</span>

          <span className="text-[#a48c6c]">
            Forum
          </span>
        </nav>

        

        <div className="mt-6">
          <ForumStaffTools />
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/forum/topics?status=deleted"
            className="border border-[#60482e]/45 bg-[#15100d] p-5 transition hover:border-[#8d673d] hover:bg-[#1a130e]"
          >
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-400">
              Recycle bin
            </p>

            <h2 className="mt-3 font-serif text-xl text-[#d7bf98]">
              Deleted discussions
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#817567]">
              Inspect soft-deleted topics and permanently erase selected records.
            </p>
          </Link>

          <Link
            href="/admin/forum/replies"
            className="border border-[#60482e]/45 bg-[#15100d] p-5 transition hover:border-[#8d673d] hover:bg-[#1a130e]"
          >
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-400">
              Recycle bin
            </p>

            <h2 className="mt-3 font-serif text-xl text-[#d7bf98]">
              Deleted replies
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#817567]">
              Review individual deleted replies and choose which ones to remove forever.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
