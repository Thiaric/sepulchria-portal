"use client";

import {
  readPreferenceStorage,
  writePreferenceStorage,
} from "@/lib/privacy/storage-preferences";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  legacyRichTextToHtml,
  stripRichTextForPreview,
} from "@/lib/rich-text-shared";
import {
  useRichTextSpellingHighlights,
  useSpellingIssues,
  type WritingIssue,
} from "@/components/editor/writing-assistant";

type RichTextEditorProps = {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
  maxTextLength?: number;
  minHeight?: number;
  placeholder?: string;
  disabled?: boolean;
  variant?: "lore" | "forum" | "message";
};

const FONT_FAMILIES = [
  "Georgia",
  "Times New Roman",
  "Arial",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
];

const FONT_SIZES = Array.from(
  { length: 17 },
  (_, index) => index + 8,
);

const STANDARD_TEXT_COLOURS = [
  "#d64545", // red
  "#ffb029", // orange
  "#ffef40", // yellow
  "#5f9f63", // green
  "#4f7fc7", // blue
  "#8f63b8", // purple
  "#e889a9", // pink
  "#c99d5f", // brown
  "#ffffff", // white
  "#ffc415", // gold
  "#c0c0c0", // silver
] as const;

const RECENT_TEXT_COLOURS_KEY =
  "sepulchria-recent-text-colours";

const RECENT_HIGHLIGHT_COLOURS_KEY =
  "sepulchria-recent-highlight-colours";

const MAX_RECENT_TEXT_COLOURS = 10;
const MAX_RECENT_HIGHLIGHT_COLOURS = 10;
const SPELLING_DICTIONARY_KEY =
  "sepulchria-spelling-user-dictionary";

function visibleLength(value: string): number {
  return stripRichTextForPreview(value).length;
}

