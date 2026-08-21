import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import EditPostForm from "@/components/forum/edit-post-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EditPostPageProps = {
  params: Promise<{
    sectionSlug: string;
    topicSlug: string;
    postId: string;
  }>;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  is_locked: boolean;
  deleted_at: string | null;
};

type ForumPostRecord = {
  id: string;
  topic_id: string;
  author_user_id: string | null;
  body: string;
  is_initial: boolean;
  deleted_at: string | null;
};

type ForumPostImageRecord = {
  id: string;
  post_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeSortOrder(
  value: number | null,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return 0;
}

export default async function EditPostPage({
  params,
}: EditPostPageProps) {
  const {
    sectionSlug,
    topicSlug,
    postId,
  } = await params;

  if (!isUuid(postId)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const destination =
      `/forum/${encodeURIComponent(
        sectionSlug,
      )}/${encodeURIComponent(
        topicSlug,
      )}/posts/${encodeURIComponent(
        postId,
      )}/edit`;

    redirect(
      `/login?redirect=${encodeURIComponent(
        destination,
      )}`,
    );
  }

  const {
    data: section,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        name,
        slug,
        is_active
      `,
    )
    .eq("slug", sectionSlug)
    .maybeSingle<ForumSectionRecord>();

  if (
    sectionError ||
    !section ||
    !section.is_active
  ) {
    notFound();
  }

  const {
    data: topic,
    error: topicError,
  } = await supabase
    .from("forum_topics")
    .select(
      `
        id,
        section_id,
        title,
        slug,
        is_locked,
        deleted_at
      `,
    )
    .eq("section_id", section.id)
    .eq("slug", topicSlug)
    .maybeSingle<ForumTopicRecord>();

  if (
    topicError ||
    !topic ||
    topic.deleted_at
  ) {
    notFound();
  }

  const {
    data: post,
    error: postError,
  } = await supabase
    .from("forum_posts")
    .select(
      `
        id,
        topic_id,
        author_user_id,
        body,
        is_initial,
        deleted_at
      `,
    )
    .eq("id", postId)
    .eq("topic_id", topic.id)
    .maybeSingle<ForumPostRecord>();

  if (
    postError ||
    !post ||
    post.deleted_at
  ) {
    notFound();
  }

  const {
    data: staffResult,
  } = await supabase.rpc(
    "current_user_is_staff",
  );

  const isStaff =
    staffResult === true;

  const ownsPost =
    post.author_user_id === user.id;

  if (!ownsPost && !isStaff) {
    redirect(
      `/forum/${encodeURIComponent(
        section.slug,
      )}/${encodeURIComponent(
        topic.slug,
      )}#post-${post.id}`,
    );
  }

  if (topic.is_locked && !isStaff) {
    redirect(
      `/forum/${encodeURIComponent(
        section.slug,
      )}/${encodeURIComponent(
        topic.slug,
      )}#post-${post.id}`,
    );
  }

  const {
    data: imageRecords,
    error: imagesError,
  } = await supabase
    .from("forum_post_images")
    .select(
      `
        id,
        post_id,
        image_url,
        alt_text,
        sort_order
      `,
    )
    .eq("post_id", post.id)
    .order("sort_order", {
      ascending: true,
    });

  if (imagesError) {
    throw new Error(
      `Unable to load attached images: ${imagesError.message}`,
    );
  }

  const images = (
    (imageRecords ??
      []) as ForumPostImageRecord[]
  ).map((image) => ({
    id: image.id,
    image_url: image.image_url,
    alt_text: image.alt_text,
    sort_order:
      normalizeSortOrder(
        image.sort_order,
      ),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Forum breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-746653))]"
      >
        <Link
          href="/forum"
          className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
        >
          Forum
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <Link
          href={`/forum/${encodeURIComponent(
            section.slug,
          )}`}
          className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
        >
          {section.name}
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <Link
          href={`/forum/${encodeURIComponent(
            section.slug,
          )}/${encodeURIComponent(
            topic.slug,
          )}`}
          className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
        >
          {topic.title}
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span className="text-[rgb(var(--sep-colour-9e886a))]">
          Edit post
        </span>
      </nav>

      <EditPostForm
        postId={post.id}
        sectionSlug={section.slug}
        topicSlug={topic.slug}
        initialBody={post.body}
        initialImages={images}
      />
    </main>
  );
}