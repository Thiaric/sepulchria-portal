import { permanentRedirect } from "next/navigation";

export default function LegacyGiftsPage() {
  permanentRedirect("/feats");
}
