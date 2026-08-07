const HTML_TAG_PATTERN =
  /<\/?[a-z][\s\S]*?>/i;

const HTML_ENTITY_PATTERN =
  /&(?:nbsp|amp|lt|gt|quot|apos|#0*39|#\d+|#x[0-9a-f]+);/i;

export function looksLikeHtml(
  value: string,
): boolean {
  /*
   * contentEditable serialises some perfectly ordinary
   * typing (especially leading/trailing/repeated spaces)
   * as HTML entities such as &nbsp; even when there is no
   * element tag in the string yet.
   *
   * Those values are already editor HTML and MUST NOT be
   * escaped again. Escaping them repeatedly is what caused
   * strings such as:
   *
   * &amp;nbsp;&amp;amp;nbsp;...
   */
  return (
    HTML_TAG_PATTERN.test(value) ||
    HTML_ENTITY_PATTERN.test(value)
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeBasicEntities(
  value: string,
): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCodePoint(
        Number.parseInt(code, 16),
      ),
    );
}

export function legacyRichTextToHtml(
  value: string,
): string {
  if (!value) {
    return "";
  }

  if (looksLikeHtml(value)) {
    return value;
  }

  let output = escapeHtml(value);

  output = output
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
    .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, "<s>$1</s>")
    .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, "<blockquote>$1</blockquote>")
    .replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, "<h2>$1</h2>")
    .replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, "<h3>$1</h3>")
    .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>')
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$2</a>')
    .replace(/\[img(?:=[^\]]*)?\]([\s\S]*?)\[\/img\]/gi, '<img src="$1" alt="">')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?:\r\n|\r|\n)/g, "<br>");

  return output;
}

export function stripRichTextForPreview(
  value: string,
): string {
  if (!value) {
    return "";
  }

  const html = legacyRichTextToHtml(value)
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " [Image] ")
    .replace(/<[^>]+>/g, " ");

  return decodeBasicEntities(html)
    .replace(/\s+/g, " ")
    .trim();
}