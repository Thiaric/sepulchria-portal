import "server-only";

import sanitizeHtml from "sanitize-html";

import {
  legacyRichTextToHtml,
  stripRichTextForPreview,
} from "@/lib/rich-text-shared";

const SAFE_COLOUR = /^(?:#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)|[a-z]{1,30})$/i;

/*
 * Inline user-selected font sizes are deliberately constrained to 8–24px.
 * This also prevents oversized formatting pasted from external sites.
 */
const SAFE_SIZE = /^(?:[89]|1[0-9]|2[0-4])px$/i;

const SAFE_SPACING = /^(?:0|[0-9]{1,3}(?:\.[0-9]+)?(?:px|pt|em|rem|%))$/i;
const SAFE_FONT = /^[a-z0-9 ,'"\-]{1,160}$/i;
const SAFE_WEIGHT = /^(?:normal|bold|bolder|lighter|[1-9]00)$/i;
const SAFE_LINE_HEIGHT = /^(?:normal|[0-9]{1,2}(?:\.[0-9]+)?(?:px|pt|em|rem|%)?)$/i;
const SAFE_DECORATION = /^[a-z\- ]{1,80}$/i;

const LEGACY_FONT_SIZE_TO_PX: Record<string, string> = {
  "1": "8px",
  "2": "10px",
  "3": "14px",
  "4": "16px",
  "5": "18px",
  "6": "21px",
  "7": "24px",
};

export function sanitizeRichHtml(
  value: string,
): string {
  const source = legacyRichTextToHtml(
    value.trim(),
  );

  if (!source) {
    return "";
  }

  return sanitizeHtml(source, {
    allowedTags: [
      "p",
      "br",
      "div",
      "span",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "sub",
      "sup",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "hr",
      "font",
      "pre",
      "code",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "td",
      "th",
    ],
    allowedAttributes: {
      "*": ["style", "title"],
      a: ["href", "target", "rel", "title"],
      img: [
        "src",
        "alt",
        "title",
        "width",
        "height",
        "style",
      ],
      font: ["face", "size", "color", "style"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      a: ["http", "https", "mailto"],
    },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        color: [SAFE_COLOUR],
        "background-color": [SAFE_COLOUR],
        "font-family": [SAFE_FONT],
        "font-size": [SAFE_SIZE],
        "font-weight": [SAFE_WEIGHT],
        "font-style": [/^(?:normal|italic|oblique)$/i],
        "text-decoration": [SAFE_DECORATION],
        "text-align": [/^(?:left|right|center|justify|start|end)$/i],
        "line-height": [SAFE_LINE_HEIGHT],
        "letter-spacing": [SAFE_SPACING],
        "text-indent": [SAFE_SPACING],
        "margin-left": [SAFE_SPACING],
        "margin-right": [SAFE_SPACING],
        "margin-top": [SAFE_SPACING],
        "margin-bottom": [SAFE_SPACING],
        "padding-left": [SAFE_SPACING],
        "padding-right": [SAFE_SPACING],
        "vertical-align": [/^(?:baseline|sub|super|top|text-top|middle|bottom|text-bottom|[+-]?[0-9]{1,3}(?:px|pt|em|rem|%))$/i],
        "white-space": [/^(?:normal|pre|pre-wrap|pre-line|nowrap)$/i],
        width: [/^(?:auto|[0-9]{1,4}(?:px|pt|em|rem|%))$/i],
        height: [/^(?:auto|[0-9]{1,4}(?:px|pt|em|rem|%))$/i],
      },
    },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank"
            ? { rel: "noreferrer noopener" }
            : {}),
        },
      }),

      /*
       * Existing content created by the old 1–7 font-size toolbar is
       * normalised into the new 8–24px system when it is saved again.
       */
      font: (_tagName, attribs) => {
        const legacySize =
          attribs.size
            ? LEGACY_FONT_SIZE_TO_PX[
                attribs.size
              ]
            : undefined;

        const {
          size: _legacySize,
          ...remainingAttributes
        } = attribs;

        const styles = [
          remainingAttributes.style,
          legacySize
            ? `font-size:${legacySize}`
            : "",
        ]
          .filter(Boolean)
          .join(";");

        return {
          tagName: "font",
          attribs: {
            ...remainingAttributes,
            ...(styles
              ? { style: styles }
              : {}),
          },
        };
      },
    },
    disallowedTagsMode: "discard",
    nonTextTags: [
      "style",
      "script",
      "textarea",
      "option",
      "noscript",
    ],
  }).trim();
}

export function richTextToPlainText(
  value: string,
): string {
  return stripRichTextForPreview(
    sanitizeRichHtml(value),
  );
}

export function hasVisibleRichText(
  value: string,
): boolean {
  return richTextToPlainText(value).length > 0;
}
