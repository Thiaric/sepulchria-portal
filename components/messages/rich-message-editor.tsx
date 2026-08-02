"use client";

import {
  useRef,
  useState,
} from "react";

import type { PrivateMessageMode } from "@/types/messages";

type RichMessageEditorProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  mode: PrivateMessageMode;
  placeholder: string;
};

type WrapDefinition = {
  label: string;
  title: string;
  before: string;
  after: string;
};

const WRAPS: WrapDefinition[] = [
  {
    label: "B",
    title: "Bold",
    before: "[b]",
    after: "[/b]",
  },
  {
    label: "I",
    title: "Italic",
    before: "[i]",
    after: "[/i]",
  },
  {
    label: "U",
    title: "Underline",
    before: "[u]",
    after: "[/u]",
  },
  {
    label: "S",
    title: "Strikethrough",
    before: "[s]",
    after: "[/s]",
  },
  {
    label: "❝",
    title: "Quote",
    before: "[quote]",
    after: "[/quote]",
  },
];

export function RichMessageEditor({
  value,
  onChange,
  maxLength,
  mode,
  placeholder,
}: RichMessageEditorProps) {
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

  const insertText = (
    before: string,
    after = "",
    fallback = "",
  ) => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const start =
      textarea.selectionStart;
    const end =
      textarea.selectionEnd;

    const selected =
      value.slice(start, end) ||
      fallback;

    const nextValue =
      value.slice(0, start) +
      before +
      selected +
      after +
      value.slice(end);

    if (
      nextValue.length >
      maxLength
    ) {
      return;
    }

    onChange(nextValue);

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
  };

  const insertLink = () => {
    const url = linkUrl.trim();

    if (!url) {
      return;
    }

    const label =
      linkLabel.trim() || url;

    insertText(
      `[url=${url}]`,
      "[/url]",
      label,
    );

    setLinkOpen(false);
    setLinkUrl("");
    setLinkLabel("");
  };

  const insertImage = () => {
    const url = imageUrl.trim();

    if (!url) {
      return;
    }

    const alt =
      imageAlt.trim();

    const markup = alt
      ? `[img=${alt}]${url}[/img]`
      : `[img]${url}[/img]`;

    insertText(markup);

    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  };

  const ongame =
    mode === "ongame";

  return (
    <div
      className={`overflow-hidden border ${
        ongame
          ? "border-[#60482e]"
          : "border-[#555b69]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-inherit bg-[#0c0907] p-2">
        {WRAPS.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            onClick={() =>
              insertText(
                item.before,
                item.after,
                item.title === "Quote"
                  ? "Quoted text"
                  : "text",
              )
            }
            className="flex h-8 min-w-8 items-center justify-center border border-[#59432c]/55 bg-[#17110d] px-2 text-[11px] text-[#cbb28a] transition hover:border-[#967342] hover:text-[#f1d7a5]"
          >
            {item.label}
          </button>
        ))}

        <span className="mx-1 h-6 w-px bg-[#59432c]/45" />

        <button
          type="button"
          onClick={() =>
            setLinkOpen((open) =>
              !open,
            )
          }
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-3 text-[9px] uppercase tracking-[0.14em] text-[#cbb28a] transition hover:border-[#967342]"
        >
          Link
        </button>

        <button
          type="button"
          onClick={() =>
            setImageOpen((open) =>
              !open,
            )
          }
          className="h-8 border border-[#59432c]/55 bg-[#17110d] px-3 text-[9px] uppercase tracking-[0.14em] text-[#cbb28a] transition hover:border-[#967342]"
        >
          Image
        </button>
      </div>

      {linkOpen ? (
        <div className="grid gap-2 border-b border-inherit bg-[#120d0a] p-3 sm:grid-cols-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(event) =>
              setLinkUrl(
                event.target.value,
              )
            }
            placeholder="https://example.com"
            className="border border-[#59432c]/55 bg-[#0c0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#967342]"
          />

          <input
            type="text"
            value={linkLabel}
            onChange={(event) =>
              setLinkLabel(
                event.target.value,
              )
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
              onClick={() =>
                setLinkOpen(false)
              }
              className="border border-[#59432c]/55 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#9d8d78]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {imageOpen ? (
        <div className="grid gap-2 border-b border-inherit bg-[#120d0a] p-3 sm:grid-cols-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(event) =>
              setImageUrl(
                event.target.value,
              )
            }
            placeholder="https://example.com/image.jpg"
            className="border border-[#59432c]/55 bg-[#0c0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#967342]"
          />

          <input
            type="text"
            value={imageAlt}
            onChange={(event) =>
              setImageAlt(
                event.target.value,
              )
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
              onClick={() =>
                setImageOpen(false)
              }
              className="border border-[#59432c]/55 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#9d8d78]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        maxLength={maxLength}
        rows={6}
        placeholder={placeholder}
        className={`w-full resize-y bg-[#0f0c09] p-4 text-sm leading-7 outline-none placeholder:text-[#6f6251] ${
          ongame
            ? "text-[#e4d4b5]"
            : "text-[#d7dae2]"
        }`}
      />

      <div className="border-t border-inherit bg-[#0c0907] px-3 py-2 text-[9px] leading-4 text-[#756958]">
        Formatting uses safe tags:
        {" "}
        [b], [i], [u], [s],
        [quote], [url], [img].
      </div>
    </div>
  );
}
