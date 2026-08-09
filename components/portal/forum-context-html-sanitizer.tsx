"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function htmlToPlainText(value: string): string {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(
    value,
    "text/html",
  );

  return (documentNode.body.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanForumPreviewText(root: HTMLElement) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );

  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;

    if (/<\/?[a-z][\s\S]*?>/i.test(node.data)) {
      nodes.push(node);
    }
  }

  for (const node of nodes) {
    const cleaned = htmlToPlainText(node.data);

    if (cleaned !== node.data) {
      node.data = cleaned;
    }
  }
}

export function ForumContextHtmlSanitizer() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isForum =
    pathname === "/forum" ||
    pathname.startsWith("/forum/");

  useEffect(() => {
    if (!isForum || !rootRef.current) {
      return;
    }

    const contextRoot =
      rootRef.current.parentElement;

    if (!contextRoot) {
      return;
    }

    const clean = () => {
      cleanForumPreviewText(contextRoot);
    };

    clean();

    const observer = new MutationObserver(() => {
      clean();
    });

    observer.observe(contextRoot, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [isForum, pathname]);

  if (!isForum) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="hidden"
    />
  );
}
