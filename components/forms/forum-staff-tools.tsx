import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type ForumStaffToolsProps = {
  className?: string;
  showOverviewLink?: boolean;
};

export default async function ForumStaffTools({
  className = "",
  showOverviewLink = false,
}: ForumStaffToolsProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: staffResult,
    error: staffError,
  } = await supabase.rpc(
    "current_user_is_staff",
  );

  if (
    staffError ||
    staffResult !== true
  ) {
    return null;
  }

  return (
    <aside
      aria-label="Forum staff tools"
      className={`border border-amber-900/55 bg-amber-950/10 ${className}`}
    >
      <div className="border-b border-amber-900/35 px-5 py-5 sm:px-6">
        <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
          Staff tools
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]">
          Forum Administration
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-a99880))]">
          Manage forum sections,
          discussions and moderation
          history from the administration
          area.
        </p>
      </div>

      <div
        className={`grid gap-3 px-5 py-5 sm:px-6 ${
          showOverviewLink
            ? "sm:grid-cols-3"
            : "sm:grid-cols-2"
        }`}
      >
        {showOverviewLink ? (
          <StaffLink
            href="/admin/forum"
            eyebrow="Control panel"
            title="Forum Overview"
            description="Return to the forum administration dashboard."
            label="Open overview"
          />
        ) : null}

        <StaffLink
          href="/admin/forum/sections"
          eyebrow="Structure"
          title="Manage Sections"
          description="Create, edit, hide and organise forum sections."
          label="Manage sections"
        />

        <StaffLink
          href="/admin/forum/topics"
          eyebrow="Discussions"
          title="Manage Topics"
          description="Review active and deleted discussions."
          label="Manage topics"
        />

        <StaffLink
          href="/admin/forum/moderation"
          eyebrow="History"
          title="Moderation Log"
          description="Review recorded moderation actions."
          label="View log"
        />
      </div>
    </aside>
  );
}

function StaffLink({
  href,
  eyebrow,
  title,
  description,
  label,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  label: string;
}) {
  return (
    <article className="flex h-full flex-col border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <div className="flex-1 px-4 py-4">
        <p className="text-[7px] uppercase tracking-[0.18em] text-amber-500">
          {eyebrow}
        </p>

        <h3 className="mt-2 font-serif text-lg text-[rgb(var(--sep-colour-d8c09a))]">
          {title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-817567))]">
          {description}
        </p>
      </div>

      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-110d0a))] px-4 py-3">
        <Link
          href={href}
          className="block border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-center text-[8px] uppercase tracking-[0.16em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/40"
        >
          {label}
        </Link>
      </div>
    </article>
  );
}
