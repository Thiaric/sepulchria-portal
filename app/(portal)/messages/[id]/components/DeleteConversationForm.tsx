"use client";

import {
  deleteConversationForMe,
} from "../../actions";

type DeleteConversationFormProps = {
  conversationId: string;
};

export function DeleteConversationForm({
  conversationId,
}: DeleteConversationFormProps) {
  return (
    <form
      action={
        deleteConversationForMe
      }
      onSubmit={(event) => {
        const confirmed =
          window.confirm(
            "Are you sure you want to delete this conversation? This will remove it from your private messages.",
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
        className="border border-[#7b4035] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d99b8e]"
      >
        Delete conversation
      </button>
    </form>
  );
}