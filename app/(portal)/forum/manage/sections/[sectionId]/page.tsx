import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    sectionId: string;
  }>;
};

export default async function LegacyEditForumSectionPage({
  params,
}: Props) {
  const { sectionId } = await params;

  redirect(
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}`,
  );
}
