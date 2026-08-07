import {
  sanitizeRichHtml,
} from "@/lib/rich-text";

type RichTextContentProps = {
  body: string;
  className?: string;
};

export function RichTextContent({
  body,
  className = "",
}: RichTextContentProps) {
  const safeHtml = sanitizeRichHtml(body);

  return (
    <div
      className={`rich-text-content min-w-0 break-words [&_a]:text-[#d3a762] [&_a]:underline [&_a]:decoration-[#8f6938] [&_a]:underline-offset-2 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#8d6d3e] [&_blockquote]:bg-black/15 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_h1]:my-5 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:my-5 [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:my-4 [&_h3]:font-serif [&_h3]:text-2xl [&_h4]:my-3 [&_h4]:font-serif [&_h4]:text-xl [&_img]:my-4 [&_img]:max-h-[720px] [&_img]:max-w-full [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-7 [&_p]:my-2 [&_table]:my-4 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#60482e]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[#60482e]/45 [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-7 ${className}`}
      dangerouslySetInnerHTML={{
        __html: safeHtml,
      }}
    />
  );
}
