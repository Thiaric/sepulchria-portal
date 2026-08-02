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

        <header className="border border-[#60482e]/45 bg-[#15100d]">
          <div className="border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-7 sm:px-7">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[#a4773f]">
              Administration
            </p>

            <h1 className="mt-3 font-serif text-3xl text-[#dec69d] sm:text-4xl">
              Forum
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#918474]">
              Manage sections, discussions and
              recorded moderation activity without
              adding staff controls to the public forum.
            </p>
          </div>
        </header>

        <div className="mt-6">
          <ForumStaffTools />
        </div>
      </div>
    </main>
  );
}
