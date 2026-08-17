import Link from "next/link";
import { cache, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";

const getCharacterPublicSlug = cache(
  async (characterId: string): Promise<string | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("characters")
      .select("public_slug")
      .eq("id", characterId)
      .maybeSingle<{ public_slug: string | null }>();

    if (error) {
      console.error(
        "Unable to load forum character public slug:",
        error.message,
      );
      return null;
    }

    return data?.public_slug?.trim() || null;
  },
);

export async function ForumCharacterLink({
  characterId,
  disabled = false,
  className,
  ariaLabel,
  children,
}: {
  characterId: string | null | undefined;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  if (disabled || !characterId) {
    return <>{children}</>;
  }

  const publicSlug = await getCharacterPublicSlug(characterId);

  if (!publicSlug) {
    return <>{children}</>;
  }

  return (
    <Link
      href={`/characters/${encodeURIComponent(publicSlug)}`}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
