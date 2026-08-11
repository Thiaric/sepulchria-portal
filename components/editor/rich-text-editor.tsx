"use client";

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

  const controlled = value !== undefined;

  const initialHtml =
    legacyRichTextToHtml(
      controlled ? value ?? "" : defaultValue,
    );

  const [html, setHtml] =
    useState(initialHtml);

  const [sourceMode, setSourceMode] =
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
      const storedTextColours =
        window.localStorage.getItem(
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
        window.localStorage.getItem(
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
        window.localStorage.setItem(
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
        window.localStorage.setItem(
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

  const spellingIssues =
    useSpellingIssues(
      stripRichTextForPreview(html),
      disabled || sourceMode,
    );

  useRichTextSpellingHighlights(
    editorRef,
    spellingIssues,
    disabled || sourceMode,
  );

  const textLength = visibleLength(html);
  const fullToolbar = variant === "lore";

  return (
    <div className="relative overflow-visible border border-[#60482e]/55 bg-[#0d0907]">
      <style jsx global>{`
        ::highlight(sepulchria-spelling-error) {
          text-decoration-line: underline;
          text-decoration-style: wavy;
          text-decoration-color: #d05d52;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 2px;
        }
      `}</style>
      <div
        className="relative z-40 flex flex-wrap items-center gap-1.5 overflow-visible border-b border-[#60482e]/40 bg-[#100c09] p-2"
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

        <span className="mx-1 h-6 w-px bg-[#59432c]/45" />

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
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-2 text-[10px] text-[#cbb28a] outline-none"
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
          className="h-8 max-w-40 border border-[#59432c]/55 bg-[#17110d] px-2 text-[10px] text-[#cbb28a] outline-none"
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
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-2 text-[10px] text-[#cbb28a] outline-none"
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
    className="flex h-8 items-center gap-2 border border-[#59432c]/55 bg-[#17110d] px-2 text-[9px] uppercase tracking-[0.1em] text-[#cbb28a] transition hover:border-[#967342] hover:text-[#f1d7a5] disabled:cursor-not-allowed disabled:opacity-40"
  >
    Colour

    <span
      aria-hidden="true"
      className="text-[8px] text-[#8f7653]"
    >
      ▼
    </span>
  </button>

  {textColourOpen ? (
    <div className="absolute left-0 top-full z-[200] mt-1 w-[246px] border border-[#60482e]/70 bg-[#100c09] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
      <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[#806c52]">
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
              className="h-5 w-5 border border-[#77634b]/70 transition hover:scale-110 hover:border-[#d4b178]"
              style={{
                backgroundColor:
                  colour,
              }}
            />
          ),
        )}
      </div>

      <div className="my-3 h-px bg-[#59432c]/40" />

      <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[#806c52]">
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
                className="h-5 w-5 border border-[#77634b]/70 transition hover:scale-110 hover:border-[#d4b178]"
                style={{
                  backgroundColor:
                    colour,
                }}
              />
            ),
          )
        ) : (
          <span className="text-[9px] italic text-[#655b4e]">
            No recent colours
          </span>
        )}

        <label
          title="Choose custom colour"
          className="relative flex h-5 w-5 cursor-pointer items-center justify-center border border-dashed border-[#77634b]/70 bg-[#17110d] text-[12px] leading-none text-[#b99a70] transition hover:border-[#d4b178] hover:text-[#efd5a5]"
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
            className="flex h-8 items-center gap-2 border border-[#59432c]/55 bg-[#17110d] px-2 text-[9px] uppercase tracking-[0.1em] text-[#cbb28a] transition hover:border-[#967342] hover:text-[#f1d7a5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Highlight

            <span
              aria-hidden="true"
              className="text-[8px] text-[#8f7653]"
            >
              ▼
            </span>
          </button>

          {highlightColourOpen ? (
            <div className="absolute left-0 top-full z-[200] mt-1 w-[246px] border border-[#60482e]/70 bg-[#100c09] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
              <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[#806c52]">
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
                      className="h-5 w-5 border border-[#77634b]/70 transition hover:scale-110 hover:border-[#d4b178]"
                      style={{
                        backgroundColor:
                          colour,
                      }}
                    />
                  ),
                )}
              </div>

              <div className="my-3 h-px bg-[#59432c]/40" />

              <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[#806c52]">
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
                        className="h-5 w-5 border border-[#77634b]/70 transition hover:scale-110 hover:border-[#d4b178]"
                        style={{
                          backgroundColor:
                            colour,
                        }}
                      />
                    ),
                  )
                ) : (
                  <span className="text-[9px] italic text-[#655b4e]">
                    No recent colours
                  </span>
                )}

                <label
                  title="Choose custom highlight"
                  className="relative flex h-5 w-5 cursor-pointer items-center justify-center border border-dashed border-[#77634b]/70 bg-[#17110d] text-[12px] leading-none text-[#b99a70] transition hover:border-[#d4b178] hover:text-[#efd5a5]"
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

        <span className="mx-1 h-6 w-px bg-[#59432c]/45" />

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

        <span className="mx-1 h-6 w-px bg-[#59432c]/45" />

        <ToolbarButton
          label="Link"
          title="Insert link"
          onClick={createLink}
          disabled={disabled || sourceMode}
          wide
        />
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
            <span className="mx-1 h-6 w-px bg-[#59432c]/45" />
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
          className="block w-full resize-y bg-[#090706] px-4 py-4 font-mono text-xs leading-6 text-[#d7c4a5] outline-none"
          style={{
  minHeight,
  maxHeight:
    "calc(85dvh - clamp(56px, 8dvh, 80px) - 7rem)",
  overflowY: "auto",
}}
        />
      ) : (
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
          onMouseDown={rememberHtmlBeforePointerSelection}
          onDoubleClick={protectDoubleClickSelection}
          className="rich-wysiwyg-editor relative z-0 block w-full overflow-auto px-4 py-4 text-sm font-normal leading-7 text-[#d7c4a5] outline-none selection:bg-[#6b4b2c] selection:text-[#fff0d0] empty:before:pointer-events-none empty:before:text-[#625747] empty:before:content-[attr(data-placeholder)] [&_a]:text-[#d3a762] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#8d6d3e] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-3 [&_img]:max-h-[620px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#60482e]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[#60482e]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7"
          style={{
  minHeight,
  maxHeight:
    "calc(85dvh - clamp(56px, 8dvh, 80px) - 7rem)",
  overflowY: "auto",
}}
        />
      )}

      {name ? (
        <input
          type="hidden"
          name={name}
          value={html}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#60482e]/35 bg-[#0b0806] px-3 py-2 text-[9px] leading-4 text-[#756958]">
        <span>
          Paste formatted content directly. Fonts, 8–24px text sizes, colours, links, lists and web images are retained. Misspellings are marked with a red wavy underline.
        </span>
        <span>
          {textLength.toLocaleString("en-GB")} / {maxTextLength.toLocaleString("en-GB")}
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
      className={`items-center justify-center overflow-hidden border border-[#59432c]/55 bg-[#17110d] px-2 text-[10px] text-[#cbb28a] transition hover:border-[#967342] hover:text-[#f1d7a5] disabled:cursor-not-allowed disabled:opacity-40 ${
        wide ? "min-w-12" : "min-w-8"
      } ${italic ? "italic" : ""} ${
        underline ? "underline" : ""
      } ${strike ? "line-through" : ""}`}
    >
      {label}
    </button>
  );
}