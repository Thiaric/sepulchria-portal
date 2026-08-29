"use client";

import {
  deleteConversationForMe,
} from "../../actions";

type DeleteConversationFormProps = {
  conversationId: string;
  isGroup?: boolean;
};

export function DeleteConversationForm({
  conversationId,
  isGroup = false,
}: DeleteConversationFormProps) {
  return (
    <form
      action={
        deleteConversationForMe
      }
      onSubmit={(event) => {
        const confirmed =
          window.confirm(
            isGroup
              ? "Are you sure you want to leave this group conversation? You will stop receiving new messages and notifications from this group, and you will not be able to reopen its history."
              : "Are you sure you want to delete this conversation? This will remove it from your private messages.",
          );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input
        type="hidden"
        name="conversationId"
        value={conversationId}
      />

      <button
        type="submit"
        className="border border-red-800/80 bg-red-950/45 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-600 hover:bg-red-950/70 hover:text-red-200"
      >
        {isGroup
          ? "Leave conversation"
          : "Delete conversation"}
      </button>
    </form>
  );
}