export function RichTextEditor({
  name,
  id,
  value,
  defaultValue = "",
  onChange,
  maxTextLength = 50_000,
  minHeight = 220,
  placeholder = "Write here...",
  disabled = false,
  variant = "lore",
}: RichTextEditorProps) {
  const editorRef =
    useRef<HTMLDivElement>(null);

  const editorWrapperRef =
    useRef<HTMLDivElement>(null);

  const [
    editorMaxHeight,
    setEditorMaxHeight,
  ] = useState<number | null>(null);

  const [
  ignoredSpellingWords,
  setIgnoredSpellingWords,
] = useState<string[]>([]);

const [
  spellingMenu,
  setSpellingMenu,
] = useState<{
  issue: WritingIssue;
  range: Range;
  x: number;
  y: number;
} | null>(null);

  const controlled = value !== undefined;

  const initialHtml =
    legacyRichTextToHtml(
      controlled ? value ?? "" : defaultValue,
    );

  const [html, setHtml] =
    useState(initialHtml);

  const [sourceMode, setSourceMode] =
    useState(false);

  const [fullscreen, setFullscreen] =
    useState(false);

  const [
    textColourOpen,
    setTextColourOpen,
  ] = useState(false);

  const [
    highlightColourOpen,
    setHighlightColourOpen,
  ] = useState(false);

  const [
    recentTextColours,
    setRecentTextColours,
  ] = useState<string[]>([]);

  const [
    recentHighlightColours,
    setRecentHighlightColours,
  ] = useState<string[]>([]);

  const savedColourSelectionRef =
    useRef<Range | null>(null);

  const lastValidHtml =
    useRef(initialHtml);

  const htmlBeforePointerSelection =
    useRef(initialHtml);

    useEffect(() => {
  try {
    const stored =
      readPreferenceStorage(
        SPELLING_DICTIONARY_KEY,
      );

    if (!stored) {
      return;
    }

    const parsed =
      JSON.parse(stored);

    if (Array.isArray(parsed)) {
      setIgnoredSpellingWords(
        parsed.filter(
          (
            value,
          ): value is string =>
            typeof value ===
            "string",
        ),
      );
    }
  } catch {
    // Ignore unavailable localStorage.
  }
}, []);

  useEffect(() => {
    try {
      const storedTextColours =
        readPreferenceStorage(
          RECENT_TEXT_COLOURS_KEY,
        );

      if (storedTextColours) {
        const parsed =
          JSON.parse(storedTextColours);

        if (Array.isArray(parsed)) {
          setRecentTextColours(
            parsed
              .filter(
                (entry):
                  entry is string =>
                  typeof entry ===
                  "string",
              )
              .slice(
                0,
                MAX_RECENT_TEXT_COLOURS,
              ),
          );
        }
      }

      const storedHighlightColours =
        readPreferenceStorage(
          RECENT_HIGHLIGHT_COLOURS_KEY,
        );

      if (storedHighlightColours) {
        const parsed =
          JSON.parse(
            storedHighlightColours,
          );

        if (Array.isArray(parsed)) {
          setRecentHighlightColours(
            parsed
              .filter(
                (entry):
                  entry is string =>
                  typeof entry ===
                  "string",
              )
              .slice(
                0,
                MAX_RECENT_HIGHLIGHT_COLOURS,
              ),
          );
        }
      }
    } catch {
      // Ignore unavailable or invalid local storage.
    }
  }, []);

  useEffect(() => {
    if (
      !textColourOpen &&
      !highlightColourOpen
    ) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key !== "Escape") {
        return;
      }

      setTextColourOpen(false);
      setHighlightColourOpen(false);

      editorRef.current?.focus();
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    textColourOpen,
    highlightColourOpen,
  ]);

  useEffect(() => {
    if (!controlled) {
      return;
    }

    const nextHtml =
      legacyRichTextToHtml(value ?? "");

    setHtml(nextHtml);
    lastValidHtml.current = nextHtml;

    const editor = editorRef.current;

    if (
      editor &&
      document.activeElement !== editor &&
      editor.innerHTML !== nextHtml
    ) {
      editor.innerHTML = nextHtml;
    }
  }, [controlled, value]);

  useEffect(() => {
  const editor = editorRef.current;

  if (
    !editor ||
    sourceMode
  ) {
    return;
  }

  /*
   * Never rewrite the DOM while the user is actively
   * editing. Doing so destroys the browser selection
   * and can send the caret back to the beginning,
   * especially after autocorrect/smart punctuation
   * changes such as apostrophes.
   */
  if (
    document.activeElement === editor
  ) {
    return;
  }

  if (
    editor.innerHTML !== html
  ) {
    editor.innerHTML = html;
  }
}, [html, sourceMode]);

  function commit(nextHtml: string) {
    if (
      visibleLength(nextHtml) >
      maxTextLength
    ) {
      const editor = editorRef.current;

      if (editor) {
        editor.innerHTML =
          lastValidHtml.current;
      }

      return;
    }

    lastValidHtml.current = nextHtml;
    setHtml(nextHtml);
    onChange?.(nextHtml);
  }

  function syncFromEditor() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    commit(editor.innerHTML);
  }

  function selectionInsideEditor() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed
    ) {
      return false;
    }

    return editor.contains(
      selection
        .getRangeAt(0)
        .commonAncestorContainer,
    );
  }

  function runCommand(
    command: string,
    commandValue?: string,
  ) {
    if (disabled || sourceMode) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const selection = window.getSelection();

    const selectionIsInsideEditor =
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(
        selection.getRangeAt(0).commonAncestorContainer,
      );

    const inlineCommands = new Set([
      "bold",
      "italic",
      "underline",
      "strikeThrough",
      "foreColor",
      "hiliteColor",
      "fontName",
      "createLink",
    ]);

    if (
      inlineCommands.has(command) &&
      (
        !selectionIsInsideEditor ||
        selection?.isCollapsed
      )
    ) {
      editor.focus();
      return;
    }

    editor.focus();

    document.execCommand(
      command,
      false,
      commandValue,
    );

    syncFromEditor();
  }

  function applyFontSize(
    size: number,
  ) {
    if (
      disabled ||
      sourceMode ||
      !Number.isInteger(size) ||
      size < 8 ||
      size > 24
    ) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (!selectionInsideEditor()) {
      editor.focus();
      return;
    }

    /*
     * execCommand's fontSize API only accepts legacy values 1–7.
     * Use a temporary size=7 wrapper, then convert ONLY the wrappers
     * created by this command into exact pixel-sized spans.
     */
    const existingLegacyFonts =
      new Set(
        Array.from(
          editor.querySelectorAll(
            'font[size="7"]',
          ),
        ),
      );

    editor.focus();

    document.execCommand(
      "fontSize",
      false,
      "7",
    );

    editor
      .querySelectorAll(
        'font[size="7"]',
      )
      .forEach((fontNode) => {
        if (
          existingLegacyFonts.has(
            fontNode,
          )
        ) {
          return;
        }

        const span =
          document.createElement(
            "span",
          );

        span.style.fontSize =
          `${size}px`;

        while (
          fontNode.firstChild
        ) {
          span.appendChild(
            fontNode.firstChild,
          );
        }

        fontNode.replaceWith(span);
      });

    syncFromEditor();
  }

  function rememberColourSelection() {
  const editor =
    editorRef.current;

  const selection =
    window.getSelection();

  if (
    !editor ||
    !selection ||
    selection.rangeCount === 0
  ) {
    savedColourSelectionRef.current =
      null;

    return;
  }

  const range =
    selection.getRangeAt(0);

  if (
    !editor.contains(
      range.commonAncestorContainer,
    )
  ) {
    savedColourSelectionRef.current =
      null;

    return;
  }

  savedColourSelectionRef.current =
    range.cloneRange();
}

function restoreColourSelection() {
  const range =
    savedColourSelectionRef.current;

  if (!range) {
    return;
  }

  const selection =
    window.getSelection();

  if (!selection) {
    return;
  }

  try {
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    savedColourSelectionRef.current =
      null;
  }
}

function rememberRecentTextColour(
  colour: string,
) {
  const normalised =
    colour.toLowerCase();

  setRecentTextColours(
    (current) => {
      const next = [
        normalised,
        ...current.filter(
          (entry) =>
            entry.toLowerCase() !==
            normalised,
        ),
      ].slice(
        0,
        MAX_RECENT_TEXT_COLOURS,
      );

      try {
        writePreferenceStorage(
          RECENT_TEXT_COLOURS_KEY,
          JSON.stringify(next),
        );
      } catch {
        // localStorage can be unavailable.
      }

      return next;
    },
  );
}

function applyTextColour(
  colour: string,
) {
  restoreColourSelection();

  runCommand(
    "foreColor",
    colour,
  );

  rememberRecentTextColour(
    colour,
  );

  setTextColourOpen(false);
}


