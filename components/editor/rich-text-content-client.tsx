"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";

import {
  legacyRichTextToHtml,
} from "@/lib/rich-text-shared";

type RichTextContentClientProps = {
  body: string;
  className?: string;
};

export function RichTextContentClient({
  body,
  className = "",
}: RichTextContentClientProps) {
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(
        legacyRichTextToHtml(body),
        {
          USE_PROFILES: {
            html: true,
          },
          FORBID_TAGS: [
            "script",
            "style",
            "iframe",
            "object",
            "embed",
            "form",
            "input",
            "button",
            "textarea",
            "svg",
            "math",
          ],
          FORBID_ATTR: [
            "srcdoc",
            "contenteditable",
          ],
        },
      ),
    [body],
  );

  return (
    <div
      className={`rich-text-content min-w-0 break-words [&_a]:text-[#d3a762] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#8d6d3e] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-4 [&_img]:max-h-[720px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#60482e]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[#60482e]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7 ${className}`}
      dangerouslySetInnerHTML={{
        __html: safeHtml,
      }}
    />
  );
}
