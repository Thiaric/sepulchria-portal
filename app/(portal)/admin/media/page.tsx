import Link from "next/link";

import {
  MediaLibraryManager,
} from "@/components/admin/media-library-manager";
import {
  requireAdmin,
} from "@/lib/auth/require-staff";

export const dynamic =
  "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaPage() {
  await requireAdmin();

  const configured =
    Boolean(
      process.env.GITHUB_MEDIA_TOKEN,
    );

  return (
    <main>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[#8c704b]">
              Administration
            </p>

            <h2 className="mt-1 font-serif text-3xl text-[#ead5ac]">
              Media Library
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-[#928674]">
              Stage uploads and deletions for
              the repository&apos;s public
              folder, then save the whole
              batch as one GitHub commit.
            </p>
          </div>

          <Link
            href="/admin"
            className="border border-[#60482e]/45 bg-[#15100d] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#a99069] transition hover:border-[#987344] hover:text-[#e5c99a]"
          >
            Back to administration
          </Link>
        </div>

        {!configured ? (
          <section className="mt-4 border border-amber-800/55 bg-amber-950/15 px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-amber-400">
              Setup required
            </p>

            <p className="mt-2 text-xs leading-5 text-amber-200/70">
              GITHUB_MEDIA_TOKEN is not
              configured. Add a fine-grained
              GitHub token with Contents
              read/write permission for this
              repository to your local and
              Vercel environment variables.
            </p>
          </section>
        ) : null}

        <section className="mt-4 border border-[#60482e]/45 bg-[#100c09] px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[#9b805a]">
            How it works
          </p>

          <p className="mt-2 text-[10px] leading-5 text-[#817567]">
            Adding an upload only stages its
            bytes in GitHub and marking a
            deletion changes only this page.
            Neither action changes
            <code className="mx-1 text-[#c6ad87]">
              master
            </code>
            or triggers Vercel. When you
            click
            <strong className="mx-1 font-normal text-[#d1b68e]">
              Save changes
            </strong>
            the entire batch is written as
            one commit. A file stored as
            <code className="mx-1 text-[#c6ad87]">
              public/images/map.webp
            </code>
            is used by the site as
            <code className="ml-1 text-[#c6ad87]">
              /images/map.webp
            </code>.
          </p>
        </section>

        <MediaLibraryManager />
      </div>
    </main>
  );
}
