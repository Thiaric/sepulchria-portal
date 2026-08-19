import { redirect } from "next/navigation";

export default function LegacyPrivateLocationPage() {
  redirect("/private-locations");
}
