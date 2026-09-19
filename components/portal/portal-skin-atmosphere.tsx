"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type PortalSkinAtmosphereProps = {
  skin: string;
};

type AtmosphereKind =
  | "sepulchria"
  | "starfall"
  | "vellum"
  | "rose"
  | "bird-sky"
  | "water"
  | "ember"
  | "amethyst"
  | "verdant"
  | "blood"
  | "ivory"
  | "kareshi-night"
  | "aelari-dawn"
  | "dwarven-forge"
  | "mortal-hearth"
  | "pioneers-land"
  | "wolf-moon";

type VideoAtmosphereConfig = {
  type: "video";
  webm: string;
  mp4?: string;
  opacity: number;
  blendMode?: CSSProperties["mixBlendMode"];
  vignette?: "dark" | "light" | "none";
  scale?: number;
  playbackRate?: number;
};

type CanvasAtmosphereConfig = {
  type: "canvas";
  opacity: number;
  vignette?: "dark" | "light" | "none";
};

type AtmosphereConfig = VideoAtmosphereConfig | CanvasAtmosphereConfig;

const ATMOSPHERES: Record<AtmosphereKind, AtmosphereConfig> = {
  sepulchria: {
    type: "video",
    webm: "/skins/atmospheres/sepulchria.webm",
    mp4: "/skins/atmospheres/sepulchria.mp4",
    opacity: 0.03,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.03,
  },
  starfall: {
  type: "video",
  webm: "/skins/atmospheres/starfall.webm",
  mp4: "/skins/atmospheres/starfall.mp4",
  opacity: 0.07,
  blendMode: "screen",
  vignette: "dark",
  scale: 1.03,
  playbackRate: 2,
},
  vellum: {
    type: "video",
    webm: "/skins/atmospheres/vellum.webm",
    mp4: "/skins/atmospheres/vellum.mp4",
    opacity: 0.04,
    blendMode: "normal",
    vignette: "light",
    scale: 1.02,
  playbackRate: 0.4,
  },
  rose: {
    type: "video",
    webm: "/skins/atmospheres/rose-nocturne.webm",
    mp4: "/skins/atmospheres/rose-nocturne.mp4",
    opacity: 0.018,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.03,
  playbackRate: 0.45,
  },
  "bird-sky": {
  type: "video",
  webm: "/skins/atmospheres/ashen.webm",
  mp4: "/skins/atmospheres/ashen.mp4",
  opacity: 0.12,
  blendMode: "screen",
  vignette: "light",
  scale: 1.04,
  playbackRate: 0.4,
},
  water: {
    type: "video",
    webm: "/skins/atmospheres/deepwater.webm",
    mp4: "/skins/atmospheres/deepwater.mp4",
    opacity: 0.03,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.03,
  playbackRate: 0.5,
  },
  ember: {
    type: "video",
    webm: "/skins/atmospheres/emberforge.webm",
    mp4: "/skins/atmospheres/emberforge.mp4",
    opacity: 0.05,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.03,
  playbackRate: 0.5,
  },
  amethyst: {
    type: "video",
    webm: "/skins/atmospheres/amethyst-veil.webm",
    mp4: "/skins/atmospheres/amethyst-veil.mp4",
    opacity: 0.05,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.04,
  playbackRate: 0.5,
  },
  verdant: {
    type: "video",
    webm: "/skins/atmospheres/verdant-reliquary.webm",
    mp4: "/skins/atmospheres/verdant-reliquary.mp4",
    opacity: 0.03,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.04,
  playbackRate: 0.8,
  },
  blood: {
    type: "video",
    webm: "/skins/atmospheres/blood-court.webm",
    mp4: "/skins/atmospheres/blood-court.mp4",
    opacity: 0.021,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.04,
  playbackRate: 0.45,
  },
  ivory: {
    type: "video",
    webm: "/skins/atmospheres/ivory-archive.webm",
    mp4: "/skins/atmospheres/ivory-archive.mp4",
    opacity: 0.05,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.04,
  playbackRate: 0.8,
  },
  "kareshi-night": {
    type: "video",
    webm: "/skins/atmospheres/moonlit.webm",
    mp4: "/skins/atmospheres/moonlit.mp4",
    opacity: 0.07,
    blendMode: "screen",
    vignette: "dark",
    scale: 1.04,
  playbackRate: 0.5,
  },
  "aelari-dawn": {
    type: "video",
    webm: "/skins/atmospheres/aelari-dawn.webm",
    mp4: "/skins/atmospheres/aelari-dawn.mp4",
    opacity: 0.2,
    blendMode: "screen",
    vignette: "light",
    scale: 1.03,
  playbackRate: 1,
  },
  "dwarven-forge": {
  type: "video",
  webm: "/skins/atmospheres/dwarven-deep.webm",
  mp4: "/skins/atmospheres/dwarven-deep.mp4",
  opacity: 0.03,
  blendMode: "screen",
  vignette: "dark",
  scale: 1.03,
  playbackRate: 0.5,
},
  "mortal-hearth": {
    type: "video",
    webm: "/skins/atmospheres/mortal-hearth.webm",
    mp4: "/skins/atmospheres/mortal-hearth.mp4",
    opacity: 0.05,
    blendMode: "screen",
    vignette: "light",
    scale: 1.03,
  playbackRate: 0.5,
  },
  "wolf-moon": {
    type: "video",
    webm: "/skins/atmospheres/wolfs-moon.webm",
    mp4: "/skins/atmospheres/wolfs-moon.mp4",
    opacity: 0.06,
    blendMode: "screen",
    vignette: "light",
    scale: 1.03,
  playbackRate: 0.8,
  },

  "pioneers-land": {
  type: "video",
  webm: "/skins/atmospheres/pioneers-land.webm",
  mp4: "/skins/atmospheres/pioneers-land.mp4",
  opacity: 0.08,
  blendMode: "screen",
  vignette: "dark",
  scale: 1.03,  
  playbackRate: 0.65,
},
};