function rememberRecentHighlightColour(
  colour: string,
) {
  const normalised =
    colour.toLowerCase();

  setRecentHighlightColours(
    (current) => {
      const next = [
        normalised,
        ...current.filter(
          (entry) =>
            entry.toLowerCase() !==
            normalised,
        ),
      ].slice(
        0,
        MAX_RECENT_HIGHLIGHT_COLOURS,
      );

      try {
        writePreferenceStorage(
          RECENT_HIGHLIGHT_COLOURS_KEY,
          JSON.stringify(next),
        );
      } catch {
        // localStorage can be unavailable.
      }

      return next;
    },
  );
}

function applyHighlightColour(
  colour: string,
) {
  restoreColourSelection();

  runCommand(
    "hiliteColor",
    colour,
  );

  rememberRecentHighlightColour(
    colour,
  );

  setHighlightColourOpen(false);
}

  function resetTextColour() {
    restoreColourSelection();
    runCommand("foreColor", "inherit");
    setTextColourOpen(false);
  }

  function resetHighlightColour() {
    restoreColourSelection();
    runCommand("hiliteColor", "transparent");
    setHighlightColourOpen(false);
  }

  function applyParagraphStyle(
    property: "lineHeight" | "marginBottom",
    value: string,
  ) {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selector = "p,div,h1,h2,h3,h4,h5,h6,blockquote,li,pre";
    editor.querySelectorAll<HTMLElement>(selector).forEach((block) => {
      try {
        if (range.intersectsNode(block)) block.style[property] = value;
      } catch {}
    });
    syncFromEditor();
    editor.focus();
  }

  function createLink() {
    const url = window.prompt(
      "Paste the destination URL:",
      "https://",
    );

    if (!url?.trim()) {
      return;
    }

    runCommand(
      "createLink",
      url.trim(),
    );
  }

  function insertImage() {
    const url = window.prompt(
      "Paste the image URL:",
      "https://",
    );

    if (!url?.trim()) {
      return;
    }

    runCommand(
      "insertImage",
      url.trim(),
    );
  }

  function rememberHtmlBeforePointerSelection() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    htmlBeforePointerSelection.current =
      editor.innerHTML;
  }

  function protectDoubleClickSelection() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const htmlBeforeSelection =
      htmlBeforePointerSelection.current;

    window.requestAnimationFrame(() => {
      if (
        editor.innerHTML !== htmlBeforeSelection
      ) {
        editor.innerHTML = htmlBeforeSelection;
        commit(htmlBeforeSelection);
      }
    });
  }

  useEffect(() => {
    const wrapper =
      editorWrapperRef.current;

    if (!wrapper) {
      return;
    }

    const portalMain =
      wrapper.closest(
        "main[data-portal-column]",
      );

    if (
      !(portalMain instanceof HTMLElement)
    ) {
      return;
    }

    const updateHeight = () => {
      const centralBodyHeight =
        portalMain.getBoundingClientRect()
          .height;

      setEditorMaxHeight(
        Math.max(
          minHeight,
          Math.floor(
            centralBodyHeight * 0.85,
          ),
        ),
      );
    };

    updateHeight();

    const observer =
      new ResizeObserver(
        updateHeight,
      );

    observer.observe(
      portalMain,
    );

    window.addEventListener(
      "resize",
      updateHeight,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        updateHeight,
      );
    };
  }, [minHeight]);

  const spellingIssues =
  useSpellingIssues(
    stripRichTextForPreview(html),
    disabled || sourceMode,
  );

const visibleSpellingIssues =
  spellingIssues.filter(
    (issue) =>
      !ignoredSpellingWords.includes(
        issue.word.toLocaleLowerCase(
          "en-GB",
        ),
      ),
  );

useRichTextSpellingHighlights(
  editorRef,
  visibleSpellingIssues,
  disabled || sourceMode,
);

function getTextRangeAtPoint(
  x: number,
  y: number,
) {
  const editor =
    editorRef.current;

  if (!editor) {
    return null;
  }

  let node: Node | null =
    null;

  let offset = 0;

  const documentWithCaret =
    document as Document & {
      caretRangeFromPoint?: (
        x: number,
        y: number,
      ) => Range | null;

      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => {
        offsetNode: Node;
        offset: number;
      } | null;
    };

  const browserRange =
    documentWithCaret
      .caretRangeFromPoint?.(
        x,
        y,
      );

  if (browserRange) {
    node =
      browserRange.startContainer;

    offset =
      browserRange.startOffset;
  } else {
    const position =
      documentWithCaret
        .caretPositionFromPoint?.(
          x,
          y,
        );

    if (position) {
      node =
        position.offsetNode;

      offset =
        position.offset;
    }
  }

  if (
    !node ||
    node.nodeType !==
      Node.TEXT_NODE ||
    !editor.contains(node)
  ) {
    return null;
  }

  const text =
    node.nodeValue ?? "";

  if (!text) {
    return null;
  }

  const isWordCharacter = (
    character: string,
  ) =>
    /[\p{L}’'-]/u.test(
      character,
    );

  let start =
    Math.min(
      offset,
      text.length,
    );

  let end = start;

  if (
    start === text.length ||
    !isWordCharacter(
      text[start] ?? "",
    )
  ) {
    start -= 1;
    end = start + 1;
  }

  if (start < 0) {
    return null;
  }

  while (
    start > 0 &&
    isWordCharacter(
      text[start - 1],
    )
  ) {
    start -= 1;
  }

  while (
    end < text.length &&
    isWordCharacter(
      text[end],
    )
  ) {
    end += 1;
  }

  const word =
    text.slice(
      start,
      end,
    );

  if (!word) {
    return null;
  }

  const range =
    document.createRange();

  range.setStart(
    node,
    start,
  );

  range.setEnd(
    node,
    end,
  );

  return {
    word,
    range,
  };
}

