"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type PortalModalPayload = {
  label: string;
  title: string;
  icon: string;
  href: string;
};

export function openPortalModal(payload: PortalModalPayload) {
  window.dispatchEvent(
    new CustomEvent("sepulchria:open-public-modal", { detail: payload }),
  );
}

export function PortalModalButton({ payload, children, ...props }: {
  payload: PortalModalPayload;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) openPortalModal(payload);
      }}
    >
      {children}
    </button>
  );
}
