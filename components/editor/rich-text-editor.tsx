"use client";

import {
  useRef,
  useState,
} from "react";

type RichTextEditorProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  variant?: "lore" | "forum" | "message";
};

type WrapDefinition = {
  label: string;
  title: string;
  before: string;
  after: string;
  fallback?: string;
  loreOnly?: boolean;
};

const WRAPS: WrapDefinition[] = [
  { label: "B", title: "Bold", before: "[b]", after: "[/b]", fallback: "text" },
  { label: "I", title: "Italic", before: "[i]", after: "[/i]", fallback: "text" },
  { label: "U", title: "Underline", before: "[u]", after: "[/u]", fallback: "text" },
  { label: "S", title: "Strikethrough", before: "[s]", after: "[/s]", fallback: "text" },
  { label: "❝", title: "Quote", before: "[quote]", after: "[/quote]", fallback: "Quoted text" },
  { label: "H2", title: "Heading", before: "[h2]", after: "[/h2]", fallback: "Heading", loreOnly: true },
  { label: "H3", title: "Subheading", before: "[h3]", after: "[/h3]", fallback: "Subheading", loreOnly: true },
  { label: "•", title: "Bulleted list", before: "[list]\n[*]", after: "\n[/list]", fallback: "List item" },
  { label: "≡", title: "Centre", before: "[center]", after: "[/center]", fallback: "text", loreOnly: true },
];

export function RichTextEditor({
  name,
  value,
  defaultValue = "",
  onChange,
  maxLength = 50_000,
  rows = 8,
  placeholder = "Write here...",
  disabled = false,
  variant = "lore",
}: RichTextEditorProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] =
    useState(defaultValue);
  const currentValue =
    controlled ? value ?? "" : internalValue;

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const [linkOpen, setLinkOpen] =
    useState(false);
  const [imageOpen, setImageOpen] =
    useState(false);
  const [linkUrl, setLinkUrl] =
    useState("");
  const [linkLabel, setLinkLabel] =
    useState("");
  const [imageUrl, setImageUrl] =
    useState("");
  const [imageAlt, setImageAlt] =
    useState("");

  function commit(nextValue: string) {
    const limited =
      nextValue.slice(0, maxLength);

    if (!controlled) {
      setInternalValue(limited);
    }

    onChange?.(limited);
  }

  function insertText(
    before: string,
    after = "",
    fallback = "",
  ) {
    const textarea =
      textareaRef.current;

    if (!textarea || disabled) {
      return;
    }

    const start =
      textarea.selectionStart;
    const end =
      textarea.selectionEnd;

    const selected =
      currentValue.slice(start, end) ||
      fallback;

    const nextValue =
      currentValue.slice(0, start) +
      before +
      selected +
      after +
      currentValue.slice(end);

    if (nextValue.length > maxLength) {
      return;
    }

    commit(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();

      const selectionStart =
        start + before.length;

      textarea.setSelectionRange(
        selectionStart,
        selectionStart +
          selected.length,
      );
    });
  }

  function insertLink() {
    const url = linkUrl.trim();

    if (!url) return;

    insertText(
      `[url=${url}]`,
      "[/url]",
      linkLabel.trim() || url,
    );

    setLinkOpen(false);
    setLinkUrl("");
    setLinkLabel("");
  }

  function insertImage() {
    const url = imageUrl.trim();

    if (!url) return;

    const alt = imageAlt.trim();

    insertText(
      alt
        ? `[img=${alt}]${url}[/img]`
        : `[img]${url}[/img]`,
    );

    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  }

  const visibleWraps =
    WRAPS.filter(
      (item) =>
        !item.loreOnly ||
        variant === "lore",
    );

  return (
    <div className="overflow-hidden border border-[#60482e]/55 bg-[#0d0907]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#60482e]/40 bg-[#100c09] p-2">
        {visibleWraps.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            disabled={disabled}
            onClick={() =>
              insertText(
                item.before,
                item.after,
                item.fallback,
              )
            }
            className="flex h-8 min-w-8 items-center justify-center border border-[#59432c]/55 bg-[#17110d] px-2 text-[10px] text-[#cbb28a] transition hover:border-[#967342] hover:text-[#f1d7a5] disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}

        <span className="mx-1 h-6 w-px bg-[#59432c]/45" />

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setLinkOpen((open) => !open)
          }
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-3 text-[9px] uppercase tracking-[0.14em] text-[#cbb28a] transition hover:border-[#967342] disabled:opacity-40"
        >
          Link
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setImageOpen((open) => !open)
          }
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-3 text-[9px] uppercase tracking-[0.14em] text-[#cbb28a] transition hover:border-[#967342] disabled:opacity-40"
        >
          Image
        </button>
      </div>

      {linkOpen ? (
        <div className="grid gap-2 border-b border-[#60482e]/40 bg-[#120d0a] p-3 sm:grid-cols-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(event) =>
              setLinkUrl(event.target.value)
            }
            placeholder="https://example.com"
            className="border border-[#59432c]/55 bg-[#0c0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#967342]"
          />
          <input
            type="text"
            value={linkLabel}
            onChange={(event) =>
              setLinkLabel(event.target.value)
            }
            placeholder="Link text (optional)"
            className="border border-[#59432c]/55 bg-[#0c0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#967342]"
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={insertLink}
              className="border border-[#967342] bg-[#3b2b1b] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#f1d7a5]"
            >
              Insert link
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="border border-[#59432c]/55 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#9d8d78]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {imageOpen ? (
        <div className="grid gap-2 border-b border-[#60482e]/40 bg-[#120d0a] p-3 sm:grid-cols-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(event) =>
              setImageUrl(event.target.value)
            }
            placeholder="https://example.com/image.jpg"
            className="border border-[#59432c]/55 bg-[#0c0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#967342]"
          />
          <input
            type="text"
            value={imageAlt}
            onChange={(event) =>
              setImageAlt(event.target.value)
            }
            placeholder="Image description (optional)"
            className="border border-[#59432c]/55 bg-[#0c0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#967342]"
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={insertImage}
              className="border border-[#967342] bg-[#3b2b1b] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#f1d7a5]"
            >
              Insert image
            </button>
            <button
              type="button"
              onClick={() => setImageOpen(false)}
              className="border border-[#59432c]/55 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#9d8d78]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={currentValue}
        onChange={(event) =>
          commit(event.target.value)
        }
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full resize-y bg-transparent px-4 py-4 text-sm leading-7 text-[#d7c4a5] outline-none placeholder:text-[#625747] disabled:opacity-50"
      />

      {name ? (
        <input
          type="hidden"
          name={name}
          value={currentValue}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#60482e]/35 bg-[#0c0907] px-3 py-2 text-[9px] leading-4 text-[#756958]">
        <span>
          Rich text: bold, italic, underline, strike, quote, lists, links and images
          {variant === "lore"
            ? ", headings and alignment"
            : ""}.
        </span>
        <span>
          {currentValue.length.toLocaleString("en-GB")} /{" "}
          {maxLength.toLocaleString("en-GB")}
        </span>
      </div>
    </div>
  );
}