function getTextRangeFromSelection() {
  const editor =
    editorRef.current;

  const selection =
    window.getSelection();

  if (
    !editor ||
    !selection ||
    !selection.focusNode ||
    !editor.contains(
      selection.focusNode,
    )
  ) {
    return null;
  }

  let node =
    selection.focusNode;

  let offset =
    selection.focusOffset;

  if (
    node.nodeType !==
      Node.TEXT_NODE
  ) {
    const walker =
      document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
      );

    const firstTextNode =
      walker.nextNode();

    if (!firstTextNode) {
      return null;
    }

    node = firstTextNode;
    offset = 0;
  }

  const text =
    node.nodeValue ?? "";

  if (!text) {
    return null;
  }

  const isWordCharacter = (
    character: string,
  ) =>
    /[\p{L}’'-]/u.test(
      character,
    );

  let start =
    Math.min(
      offset,
      text.length,
    );

  if (
    start === text.length ||
    !isWordCharacter(
      text[start] ?? "",
    )
  ) {
    start -= 1;
  }

  if (
    start < 0 ||
    !isWordCharacter(
      text[start] ?? "",
    )
  ) {
    return null;
  }

  let end =
    start + 1;

  while (
    start > 0 &&
    isWordCharacter(
      text[start - 1],
    )
  ) {
    start -= 1;
  }

  while (
    end < text.length &&
    isWordCharacter(
      text[end],
    )
  ) {
    end += 1;
  }

  const word =
    text.slice(
      start,
      end,
    );

  if (!word) {
    return null;
  }

  const range =
    document.createRange();

  range.setStart(
    node,
    start,
  );

  range.setEnd(
    node,
    end,
  );

  return {
    word,
    range,
  };
}

function openSpellingMenu(
  event: React.MouseEvent<HTMLDivElement>,
) {
  if (
    disabled ||
    sourceMode
  ) {
    return false;
  }

  const result =
    getTextRangeAtPoint(
      event.clientX,
      event.clientY,
    ) ??
    getTextRangeFromSelection();

  if (!result) {
    setSpellingMenu(null);
    return false;
  }

  const issue =
    visibleSpellingIssues.find(
      (candidate) =>
        candidate.word.localeCompare(
          result.word,
          "en-GB",
          {
            sensitivity:
              "accent",
          },
        ) === 0,
    );

  if (!issue) {
    setSpellingMenu(null);
    return false;
  }

  setSpellingMenu({
    issue,
    range:
      result.range.cloneRange(),
    x: Math.max(
      12,
      Math.min(
        event.clientX,
        window.innerWidth - 280,
      ),
    ),
    y:
      event.clientY >
      window.innerHeight / 2
        ? Math.max(
            16,
            event.clientY - 320,
          )
        : Math.min(
            event.clientY + 18,
            window.innerHeight - 280,
          ),
  });

  return true;
}

function handleSpellingClick(
  event: React.MouseEvent<HTMLDivElement>,
) {
  openSpellingMenu(event);
}

