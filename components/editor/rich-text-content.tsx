import type {
  ReactNode,
} from "react";

type RichTextContentProps = {
  body: string;
  className?: string;
};

type ContainerType =
  | "b"
  | "i"
  | "u"
  | "s"
  | "quote"
  | "h2"
  | "h3"
  | "center"
  | "list";

type Token =
  | { type: "text"; value: string }
  | { type: ContainerType; children: Token[] }
  | { type: "url"; url: string; children: Token[] }
  | { type: "img"; url: string; alt: string };

const TAG_PATTERN =
  /\[(\/?)(b|i|u|s|quote|h2|h3|center|list)\]|\[\*\]|\[url=([^\]]+)\]|\[\/url\]|\[img(?:=([^\]]*))?\]([\s\S]*?)\[\/img\]/gi;

function isSafeHttpUrl(
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

function parseRichText(
  value: string,
): Token[] {
  const root: Token[] = [];
  const stack: Array<{
    type: "root" | ContainerType | "url";
    children: Token[];
    url?: string;
  }> = [{ type: "root", children: root }];

  let cursor = 0;

  for (const match of value.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0;

    if (index > cursor) {
      stack.at(-1)?.children.push({
        type: "text",
        value: value.slice(cursor, index),
      });
    }

    const full = match[0];
    const closing = match[1] === "/";
    const simpleTag =
      match[2]?.toLowerCase() as
        | ContainerType
        | undefined;
    const linkUrl = match[3];
    const imageAlt = match[4];
    const imageUrl = match[5];

    if (full.toLowerCase() === "[*]") {
      stack.at(-1)?.children.push({
        type: "text",
        value: "\n• ",
      });
    } else if (imageUrl !== undefined) {
      const url = imageUrl.trim();

      if (isSafeHttpUrl(url)) {
        stack.at(-1)?.children.push({
          type: "img",
          url,
          alt:
            imageAlt?.trim() ||
            "Embedded image",
        });
      } else {
        stack.at(-1)?.children.push({
          type: "text",
          value: full,
        });
      }
    } else if (linkUrl !== undefined) {
      if (isSafeHttpUrl(linkUrl)) {
        stack.push({
          type: "url",
          url: linkUrl.trim(),
          children: [],
        });
      } else {
        stack.at(-1)?.children.push({
          type: "text",
          value: full,
        });
      }
    } else if (
      full.toLowerCase() === "[/url]"
    ) {
      const current = stack.at(-1);

      if (current?.type === "url") {
        stack.pop();
        stack.at(-1)?.children.push({
          type: "url",
          url: current.url ?? "",
          children: current.children,
        });
      } else {
        stack.at(-1)?.children.push({
          type: "text",
          value: full,
        });
      }
    } else if (simpleTag) {
      if (!closing) {
        stack.push({
          type: simpleTag,
          children: [],
        });
      } else {
        const current = stack.at(-1);

        if (current?.type === simpleTag) {
          stack.pop();
          stack.at(-1)?.children.push({
            type: simpleTag,
            children: current.children,
          });
        } else {
          stack.at(-1)?.children.push({
            type: "text",
            value: full,
          });
        }
      }
    }

    cursor = index + full.length;
  }

  if (cursor < value.length) {
    stack.at(-1)?.children.push({
      type: "text",
      value: value.slice(cursor),
    });
  }

  while (stack.length > 1) {
    const unclosed = stack.pop();
    if (!unclosed) break;

    const opening =
      unclosed.type === "url"
        ? `[url=${unclosed.url ?? ""}]`
        : `[${unclosed.type}]`;

    stack.at(-1)?.children.push({
      type: "text",
      value:
        opening +
        tokensToPlainText(
          unclosed.children,
        ),
    });
  }

  return root;
}

function tokensToPlainText(
  tokens: Token[],
): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        return token.value;
      }
      if (token.type === "img") {
        return token.url;
      }
      return tokensToPlainText(
        token.children,
      );
    })
    .join("");
}

function renderText(
  value: string,
  key: string,
): ReactNode {
  const lines = value.split("\n");

  return (
    <span key={key}>
      {lines.map((line, index) => (
        <span key={`${key}-${index}`}>
          {line}
          {index < lines.length - 1 ? (
            <br />
          ) : null}
        </span>
      ))}
    </span>
  );
}

function renderTokens(
  tokens: Token[],
  prefix: string,
): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${prefix}-${index}`;

    if (token.type === "text") {
      return renderText(token.value, key);
    }

    if (token.type === "img") {
      return (
        <a
          key={key}
          href={token.url}
          target="_blank"
          rel="noreferrer noopener"
          className="my-4 block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={token.url}
            alt={token.alt}
            loading="lazy"
            className="max-h-[620px] max-w-full border border-[#60482e]/45 object-contain"
          />
        </a>
      );
    }

    const children = renderTokens(
      token.children,
      key,
    );

    if (token.type === "b") {
      return <strong key={key}>{children}</strong>;
    }
    if (token.type === "i") {
      return <em key={key}>{children}</em>;
    }
    if (token.type === "u") {
      return (
        <span
          key={key}
          className="underline underline-offset-2"
        >
          {children}
        </span>
      );
    }
    if (token.type === "s") {
      return <s key={key}>{children}</s>;
    }
    if (token.type === "quote") {
      return (
        <blockquote
          key={key}
          className="my-4 border-l-2 border-[#8d6d3e] bg-black/15 px-4 py-3 italic text-[#ad9b80]"
        >
          {children}
        </blockquote>
      );
    }
    if (token.type === "h2") {
      return (
        <h2
          key={key}
          className="my-5 font-serif text-2xl text-[#e0c79e]"
        >
          {children}
        </h2>
      );
    }
    if (token.type === "h3") {
      return (
        <h3
          key={key}
          className="my-4 font-serif text-xl text-[#d3bb94]"
        >
          {children}
        </h3>
      );
    }
    if (token.type === "center") {
      return (
        <div key={key} className="text-center">
          {children}
        </div>
      );
    }
    if (token.type === "list") {
      return (
        <div
          key={key}
          className="my-3 whitespace-pre-line pl-4"
        >
          {children}
        </div>
      );
    }
    if (token.type === "url") {
      return (
        <a
          key={key}
          href={token.url}
          target="_blank"
          rel="noreferrer noopener"
          className="break-words text-[#d3a762] underline decoration-[#8f6938] underline-offset-2 transition hover:text-[#f1d39d]"
        >
          {children}
        </a>
      );
    }

    return null;
  });
}

export function RichTextContent({
  body,
  className = "",
}: RichTextContentProps) {
  return (
    <div
      className={`min-w-0 break-words ${className}`}
    >
      {renderTokens(
        parseRichText(body),
        "rich",
      )}
    </div>
  );
}
