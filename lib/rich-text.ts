const SAFE_RICH_TAGS =
  new Set([
    "b",
    "i",
    "u",
    "s",
    "quote",
    "h2",
    "h3",
    "center",
    "list",
  ]);

export function isSafeRichHttpUrl(
  value: string,
): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function validateRichText(
  body: string,
  {
    maxImages = 8,
    maxLinks = 20,
  }: {
    maxImages?: number;
    maxLinks?: number;
  } = {},
): string | null {
  const imageMatches = [
    ...body.matchAll(
      /\[img(?:=[^\]]*)?\]([\s\S]*?)\[\/img\]/gi,
    ),
  ];

  if (imageMatches.length > maxImages) {
    return `You may include a maximum of ${maxImages} inline images.`;
  }

  for (const match of imageMatches) {
    if (!isSafeRichHttpUrl(match[1] ?? "")) {
      return "Every inline image must use a valid HTTP or HTTPS URL.";
    }
  }

  const linkMatches = [
    ...body.matchAll(
      /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
    ),
  ];

  if (linkMatches.length > maxLinks) {
    return `You may include a maximum of ${maxLinks} links.`;
  }

  for (const match of linkMatches) {
    if (!isSafeRichHttpUrl(match[1] ?? "")) {
      return "Every link must use a valid HTTP or HTTPS URL.";
    }
  }

  return null;
}