function handleSpellingContextMenu(
  event: React.MouseEvent<HTMLDivElement>,
) {
  /*
   * Override the native context menu ONLY on a word that Sepulchria
   * currently recognises as a spelling issue.
   */
  if (openSpellingMenu(event)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function preserveWordCase(
  original: string,
  replacement: string,
) {
  if (
    original ===
    original.toUpperCase()
  ) {
    return replacement.toUpperCase();
  }

  if (
    original[0] ===
    original[0]?.toUpperCase()
  ) {
    return (
      replacement
        .charAt(0)
        .toUpperCase() +
      replacement.slice(1)
    );
  }

  return replacement;
}

function applySpellingSuggestion(
  suggestion: string,
) {
  if (!spellingMenu) {
    return;
  }

  const replacement =
    preserveWordCase(
      spellingMenu.issue.word,
      suggestion,
    );

  const range =
    spellingMenu.range;

  try {
    range.deleteContents();

const replacementNode =
  document.createTextNode(
    replacement,
  );

range.insertNode(
  replacementNode,
);

const selection =
  window.getSelection();

if (selection) {
  const caretRange =
    document.createRange();

  caretRange.setStartAfter(
    replacementNode,
  );

  caretRange.collapse(true);

  selection.removeAllRanges();
  selection.addRange(
    caretRange,
  );
}

syncFromEditor();
  } catch {
    // The editor changed before
    // the correction was selected.
  }

  setSpellingMenu(null);

  editorRef.current?.focus();
}

function ignoreSpellingWord() {
  if (!spellingMenu) {
    return;
  }

  const word =
    spellingMenu.issue.word
      .toLocaleLowerCase(
        "en-GB",
      );

  setIgnoredSpellingWords(
    (current) =>
      current.includes(word)
        ? current
        : [...current, word],
  );

  setSpellingMenu(null);
}

function addSpellingWordToDictionary() {
  if (!spellingMenu) {
    return;
  }

  const word =
    spellingMenu.issue.word
      .toLocaleLowerCase(
        "en-GB",
      );

  setIgnoredSpellingWords(
    (current) => {
      const next =
        current.includes(word)
          ? current
          : [...current, word];

      try {
        writePreferenceStorage(
          SPELLING_DICTIONARY_KEY,
          JSON.stringify(
            next,
          ),
        );
      } catch {
        // localStorage unavailable.
      }

      return next;
    },
  );

  setSpellingMenu(null);
}

  const textLength = visibleLength(html);
  const fullToolbar = variant === "lore";

  return (
    <div
      ref={editorWrapperRef}
      className={`relative overflow-visible border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] ${fullscreen ? "fixed inset-3 z-[9998] flex flex-col" : ""}`}
    >
      <style jsx global>{`
        ::highlight(sepulchria-spelling-error) {
  background-color: rgba(var(--sep-rgb-208-93-82),0.10);
  text-decoration-line: underline;
  text-decoration-style: wavy;
  text-decoration-color: #d05d52;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
      `}</style>
      <div
        className="sticky top-0 z-40 flex flex-wrap items-center gap-1.5 overflow-visible border-b border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-2 shadow-[0_5px_12px_rgba(var(--sep-rgb-0-0-0),0.28)]"
        style={{ isolation: "isolate" }}
      >
        <ToolbarButton
          label="B"
          title="Bold"
          onClick={() => runCommand("bold")}
          disabled={disabled || sourceMode}
        />
        <ToolbarButton
          label="I"
          title="Italic"
          onClick={() => runCommand("italic")}
          disabled={disabled || sourceMode}
          italic
        />
        <ToolbarButton
          label="U"
          title="Underline"
          onClick={() => runCommand("underline")}
          disabled={disabled || sourceMode}
          underline
        />
        <ToolbarButton
          label="S"
          title="Strikethrough"
          onClick={() => runCommand("strikeThrough")}
          disabled={disabled || sourceMode}
          strike
        />

        <span className="mx-1 h-6 w-px bg-[rgb(var(--sep-colour-59432c))]/45" />

        <select
          aria-label="Paragraph style"
          defaultValue="p"
          disabled={disabled || sourceMode}
          onChange={(event) => {
            runCommand(
              "formatBlock",
              event.target.value,
            );
            event.currentTarget.value = "p";
          }}
          className="h-8 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[10px] text-[rgb(var(--sep-colour-cbb28a))] outline-none"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Title</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="blockquote">Quote</option>
        </select>

        <select
          aria-label="Font family"
          defaultValue=""
          disabled={disabled || sourceMode}
          onChange={(event) => {
            if (event.target.value) {
              runCommand(
                "fontName",
                event.target.value,
              );
            }
            event.currentTarget.value = "";
          }}
          className="h-8 max-w-40 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[10px] text-[rgb(var(--sep-colour-cbb28a))] outline-none"
        >
          <option value="">Font</option>
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        <select
          aria-label="Font size"
          defaultValue=""
          disabled={disabled || sourceMode}
          onChange={(event) => {
            const size =
              Number.parseInt(
                event.target.value,
                10,
              );

            if (
              Number.isInteger(size)
            ) {
              applyFontSize(size);
            }

            event.currentTarget.value = "";
          }}
          className="h-8 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[10px] text-[rgb(var(--sep-colour-cbb28a))] outline-none"
        >
          <option value="">Size</option>

          {FONT_SIZES.map(
            (size) => (
              <option
                key={size}
                value={size}
              >
                {size}px
              </option>
            ),
          )}
        </select>

        <div className="relative">
  <button
    type="button"
    title="Text colour"
    disabled={
      disabled ||
      sourceMode
    }
    onMouseDown={(event) => {
      event.preventDefault();

      rememberColourSelection();
    }}
    onClick={() => {
      setHighlightColourOpen(false);

      setTextColourOpen(
        (current) =>
          !current,
      );
    }}
    className="flex h-8 items-center gap-2 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[9px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-cbb28a))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))] disabled:cursor-not-allowed disabled:opacity-40"
  >
    Colour

    <span
      aria-hidden="true"
      className="text-[8px] text-[rgb(var(--sep-colour-8f7653))]"
    >
      ▼
    </span>
  </button>

  {textColourOpen ? (
    <div className="absolute left-0 top-full z-[200] mt-1 w-[246px] border border-[rgb(var(--sep-colour-60482e))]/70 bg-[rgb(var(--sep-colour-100c09))] p-3 shadow-[0_12px_30px_rgba(var(--sep-rgb-0-0-0),0.55)]">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={resetTextColour} className="mb-3 w-full border border-[rgb(var(--sep-colour-60482e))]/70 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1.5 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-cbb28a))]">Default colour</button>

      <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806c52))]">
        Standard
      </p>

      <div className="grid grid-cols-11 gap-1.5">
        {STANDARD_TEXT_COLOURS.map(
          (colour) => (
            <button
              key={colour}
              type="button"
              title={colour}
              aria-label={`Use colour ${colour}`}
              onMouseDown={(
                event,
              ) =>
                event.preventDefault()
              }
              onClick={() =>
                applyTextColour(
                  colour,
                )
              }
              className="h-5 w-5 border border-[rgb(var(--sep-colour-77634b))]/70 transition hover:scale-110 hover:border-[rgb(var(--sep-colour-d4b178))]"
              style={{
                backgroundColor:
                  colour,
              }}
            />
          ),
        )}
      </div>

      <div className="my-3 h-px bg-[rgb(var(--sep-colour-59432c))]/40" />

      <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806c52))]">
        Recently used
      </p>

      <div className="flex min-h-5 flex-wrap items-center gap-1.5">
        {recentTextColours.length >
        0 ? (
          recentTextColours.map(
            (colour) => (
              <button
                key={colour}
                type="button"
                title={colour}
                aria-label={`Use recent colour ${colour}`}
                onMouseDown={(
                  event,
                ) =>
                  event.preventDefault()
                }
                onClick={() =>
                  applyTextColour(
                    colour,
                  )
                }
                className="h-5 w-5 border border-[rgb(var(--sep-colour-77634b))]/70 transition hover:scale-110 hover:border-[rgb(var(--sep-colour-d4b178))]"
                style={{
                  backgroundColor:
                    colour,
                }}
              />
            ),
          )
        ) : (
          <span className="text-[9px] italic text-[rgb(var(--sep-colour-655b4e))]">
            No recent colours
          </span>
        )}

        <label
          title="Choose custom colour"
          className="relative flex h-5 w-5 cursor-pointer items-center justify-center border border-dashed border-[rgb(var(--sep-colour-77634b))]/70 bg-[rgb(var(--sep-colour-17110d))] text-[12px] leading-none text-[rgb(var(--sep-colour-b99a70))] transition hover:border-[rgb(var(--sep-colour-d4b178))] hover:text-[rgb(var(--sep-colour-efd5a5))]"
          onMouseDown={() =>
            rememberColourSelection()
          }
        >
          +

          <input
            type="color"
            defaultValue="#d7c4a5"
            disabled={
              disabled ||
              sourceMode
            }
            onChange={(
              event,
            ) =>
              applyTextColour(
                event.target
                  .value,
              )
            }
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  ) : null}
</div>

        <div className="relative">
          <button
            type="button"
            title="Highlight colour"
            disabled={
              disabled ||
              sourceMode
            }
            onMouseDown={(event) => {
              event.preventDefault();

              rememberColourSelection();
            }}
            onClick={() => {
              setTextColourOpen(false);

              setHighlightColourOpen(
                (current) =>
                  !current,
              );
            }}
            className="flex h-8 items-center gap-2 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[9px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-cbb28a))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Highlight

            <span
              aria-hidden="true"
              className="text-[8px] text-[rgb(var(--sep-colour-8f7653))]"
            >
              ▼
            </span>
          </button>

          {highlightColourOpen ? (
            <div className="absolute left-0 top-full z-[200] mt-1 w-[246px] border border-[rgb(var(--sep-colour-60482e))]/70 bg-[rgb(var(--sep-colour-100c09))] p-3 shadow-[0_12px_30px_rgba(var(--sep-rgb-0-0-0),0.55)]">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={resetHighlightColour} className="mb-3 w-full border border-[rgb(var(--sep-colour-60482e))]/70 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1.5 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-cbb28a))]">No highlight</button>

              <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806c52))]">
                Standard
              </p>

              <div className="grid grid-cols-11 gap-1.5">
                {STANDARD_TEXT_COLOURS.map(
                  (colour) => (
                    <button
                      key={colour}
                      type="button"
                      title={colour}
                      aria-label={`Use highlight ${colour}`}
                      onMouseDown={(
                        event,
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        applyHighlightColour(
                          colour,
                        )
                      }
                      className="h-5 w-5 border border-[rgb(var(--sep-colour-77634b))]/70 transition hover:scale-110 hover:border-[rgb(var(--sep-colour-d4b178))]"
                      style={{
                        backgroundColor:
                          colour,
                      }}
                    />
                  ),
                )}
              </div>

              <div className="my-3 h-px bg-[rgb(var(--sep-colour-59432c))]/40" />

              <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806c52))]">
                Recently used
              </p>

              <div className="flex min-h-5 flex-wrap items-center gap-1.5">
                {recentHighlightColours.length >
                0 ? (
                  recentHighlightColours.map(
                    (colour) => (
                      <button
                        key={colour}
                        type="button"
                        title={colour}
                        aria-label={`Use recent highlight ${colour}`}
                        onMouseDown={(
                          event,
                        ) =>
                          event.preventDefault()
                        }
                        onClick={() =>
                          applyHighlightColour(
                            colour,
                          )
                        }
                        className="h-5 w-5 border border-[rgb(var(--sep-colour-77634b))]/70 transition hover:scale-110 hover:border-[rgb(var(--sep-colour-d4b178))]"
                        style={{
                          backgroundColor:
                            colour,
                        }}
                      />
                    ),
                  )
                ) : (
                  <span className="text-[9px] italic text-[rgb(var(--sep-colour-655b4e))]">
                    No recent colours
                  </span>
                )}

                <label
                  title="Choose custom highlight"
                  className="relative flex h-5 w-5 cursor-pointer items-center justify-center border border-dashed border-[rgb(var(--sep-colour-77634b))]/70 bg-[rgb(var(--sep-colour-17110d))] text-[12px] leading-none text-[rgb(var(--sep-colour-b99a70))] transition hover:border-[rgb(var(--sep-colour-d4b178))] hover:text-[rgb(var(--sep-colour-efd5a5))]"
                  onMouseDown={() =>
                    rememberColourSelection()
                  }
                >
                  +

                  <input
                    type="color"
                    defaultValue="#3b2919"
                    disabled={
                      disabled ||
                      sourceMode
                    }
                    onChange={(
                      event,
                    ) =>
                      applyHighlightColour(
                        event.target
                          .value,
                      )
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <span className="mx-1 h-6 w-px bg-[rgb(var(--sep-colour-59432c))]/45" />

        <ToolbarButton
          label="≡←"
          title="Align left"
          onClick={() => runCommand("justifyLeft")}
          disabled={disabled || sourceMode}
        />
        <ToolbarButton
          label="≡"
          title="Align centre"
          onClick={() => runCommand("justifyCenter")}
          disabled={disabled || sourceMode}
        />
        <ToolbarButton
          label="→≡"
          title="Align right"
          onClick={() => runCommand("justifyRight")}
          disabled={disabled || sourceMode}
        />
        <ToolbarButton label="≡" title="Justify" onClick={() => runCommand("justifyFull")} disabled={disabled || sourceMode} />
        <select aria-label="Line height" defaultValue="" disabled={disabled || sourceMode} onChange={(event) => { if (event.target.value) applyParagraphStyle("lineHeight", event.target.value === "default" ? "" : event.target.value); event.currentTarget.value = ""; }} className="h-8 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[10px] text-[rgb(var(--sep-colour-cbb28a))] outline-none"><option value="">Line height</option><option value="default">Default</option><option value="1">1.0</option><option value="1.15">1.15</option><option value="1.3">1.3</option><option value="1.5">1.5</option><option value="1.75">1.75</option><option value="2">2.0</option></select>
        <select aria-label="Paragraph spacing" defaultValue="" disabled={disabled || sourceMode} onChange={(event) => { if (event.target.value) applyParagraphStyle("marginBottom", event.target.value === "default" ? "" : event.target.value); event.currentTarget.value = ""; }} className="h-8 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[10px] text-[rgb(var(--sep-colour-cbb28a))] outline-none"><option value="">Paragraph spacing</option><option value="default">Default</option><option value="0">None</option><option value="0.35em">Small</option><option value="0.75em">Normal</option><option value="1.25em">Large</option><option value="2em">Extra large</option></select>
        <ToolbarButton
          label="• List"
          title="Bulleted list"
          onClick={() => runCommand("insertUnorderedList")}
          disabled={disabled || sourceMode}
          wide
        />
        <ToolbarButton
          label="1. List"
          title="Numbered list"
          onClick={() => runCommand("insertOrderedList")}
          disabled={disabled || sourceMode}
          wide
        />
        <ToolbarButton label="←" title="Outdent" onClick={() => runCommand("outdent")} disabled={disabled || sourceMode} />
        <ToolbarButton label="→" title="Indent" onClick={() => runCommand("indent")} disabled={disabled || sourceMode} />
        <ToolbarButton label="X₂" title="Subscript" onClick={() => runCommand("subscript")} disabled={disabled || sourceMode} />
        <ToolbarButton label="X²" title="Superscript" onClick={() => runCommand("superscript")} disabled={disabled || sourceMode} />

        <span className="mx-1 h-6 w-px bg-[rgb(var(--sep-colour-59432c))]/45" />

        <ToolbarButton
          label="Link"
          title="Insert link"
          onClick={createLink}
          disabled={disabled || sourceMode}
          wide
        />
        <ToolbarButton label="Unlink" title="Remove link" onClick={() => runCommand("unlink")} disabled={disabled || sourceMode} wide />
        <ToolbarButton
          label="Image"
          title="Insert image from URL"
          onClick={insertImage}
          disabled={disabled || sourceMode}
          wide
        />
        <ToolbarButton
          label="—"
          title="Horizontal line"
          onClick={() => runCommand("insertHorizontalRule")}
          disabled={disabled || sourceMode}
        />
        <ToolbarButton label={fullscreen ? "Exit Full" : "Full"} title={fullscreen ? "Exit fullscreen" : "Fullscreen editor"} onClick={() => setFullscreen((current) => !current)} disabled={disabled} wide />
        <ToolbarButton
          label="Clear"
          title="Remove formatting"
          onClick={() => runCommand("removeFormat")}
          disabled={disabled || sourceMode}
          wide
        />
        <ToolbarButton
          label="↶"
          title="Undo"
          onClick={() => runCommand("undo")}
          disabled={disabled || sourceMode}
        />
        <ToolbarButton
          label="↷"
          title="Redo"
          onClick={() => runCommand("redo")}
          disabled={disabled || sourceMode}
        />

        {fullToolbar ? (
          <>
            <span className="mx-1 h-6 w-px bg-[rgb(var(--sep-colour-59432c))]/45" />
            <ToolbarButton
              label={sourceMode ? "Visual" : "HTML"}
              title="Toggle HTML source"
              onClick={() =>
                setSourceMode((current) => !current)
              }
              disabled={disabled}
              wide
            />
          </>
        ) : null}
      </div>

      {sourceMode ? (
  <textarea
    id={id}
    value={html}
    onChange={(event) =>
      commit(event.target.value)
    }
    disabled={disabled}
    spellCheck={false}
    className="block w-full resize-none overflow-y-auto bg-[rgb(var(--sep-colour-090706))] px-4 py-4 font-mono text-xs leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none"
    style={{
      minHeight,
      maxHeight:
        editorMaxHeight ??
        undefined,
      overflowY: "auto",
    }}
  />
) : (
  <>
    <div
      ref={editorRef}
      id={id}
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder}
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      lang="en-GB"
      spellCheck
      autoCorrect="on"
      autoCapitalize="sentences"
      onInput={syncFromEditor}
      onBlur={syncFromEditor}
      onMouseDown={
        rememberHtmlBeforePointerSelection
      }
      onDoubleClick={
        protectDoubleClickSelection
      }
      onClick={
        handleSpellingClick
      }
      onContextMenu={
        handleSpellingContextMenu
      }
      className="rich-wysiwyg-editor relative z-0 block w-full overflow-auto px-4 py-4 text-sm font-normal leading-7 text-[rgb(var(--sep-colour-d7c4a5))] outline-none selection:bg-[rgb(var(--sep-colour-6b4b2c))] selection:text-[rgb(var(--sep-colour-fff0d0))] empty:before:pointer-events-none empty:before:text-[rgb(var(--sep-colour-625747))] empty:before:content-[attr(data-placeholder)] [&_a]:text-[rgb(var(--sep-colour-d3a762))] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[rgb(var(--sep-colour-8d6d3e))] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-3 [&_img]:max-h-[620px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[rgb(var(--sep-colour-60482e))]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[rgb(var(--sep-colour-60482e))]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7"
      style={{
        minHeight,
        maxHeight:
          editorMaxHeight ??
          undefined,
        overflowY: "auto",
      }}
    />

    {spellingMenu ? (
      <div
        className="fixed z-[9999] w-64 border border-[rgb(var(--sep-colour-765937))]/80 bg-[rgb(var(--sep-colour-120d0a))] p-3 shadow-[0_14px_40px_rgba(var(--sep-rgb-0-0-0),0.85)]"
        style={{
          left: spellingMenu.x,
          top: spellingMenu.y,
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
              Spelling
            </p>

            <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-dfc79c))]">
              {spellingMenu.issue.word}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSpellingMenu(null)
            }
            className="text-sm text-[rgb(var(--sep-colour-887760))] transition hover:text-[rgb(var(--sep-colour-e2c99d))]"
          >
            ×
          </button>
        </div>

        {spellingMenu.issue.suggestions
          .length > 0 ? (
          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto pr-1">
            <p className="mb-2 text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756651))]">
              Suggestions
            </p>

            {spellingMenu.issue.suggestions.map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    applySpellingSuggestion(
                      suggestion,
                    )
                  }
                  className="block w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-left font-serif text-sm text-[rgb(var(--sep-colour-d7bf96))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-241a11))] hover:text-[rgb(var(--sep-colour-f0d49d))]"
                >
                  {suggestion}
                </button>
              ),
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-827565))]">
            No replacement suggestions found.
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">
          <button
            type="button"
            onClick={
              ignoreSpellingWord
            }
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a08c70))] transition hover:border-[rgb(var(--sep-colour-87663b))] hover:text-[rgb(var(--sep-colour-d4bb91))]"
          >
            Ignore once
          </button>

          <button
            type="button"
            onClick={
              addSpellingWordToDictionary
            }
            className="border border-[rgb(var(--sep-colour-87663b))]/70 bg-[rgb(var(--sep-colour-251a10))] px-2 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3af76))] transition hover:border-[rgb(var(--sep-colour-aa8148))] hover:text-[rgb(var(--sep-colour-efd09b))]"
          >
            Add word
          </button>
        </div>
      </div>
    ) : null}
    </>
)}

