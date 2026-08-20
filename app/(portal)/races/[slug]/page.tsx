import { permanentRedirect } from "next/navigation";

export default async function LegacyRacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  permanentRedirect(
    `/ancestries/${encodeURIComponent(slug)}`,
  );
}
