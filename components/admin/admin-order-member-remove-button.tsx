"use client";

import {
  removeOrderMember,
} from "@/app/(portal)/admin/orders/membership-actions";

export function AdminOrderMemberRemoveButton({
  characterName,
}: {
  characterName: string;
}) {
  function confirmRemoval(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const confirmed =
      window.confirm(
        `Remove ${characterName} from this Order?\n\nThis will remove their current Order membership.`,
      );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      formAction={removeOrderMember}
      onClick={confirmRemoval}
      className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300"
    >
      Remove
    </button>
  );
}
