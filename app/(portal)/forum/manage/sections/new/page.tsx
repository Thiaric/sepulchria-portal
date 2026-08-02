import { redirect } from "next/navigation";

export default function LegacyNewForumSectionPage() {
  redirect("/admin/forum/sections/new");
}
