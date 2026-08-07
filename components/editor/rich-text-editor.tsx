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

  const lastValidHtml =
    useRef(initialHtml);

  const htmlBeforePointerSelection =
    useRef(initialHtml);

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
      editor &&
      !sourceMode &&
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

    /*
     * Inline formatting commands such as bold/italic/underline become
     * "sticky" in contentEditable when executed with a collapsed caret:
     * the browser changes the typing state instead of formatting text.
     *
     * Only allow those commands when actual text inside THIS editor is
     * selected. This prevents the editor from randomly starting to type
     * in bold after a click/double-click or after a previous command.
     */
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
      "fontSize",
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

    /*
     * Selecting text must never mutate the document.
     * If the browser/extension/contentEditable stack changes the HTML
     * during the double-click itself, restore the exact pre-selection HTML
     * while keeping the native text selection intact whenever possible.
     */
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

  const textLength = visibleLength(html);
  const fullToolbar = variant === "lore";

  return (
    <div className="overflow-hidden border border-[#60482e]/55 bg-[#0d0907]">
      <div
        className="relative z-20 flex flex-wrap items-center gap-1.5 overflow-hidden border-b border-[#60482e]/40 bg-[#100c09] p-2"
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
            if (event.target.value) {
              runCommand(
                "fontSize",
                event.target.value,
              );
            }
            event.currentTarget.value = "";
          }}
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-2 text-[10px] text-[#cbb28a] outline-none"
        >
          <option value="">Size</option>
          <option value="1">Very small</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Larger</option>
          <option value="6">Huge</option>
          <option value="7">Largest</option>
        </select>

        <label
          title="Text colour"
          className="flex h-8 items-center gap-2 border border-[#59432c]/55 bg-[#17110d] px-2 text-[9px] uppercase tracking-[0.1em] text-[#cbb28a]"
        >
          Colour
          <input
            type="color"
            defaultValue="#d7c4a5"
            disabled={disabled || sourceMode}
            onChange={(event) =>
              runCommand(
                "foreColor",
                event.target.value,
              )
            }
            className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

        <label
          title="Highlight colour"
          className="flex h-8 items-center gap-2 border border-[#59432c]/55 bg-[#17110d] px-2 text-[9px] uppercase tracking-[0.1em] text-[#cbb28a]"
        >
          Highlight
          <input
            type="color"
            defaultValue="#3b2919"
            disabled={disabled || sourceMode}
            onChange={(event) =>
              runCommand(
                "hiliteColor",
                event.target.value,
              )
            }
            className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

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
          style={{ minHeight }}
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
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          onMouseDown={rememberHtmlBeforePointerSelection}
          onDoubleClick={protectDoubleClickSelection}
          className="rich-wysiwyg-editor relative z-0 block w-full overflow-auto px-4 py-4 text-sm font-normal leading-7 text-[#d7c4a5] outline-none selection:bg-[#6b4b2c] selection:text-[#fff0d0] empty:before:pointer-events-none empty:before:text-[#625747] empty:before:content-[attr(data-placeholder)] [&_a]:text-[#d3a762] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#8d6d3e] [&_blockquote]:pl-4 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_img]:my-3 [&_img]:max-h-[620px] [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-7 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#60482e]/45 [&_td]:p-2 [&_th]:border [&_th]:border-[#60482e]/45 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-7"
          style={{ minHeight }}
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
          Paste formatted content directly. Fonts, sizes, colours, links, lists and web images are retained.
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