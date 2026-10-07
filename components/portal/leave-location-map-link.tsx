"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type LeaveLocationMapLinkProps = {
  href: "/" | "/?map=sepulchria";
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function LeaveLocationMapLink({
  href,
  className,
  title,
  ariaLabel,
  children,
}: LeaveLocationMapLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
