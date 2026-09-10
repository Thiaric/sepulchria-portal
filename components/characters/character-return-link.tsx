"use client";

import Link from "next/link";

export function CharacterReturnLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (
          typeof window === "undefined" ||
          window.self === window.top
        ) {
          return;
        }

        event.preventDefault();

        const destination =
          new URL(
            href,
            window.location.origin,
          );

        destination.searchParams.set(
          "embedded",
          "1",
        );

        window.location.assign(
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
      }}
    >
      <span className="components_characters_character_return_link_span_text" aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