{name ? (
  <input
    type="hidden"
    name={name}
    value={html}
  />
) : null}

<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-756958))]"><span>
          Paste formatted content directly. Fonts, 8–24px text sizes, colours, links, lists and web images are retained. Misspellings are marked with a red wavy underline.
        </span>
        <span>
          {stripRichTextForPreview(html).trim().split(/\s+/).filter(Boolean).length.toLocaleString("en-GB")} words · {textLength.toLocaleString("en-GB")} / {maxTextLength.toLocaleString("en-GB")} characters
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
  disabled,
  wide = false,
  italic = false,
  underline = false,
  strike = false,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled: boolean;
  wide?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) =>
        event.preventDefault()
      }
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        inset: "auto",
        top: "auto",
        right: "auto",
        bottom: "auto",
        left: "auto",
        width: "auto",
        height: "32px",
        minHeight: "32px",
        maxHeight: "32px",
        flex: "0 0 auto",
        display: "flex",
        pointerEvents: "auto",
        zIndex: 1,
      }}
      className={`items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 text-[10px] text-[rgb(var(--sep-colour-cbb28a))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))] disabled:cursor-not-allowed disabled:opacity-40 ${
        wide ? "min-w-12" : "min-w-8"
      } ${italic ? "italic" : ""} ${
        underline ? "underline" : ""
      } ${strike ? "line-through" : ""}`}
    >
      {label}
    </button>
  );
}