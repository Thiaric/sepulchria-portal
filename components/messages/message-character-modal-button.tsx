"use client";

import { useState } from "react";
import { startConversationForModal } from "@/app/(portal)/messages/actions";
import { openPortalModal } from "@/components/portal/portal-modal-button";

export function MessageCharacterModalButton({ recipientId, recipientName, className }: {
  recipientId: string;
  recipientName: string;
  className: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Send a private message to ${recipientName}`}
      title={`Message ${recipientName}`}
      className={className}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          const href = await startConversationForModal(recipientId);
          openPortalModal({
            label: `Messages — ${recipientName}`,
            title: `Private conversation with ${recipientName}`,
            icon: "/icons/messages.png",
            href,
          });
        } finally {
          setPending(false);
        }
      }}
    >
      <span aria-hidden="true">✉</span>
    </button>
  );
}
