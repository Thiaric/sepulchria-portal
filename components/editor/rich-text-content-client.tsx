"use client";

import { useMemo } from "react";

import {
  legacyRichTextToHtml,
} from "@/lib/rich-text-shared";

type RichTextContentClientProps = {
  body: string;
  className?: string;
};

/*
 * IMPORTANT:
 *
 * Rich text stored by the portal is sanitised on the server
 * before persistence through sanitizeRichHtml().
 *
 * This component is used only to DISPLAY that already-sanitised
 * stored HTML from client components.
 *
 * Do not run DOMPurify again here. With Next 16 + Turbopack the
 * dompurify ESM export can be resolved in a form where
 * default.sanitize is not available, which caused the Codex
 * runtime crash when opened inside the modal.
 */
export function RichTextContentClient({
  body,
  className = "",
}: RichTextContentClientProps) {
  const renderedHtml = useMemo(
    () => legacyRichTextToHtml(body),
    [body],
  );

  return (
    <div
      className={`rich-text-content min-w-0 break-words [&_a]:text-[rgb(var(--sep-colour-d3a762))] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[rgb(var(--sep-colour-8d6d3e))] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-4 [&_img]:max-h-[720px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[rgb(var(--sep-colour-60482e))]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[rgb(var(--sep-colour-60482e))]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7 ${className}`}
      dangerouslySetInnerHTML={{
        __html: renderedHtml,
      }}
    />
  );
}