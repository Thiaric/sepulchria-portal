import { permanentRedirect } from "next/navigation";

export default function LegacyRacesPage() {
  permanentRedirect("/ancestries");
}
