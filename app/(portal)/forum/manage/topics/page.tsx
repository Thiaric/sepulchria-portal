import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
};

export default async function LegacyForumTopicsPage({
  searchParams,
}: Props) {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(
    resolved,
  )) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }

  const query = params.toString();

  redirect(
    query
      ? `/admin/forum/topics?${query}`
      : "/admin/forum/topics",
  );
}
