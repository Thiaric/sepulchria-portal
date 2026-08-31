from pathlib import Path
import subprocess, struct, zlib, math

BASE = "4d4d033"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root. Expected {BASE}.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}. Expected {BASE}.")
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != BASE:
    raise SystemExit(f"Wrong baseline: HEAD is {head}, expected {BASE}.")

for path in [
    "app/manifest.ts",
    "components/pwa/service-worker-registration.tsx",
    "public/sw.js",
    "public/offline.html",
]:
    if Path(path).exists():
        raise SystemExit(f"{path} already exists. Expected clean {BASE}.")

manifest = '''import type { MetadataRoute } from "next";

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
'''

registration = '''"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const register = async () => {
      try {
        const registration =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
              updateViaCache: "none",
            },
          );

        await registration.update();
      } catch (error) {
        console.warn(
          "Sepulchria service worker registration failed:",
          error,
        );
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    window.addEventListener(
      "load",
      register,
      { once: true },
    );

    return () => {
      window.removeEventListener(
        "load",
        register,
      );
    };
  }, []);

  return null;
}
'''

service_worker = '''const CACHE = "sepulchria-pwa-v1";
const OFFLINE = "/offline.html";

const PRECACHE = [
  OFFLINE,
  "/icons/pwa/icon-192.png",
  "/icons/pwa/icon-512.png",
  "/icons/pwa/icon-maskable-512.png",
  "/icons/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("sepulchria-pwa-") &&
                key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function staticAsset(request, url) {
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return false;
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/audio/") ||
    /\\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/i.test(
      url.pathname,
    )
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE),
      ),
    );
    return;
  }

  if (!staticAsset(request, url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (
            response.ok &&
            response.type === "basic"
          ) {
            const clone = response.clone();

            caches.open(CACHE)
              .then((cache) =>
                cache.put(request, clone),
              );
          }

          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
'''

offline = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#100c09" />
  <title>Sepulchria · Offline</title>
  <style>
    :root { color-scheme: dark; background: #100c09; }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      background: radial-gradient(circle at 50% 30%, #23170f 0%, #100c09 50%, #080605 100%);
      color: #9d8d79;
      font-family: Arial, sans-serif;
    }
    main {
      width: min(560px, 100%);
      border: 1px solid #5d472f;
      background: rgba(16, 12, 9, .96);
      padding: 28px;
      text-align: center;
    }
    h1 {
      margin: 0;
      color: #d8bd8c;
      font: 400 28px Georgia, serif;
    }
    p { margin: 14px 0 0; line-height: 1.7; }
    button {
      margin-top: 22px;
      border: 1px solid #765937;
      background: #21170f;
      color: #c8ad82;
      padding: 9px 14px;
    }
  </style>
</head>
<body>
  <main>
    <h1>The Current is quiet.</h1>
    <p>Sepulchria cannot reach the network right now. Reconnect and try again.</p>
    <button onclick="window.location.reload()">Try again</button>
  </main>
</body>
</html>
'''

Path("app/manifest.ts").write_text(manifest, encoding="utf-8")
Path("components/pwa").mkdir(parents=True, exist_ok=True)
Path("components/pwa/service-worker-registration.tsx").write_text(
    registration,
    encoding="utf-8",
)
Path("public/sw.js").write_text(service_worker, encoding="utf-8")
Path("public/offline.html").write_text(offline, encoding="utf-8")

layout = read("app/layout.tsx")

layout = replace_once(
    layout,
    'import type { Metadata } from "next";',
    'import type { Metadata, Viewport } from "next";',
    "Viewport import",
)

layout = replace_once(
    layout,
    'import { CookieStorageControls } from "@/components/privacy/cookie-storage-controls";',
    'import { CookieStorageControls } from "@/components/privacy/cookie-storage-controls";\\nimport { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";',
    "Service worker import",
)

layout = replace_once(
    layout,
    '''  description:
    "Sepulchria — an original fantasy play-by-chat roleplaying world.",
};''',
    '''  description:
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
};''',
    "PWA metadata",
)

layout = replace_once(
    layout,
    '''        {children}
        <CookieStorageControls />''',
    '''        {children}
        <CookieStorageControls />
        <ServiceWorkerRegistration />''',
    "Service worker mount",
)

Path("app/layout.tsx").write_text(layout, encoding="utf-8")

def chunk(kind, data):
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(
            ">I",
            zlib.crc32(kind + data) & 0xFFFFFFFF,
        )
    )

def write_icon(path, size, maskable=False):
    bg = (16, 12, 9, 255)
    gold = (204, 164, 97, 255)
    dark = (34, 23, 15, 255)

    cx = cy = (size - 1) / 2
    radius = size * (0.30 if maskable else 0.38)
    ring = max(2.0, size * 0.025)
    rows = []

    for y in range(size):
        row = bytearray([0])

        for x in range(size):
            dx = x - cx
            dy = y - cy
            d = math.hypot(dx, dy)
            colour = bg

            if d <= radius:
                colour = dark

            if abs(d - radius) <= ring:
                colour = gold

            top = math.hypot(
                x - (cx + size * 0.035),
                y - (cy - size * 0.17),
            )
            bottom = math.hypot(
                x - (cx - size * 0.035),
                y - (cy + size * 0.17),
            )
            stroke = size * 0.075

            rune = (
                (
                    abs(top - size * 0.145) < stroke
                    and x <= cx + size * 0.09
                )
                or (
                    abs(bottom - size * 0.145) < stroke
                    and x >= cx - size * 0.09
                )
                or (
                    abs(
                        (y - cy)
                        + 0.58 * (x - cx)
                    )
                    < stroke * 0.55
                    and abs(x - cx) < size * 0.15
                    and abs(y - cy) < size * 0.12
                )
            )

            if rune:
                colour = gold

            row.extend(colour)

        rows.append(bytes(row))

    raw = b"".join(rows)
    data = zlib.compress(raw, 9)

    png = (
        b"\\x89PNG\\r\\n\\x1a\\n"
        + chunk(
            b"IHDR",
            struct.pack(
                ">IIBBBBB",
                size,
                size,
                8,
                6,
                0,
                0,
                0,
            ),
        )
        + chunk(b"IDAT", data)
        + chunk(b"IEND", b"")
    )

    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(png)

write_icon("public/icons/pwa/icon-192.png", 192)
write_icon("public/icons/pwa/icon-512.png", 512)
write_icon("public/icons/pwa/apple-touch-icon.png", 180)
write_icon(
    "public/icons/pwa/icon-maskable-512.png",
    512,
    True,
)

print("✓ app/layout.tsx")
print("✓ app/manifest.ts")
print("✓ components/pwa/service-worker-registration.tsx")
print("✓ public/sw.js")
print("✓ public/offline.html")
print("✓ generated PWA icons")
print("")
print("Sepulchria PWA phase 1 installed.")
print("No SQL and no npm install required.")
print("Run: npm run build")