function kindForSkin(skin: string): AtmosphereKind {
  const value = skin.toLowerCase().trim();

  if (value === "starfall") return "starfall";
  if (value === "vellum") return "vellum";
  if (value === "rose-nocturne") return "rose";
  if (value === "ashen") return "bird-sky";
  if (value === "deepwater") return "water";
  if (value === "emberforge") return "ember";
  if (value === "amethyst-veil") return "amethyst";
  if (value === "verdant-reliquary") return "verdant";
  if (value === "blood-court") return "blood";
  if (value === "ivory-archive") return "ivory";
  if (value === "moonlit") return "kareshi-night";
  if (value === "aelari-dawn") return "aelari-dawn";
  if (value === "dwarven-deep") return "dwarven-forge";
  if (value === "mortal-hearth") return "mortal-hearth";
  if (value === "pioneers-land") return "pioneers-land";
  if (value === "wolfs-moon") return "wolf-moon";

  return "sepulchria";
}

function rgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  phase: number;
};

function createStars(count: number): Star[] {
  return Array.from({ length: count }, (_, index) => ({
    x: ((index * 53.71) % 100) / 100,
    y: ((index * 29.43 + 17) % 100) / 100,
    radius: 0.7 + ((index * 13) % 25) / 10,
    alpha: 0.18 + ((index * 17) % 50) / 100,
    speed: 0.35 + ((index * 19) % 30) / 30,
    phase: ((index * 47) % 360) * (Math.PI / 180),
  }));
}

function softGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colour: string,
  alpha: number,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(colour, alpha));
  gradient.addColorStop(0.45, rgba(colour, alpha * 0.38));
  gradient.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function StarfallCanvas({ opacity }: { opacity: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars = createStars(96);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    let startedAt = performance.now();
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pointer = (event: PointerEvent) => {
      targetMouseX = Math.max(0, Math.min(1, event.clientX / Math.max(width, 1)));
      targetMouseY = Math.max(0, Math.min(1, event.clientY / Math.max(height, 1)));
    };

    const render = (now: number) => {
      mouseX += (targetMouseX - mouseX) * 0.035;
      mouseY += (targetMouseY - mouseY) * 0.035;

      const t = (now - startedAt) / 1000;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(
        width * (0.82 + (mouseX - 0.5) * 0.025),
        height * (0.19 + (mouseY - 0.5) * 0.02),
      );
      ctx.rotate(t * 0.006);

      for (let ring = 0; ring < 3; ring += 1) {
        const radius = Math.min(width, height) * (0.115 + ring * 0.055);
        ctx.strokeStyle = rgba("#d9b86e", 0.08 + ring * 0.025);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12 + t * 0.003;
        const radius = Math.min(width, height) * (0.12 + (i % 3) * 0.032);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        ctx.fillStyle = rgba("#fff2bd", 0.26);
        ctx.beginPath();
        ctx.arc(x, y, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const x = star.x * width + (mouseX - 0.5) * star.radius * 10;
        const y = star.y * height + (mouseY - 0.5) * star.radius * 5;
        const twinkle =
          0.5 + Math.sin(t * (0.8 + star.speed) + star.phase) * 0.5;
        const alpha = star.alpha * twinkle;

        ctx.shadowBlur = star.radius * 5;
        ctx.shadowColor = rgba("#fff2bd", alpha);
        ctx.fillStyle = rgba(i % 5 === 0 ? "#fff2bd" : "#d9b86e", alpha);
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const cycle = t % 22;
      if (cycle > 17.8 && cycle < 19.7) {
        const progress = (cycle - 17.8) / 1.9;
        const x = width * (0.92 - progress * 0.58);
        const y = height * (0.11 + progress * 0.28);
        const gradient = ctx.createLinearGradient(x, y, x + 180, y - 85);
        gradient.addColorStop(0, rgba("#fff2bd", 0.75 * (1 - progress)));
        gradient.addColorStop(1, rgba("#fff2bd", 0));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 180, y - 85);
        ctx.stroke();
        softGlow(ctx, x, y, 22, "#fff2bd", 0.32 * (1 - progress));
      }

      frame = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointer, { passive: true });
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointer);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="portal-atmosphere-canvas"
      style={{ opacity }}
    />
  );
}

function PortalVideoAtmosphere({
  kind,
  config,
}: {
  kind: AtmosphereKind;
  config: VideoAtmosphereConfig;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = config.playbackRate ?? 1;
    }
  }, [config.playbackRate]);

  return (
    <video
      ref={videoRef}
      key={kind}
      className="portal-atmosphere-video"
      style={
        {
          opacity: config.opacity,
          mixBlendMode: config.blendMode ?? "screen",
          transform: `scale(${config.scale ?? 1})`,
        } as CSSProperties
      }
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      src={config.mp4 ?? config.webm}
    />
  );
}

export function PortalSkinAtmosphere({
  skin,
}: PortalSkinAtmosphereProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const kind = useMemo(() => kindForSkin(skin), [skin]);
  const config = ATMOSPHERES[kind];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (reducedMotion) return null;

  const vignette = config.vignette ?? "dark";

  return (
    <div
      aria-hidden="true"
      className="portal-atmosphere-engine"
      data-atmosphere={kind}
      data-vignette={vignette}
    >
      {config.type === "canvas" ? (
        <StarfallCanvas opacity={config.opacity} />
      ) : (
        <PortalVideoAtmosphere kind={kind} config={config} />
      )}

      <div className="portal-atmosphere-vignette" />

      <style jsx global>{`
        .portal-atmosphere-engine {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  pointer-events: none;
}

        .portal-atmosphere-video,
        .portal-atmosphere-canvas,
        .portal-atmosphere-vignette {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .portal-atmosphere-video {
          object-fit: cover;
          object-position: center;
          filter: saturate(1.05);
          will-change: transform, opacity;
        }

        .portal-atmosphere-canvas {
          opacity: 0.96;
        }

        .portal-atmosphere-vignette {
          background:
            radial-gradient(
              circle at 50% 38%,
              transparent 34%,
              rgb(0 0 0 / 0.035) 76%,
              rgb(0 0 0 / 0.1) 100%
            );
          mix-blend-mode: multiply;
        }

        .portal-atmosphere-engine[data-vignette="light"] .portal-atmosphere-vignette {
          background:
            radial-gradient(
              circle at 50% 34%,
              rgb(255 255 255 / 0.025),
              transparent 62%
            );
          mix-blend-mode: normal;
        }

        .portal-atmosphere-engine[data-vignette="none"] .portal-atmosphere-vignette {
          display: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .portal-atmosphere-engine {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
