import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./portal-themes.css";
import { CookieStorageControls } from "@/components/privacy/cookie-storage-controls";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),

  title: {
    default: "Sepulchria",
    template: "%s | Sepulchria",
  },

  description:
    "Sepulchria — an original fantasy play-by-chat roleplaying world.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const SEPULCHRIA_SKIN_BOOT_SCRIPT = `
(function () {
  try {
    var preferencesRaw =
      window.localStorage.getItem(
        "sepulchria:storage-preferences:v1"
      );

    if (preferencesRaw) {
      try {
        var preferences =
          JSON.parse(preferencesRaw);

        if (
          preferences &&
          preferences.functional === false
        ) {
          return;
        }
      } catch (_) {
        // Ignore malformed preference state.
      }
    }

    var skin =
      window.localStorage.getItem(
        "sepulchria:portal-skin"
      );

    if (
      skin &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        skin
      )
    ) {
      document.documentElement.dataset.portalSkin =
        skin;

      document.documentElement.classList.add(
        "portal-skin-scope"
      );
    }
  } catch (_) {
    // Browser storage may be unavailable.
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              SEPULCHRIA_SKIN_BOOT_SCRIPT,
          }}
        />
      </head>

      <body
        className={`${geistSans.className} antialiased`}
      >
        {children}
        <CookieStorageControls />
      </body>
    </html>
  );
}