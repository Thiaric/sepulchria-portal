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
        className="border border-[rgb(var(--sep-colour-7b4035))] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))]"
      >
        {isGroup
          ? "Leave conversation"
          : "Delete conversation"}
      </button>
    </form>
  );
}