import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./portal-themes.css";
import "@/components/sepulchria/sep-ui-unified.css";
import { CookieStorageControls } from "@/components/privacy/cookie-storage-controls";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

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

  applicationName: "Sepulchria",
  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Sepulchria",
    statusBarStyle: "black-translucent",
  },

  icons: {
    icon: [
      {
        url: "/icons/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#100c09",
};

const PORTAL_SKIN_COOKIE =
  "sepulchria:portal-skin";

function validInitialSkin(
  value: string | undefined,
): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      value,
    )
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore =
    await cookies();

  const cookieSkin =
    cookieStore.get(
      PORTAL_SKIN_COOKIE,
    )?.value;

  const initialSkin =
    validInitialSkin(cookieSkin)
      ? cookieSkin
      : "sepulchria";

  return (
    <html
      lang="en"
      data-portal-skin={initialSkin}
      className="portal-skin-scope"
      suppressHydrationWarning
    >
      <body
        data-portal-skin={initialSkin}
        className="antialiased portal-skin-scope"
      >
        <EmbeddedPortalSkinBridge />
        {children}
        <CookieStorageControls />
        <ServiceWorkerRegistration />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}