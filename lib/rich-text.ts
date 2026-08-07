import "server-only";

import sanitizeHtml from "sanitize-html";

import {
  legacyRichTextToHtml,
  stripRichTextForPreview,
} from "@/lib/rich-text-shared";

const SAFE_COLOUR = /^(?:#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)|[a-z]{1,30})$/i;
const SAFE_SIZE = /^(?:[0-9]{1,3}(?:\.[0-9]+)?(?:px|pt|em|rem|%)|xx-small|x-small|small|medium|large|x-large|xx-large)$/i;
const SAFE_SPACING = /^(?:0|[0-9]{1,3}(?:\.[0-9]+)?(?:px|pt|em|rem|%))$/i;
const SAFE_FONT = /^[a-z0-9 ,'"\-]{1,160}$/i;
const SAFE_WEIGHT = /^(?:normal|bold|bolder|lighter|[1-9]00)$/i;
const SAFE_LINE_HEIGHT = /^(?:normal|[0-9]{1,2}(?:\.[0-9]+)?(?:px|pt|em|rem|%)?)$/i;
const SAFE_DECORATION = /^[a-z\- ]{1,80}$/i;

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
