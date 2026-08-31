import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sepulchria",
    short_name: "Sepulchria",
    description:
      "Sepulchria — an original fantasy play-by-chat roleplaying world.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#100c09",
    theme_color: "#100c09",
    categories: ["games", "entertainment", "social"],
    icons: [
      {
        src: "/icons/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Enter Sepulchria",
        short_name: "Enter",
        url: "/",
      },
      {
        name: "Location Chat",
        short_name: "Play",
        url: "/game",
      },
      {
        name: "Messages",
        short_name: "Messages",
        url: "/messages",
      },
    ],
  };
}
