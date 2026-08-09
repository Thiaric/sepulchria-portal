import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sectionFile = path.join(
  root,
  "app",
  "(portal)",
  "forum",
  "[sectionSlug]",
  "page.tsx",
);

const topicFile = path.join(
  root,
  "app",
  "(portal)",
  "forum",
  "[sectionSlug]",
  "[topicSlug]",
  "page.tsx",
);

function replaceOnce(
  content,
  search,
  replacement,
  label,
) {
  if (!content.includes(search)) {
    throw new Error(
      `Could not patch ${label}: expected code was not found.`,
    );
  }

  return content.replace(
    search,
    replacement,
  );
}

function patchSectionPage() {
  let content = fs.readFileSync(
    sectionFile,
    "utf8",
  );

  const importLine =
    'import { ForumTopicFavouriteButton } from "@/components/forum/forum-topic-favourite-button";';

  if (!content.includes(importLine)) {
    content = replaceOnce(
      content,
      'import { createClient } from "@/lib/supabase/server";',
      `${importLine}\nimport { createClient } from "@/lib/supabase/server";`,
      "forum section import",
    );
  }

  if (
    !content.includes(
      '<ForumTopicFavouriteButton\n        topicId={topic.id}\n        compact',
    )
  ) {
    content = replaceOnce(
      content,
      '<article\n      className={`group grid gap-4 border transition md:grid-cols-[minmax(0,1fr)_110px_190px] md:items-center ${',
      '<article\n      className={`group relative grid gap-4 border transition md:grid-cols-[minmax(0,1fr)_110px_190px] md:items-center ${',
      "forum topic row relative positioning",
    );

    content = replaceOnce(
      content,
      '    >\n      <Link\n        href={`/forum/${sectionSlug}/${topic.slug}`}',
      `    >
      <ForumTopicFavouriteButton
        topicId={topic.id}
        compact
        className="absolute right-3 top-3 z-10"
      />

      <Link
        href={\`/forum/\${sectionSlug}/\${topic.slug}\`}`,
      "forum topic row favourite button",
    );
  }

  fs.writeFileSync(
    sectionFile,
    content,
    "utf8",
  );
}

function patchTopicPage() {
  let content = fs.readFileSync(
    topicFile,
    "utf8",
  );

  const importLine =
    'import { ForumTopicFavouriteButton } from "@/components/forum/forum-topic-favourite-button";';

  if (!content.includes(importLine)) {
    content = replaceOnce(
      content,
      'import TopicModerationPanel from "@/components/forum/topic-moderation-panel";',
      `import { ForumTopicFavouriteButton } from "@/components/forum/forum-topic-favourite-button";\nimport TopicModerationPanel from "@/components/forum/topic-moderation-panel";`,
      "forum topic import",
    );
  }

  if (
    !content.includes(
      '<ForumTopicFavouriteButton\n              topicId={topic.id}',
    )
  ) {
    content = replaceOnce(
      content,
      '          {isStaff ? (\n            <TopicModerationPanel',
      `          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <ForumTopicFavouriteButton
              topicId={topic.id}
            />

            {isStaff ? (
            <TopicModerationPanel`,
      "single topic favourite button start",
    );

    content = replaceOnce(
      content,
      '            />\n          ) : null}\n        </div>\n\n        <dl className="grid grid-cols-2',
      `            />
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2`,
      "single topic favourite button end",
    );
  }

  fs.writeFileSync(
    topicFile,
    content,
    "utf8",
  );
}

patchSectionPage();
patchTopicPage();

console.log(
  "Forum favourite buttons applied successfully.",
);
