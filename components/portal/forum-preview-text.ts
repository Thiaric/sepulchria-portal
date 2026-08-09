export function forumPreviewText(
  value: string,
  maximumLength: number,
): string {
  const normalized = value
    .replace(
      /<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/blockquote|\/h[1-6])\s*\/?>/gi,
      " ",
    )
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[*_>#\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maximumLength) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    maximumLength - 1,
  )}…`;
}
