import type { Metadata } from "next";

import { PublicCodex } from "@/components/codex/public-codex";
import { getPublicCodexChapters } from "@/lib/codex/get-codex";

export const metadata: Metadata = {
  title:
    "The Codex of the First | Sepulchria",
  description:
    "The ten chapters of the Codex of the First, the public lore record of Aureth and Sepulchria.",
};

export default async function CodexPage() {
  const chapters =
    await getPublicCodexChapters();

  return (
    <PublicCodex chapters={chapters} />
  );
}
