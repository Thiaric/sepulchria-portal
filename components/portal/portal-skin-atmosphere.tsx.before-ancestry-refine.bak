"use client";

import { useEffect, useMemo, useState } from "react";

type PortalSkinAtmosphereProps = {
  skin: string;
};

const FLOATERS = [
  { left: 4, delay: 0.2, duration: 14, size: 2, drift: -14 },
  { left: 11, delay: 4.8, duration: 17, size: 3, drift: 16 },
  { left: 19, delay: 8.1, duration: 18, size: 2, drift: -10 },
  { left: 28, delay: 2.6, duration: 20, size: 2, drift: 12 },
  { left: 38, delay: 11.3, duration: 21, size: 3, drift: -17 },
  { left: 49, delay: 6.2, duration: 16, size: 2, drift: 9 },
  { left: 60, delay: 1.7, duration: 22, size: 2, drift: -11 },
  { left: 70, delay: 9.6, duration: 19, size: 3, drift: 15 },
  { left: 81, delay: 4.0, duration: 20, size: 2, drift: -9 },
  { left: 92, delay: 12.4, duration: 18, size: 2, drift: 11 },
] as const;

const STARS = [
  { left: 7, top: 15, delay: 0.3, duration: 5.5, size: 1 },
  { left: 16, top: 38, delay: 2.1, duration: 7.4, size: 2 },
  { left: 26, top: 21, delay: 4.9, duration: 6.2, size: 1 },
  { left: 39, top: 63, delay: 1.6, duration: 8.1, size: 1 },
  { left: 53, top: 18, delay: 5.8, duration: 6.7, size: 2 },
  { left: 64, top: 48, delay: 3.3, duration: 7.8, size: 1 },
  { left: 77, top: 28, delay: 6.4, duration: 5.9, size: 1 },
  { left: 89, top: 69, delay: 2.8, duration: 8.5, size: 2 },
  { left: 95, top: 11, delay: 7.2, duration: 6.4, size: 1 },
] as const;

const WRITING = [
  { text: "Sepulchria", top: 13, side: "left", delay: 1 },
  { text: "The First", top: 47, side: "right", delay: 8 },
  { text: "Aureth", top: 73, side: "left", delay: 15 },
] as const;

function kindForSkin(skin: string) {
  const value = skin.toLowerCase().trim();

  if (value === "starfall") return "starfall";
  if (value === "vellum") return "vellum";
  if (value === "rose-nocturne") return "rose";
  if (value === "ashen") return "ashen";
  if (value === "deepwater") return "water";
  if (value === "emberforge") return "ember";
  if (value === "amethyst-veil") return "amethyst";
  if (value === "verdant-reliquary") return "verdant";
  if (value === "blood-court") return "blood";
  if (value === "ivory-archive") return "ivory";
  if (value === "moonlit") return "moonlit";
  if (value === "aelari-dawn") return "starfall";
  if (value === "dwarven-deep") return "ashen";
  if (value === "mortal-hearth") return "ember";
  if (value === "wolfs-moon") return "moonlit";

  return "sepulchria";
}

export function PortalSkinAtmosphere({
  skin,
}: PortalSkinAtmosphereProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const kind = useMemo(() => kindForSkin(skin), [skin]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (reducedMotion) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="portal-skin-atmosphere"
        data-atmosphere={kind}
      >
        {(kind === "sepulchria" ||
          kind === "ember" ||
          kind === "ashen" ||
          kind === "blood") &&
          FLOATERS.map((particle, index) => (
            <span
              key={`${kind}-${index}`}
              className="portal-skin-float"
              style={{
                left: `${particle.left}%`,
                width: particle.size,
                height: particle.size,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                ["--portal-drift" as string]: `${particle.drift}px`,
              }}
            />
          ))}

        {kind === "starfall" &&
          STARS.map((star, index) => (
            <span
              key={index}
              className="portal-star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}

        {kind === "starfall" ? <span className="portal-shooting-star" /> : null}

        {kind === "vellum" &&
          WRITING.map((item, index) => (
            <span
              key={index}
              className={`portal-ink-writing portal-ink-${item.side}`}
              style={{
                top: `${item.top}%`,
                animationDelay: `${item.delay}s`,
              }}
            >
              {item.text}
            </span>
          ))}

        {kind === "rose" ? (
          <>
            <span className="portal-vine portal-vine-left" />
            <span className="portal-vine portal-vine-right" />
            <span className="portal-petal portal-petal-one" />
            <span className="portal-petal portal-petal-two" />
            <span className="portal-petal portal-petal-three" />
          </>
        ) : null}

        {kind === "water" ? (
          <>
            <span className="portal-water-reflection portal-water-a" />
            <span className="portal-water-reflection portal-water-b" />
          </>
        ) : null}

        {kind === "amethyst" ? (
          <>
            <span className="portal-amethyst portal-amethyst-one" />
            <span className="portal-amethyst portal-amethyst-two" />
            <span className="portal-amethyst portal-amethyst-three" />
          </>
        ) : null}

        {kind === "verdant" &&
          STARS.map((star, index) => (
            <span
              key={index}
              className="portal-emerald-speck"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration + 2}s`,
              }}
            />
          ))}

        {kind === "ivory" ? (
          <>
            <span className="portal-ivory-shimmer portal-ivory-top" />
            <span className="portal-ivory-shimmer portal-ivory-side" />
          </>
        ) : null}

        {kind === "moonlit" ? (
          <>
            <span className="portal-moon-glow portal-moon-glow-a" />
            <span className="portal-moon-glow portal-moon-glow-b" />
          </>
        ) : null}
      </div>

      <style jsx global>{`
        .portal-skin-atmosphere {
          position: fixed;
          inset: 0;
          z-index: 32;
          overflow: hidden;
          pointer-events: none;
        }

        .portal-skin-float {
          position: absolute;
          bottom: -12px;
          display: block;
          border-radius: 999px;
          animation-name: portal-rise;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .portal-skin-atmosphere[data-atmosphere="sepulchria"] .portal-skin-float,
        .portal-skin-atmosphere[data-atmosphere="ember"] .portal-skin-float {
          background: rgb(224 137 56);
          box-shadow: 0 0 7px rgb(224 137 56 / 0.52);
        }

        .portal-skin-atmosphere[data-atmosphere="ashen"] .portal-skin-float {
          border-radius: 40% 60% 55% 45%;
          background: rgb(153 147 139);
          box-shadow: none;
          animation-name: portal-ash-rise;
        }

        .portal-skin-atmosphere[data-atmosphere="blood"] .portal-skin-float {
          top: -12px;
          bottom: auto;
          background: rgb(118 24 30);
          box-shadow: 0 0 5px rgb(84 10 16 / 0.3);
          animation-name: portal-blood-fall;
        }

        .portal-star {
          position: absolute;
          display: block;
          border-radius: 999px;
          background: rgb(240 245 255);
          box-shadow: 0 0 5px rgb(205 220 255 / 0.7), 0 0 12px rgb(160 188 255 / 0.28);
          animation: portal-twinkle ease-in-out infinite;
        }

        .portal-shooting-star {
          position: absolute;
          top: 13%;
          left: 78%;
          width: 70px;
          height: 1px;
          transform: rotate(-28deg);
          transform-origin: right center;
          background: linear-gradient(to left, rgb(235 243 255 / 0.9), transparent);
          opacity: 0;
          animation: portal-shoot 34s ease-in-out infinite;
        }

        .portal-ink-writing {
          position: absolute;
          max-width: 150px;
          overflow: hidden;
          white-space: nowrap;
          color: rgb(66 49 35 / 0.34);
          font-family: "Times New Roman", Georgia, serif;
          font-size: 17px;
          font-style: italic;
          letter-spacing: 0.05em;
          clip-path: inset(0 100% 0 0);
          opacity: 0;
          animation: portal-write 22s ease-in-out infinite;
        }

        .portal-ink-left { left: 18px; transform: rotate(-4deg); }
        .portal-ink-right { right: 18px; transform: rotate(3deg); }

        .portal-vine {
          position: absolute;
          top: 6%;
          bottom: 6%;
          width: 34px;
          opacity: 0.25;
          background:
            radial-gradient(circle at 50% 11%, rgb(111 62 77 / 0.75) 0 3px, transparent 4px),
            radial-gradient(circle at 30% 26%, rgb(80 93 57 / 0.8) 0 4px, transparent 5px),
            radial-gradient(circle at 70% 42%, rgb(111 62 77 / 0.6) 0 3px, transparent 4px),
            radial-gradient(circle at 30% 62%, rgb(80 93 57 / 0.8) 0 4px, transparent 5px),
            radial-gradient(circle at 68% 79%, rgb(111 62 77 / 0.65) 0 3px, transparent 4px),
            linear-gradient(90deg, transparent 47%, rgb(75 89 51 / 0.65) 48% 52%, transparent 53%);
          background-size: 34px 150px;
          animation: portal-vine-breathe 18s ease-in-out infinite alternate;
        }

        .portal-vine-left { left: 0; }
        .portal-vine-right { right: 0; transform: scaleX(-1); }

        .portal-petal {
          position: absolute;
          top: -20px;
          width: 6px;
          height: 9px;
          border-radius: 70% 30% 70% 30%;
          background: rgb(157 79 102 / 0.42);
          animation: portal-petal-fall 24s linear infinite;
        }

        .portal-petal-one { left: 8%; animation-delay: 2s; }
        .portal-petal-two { left: 91%; animation-delay: 10s; }
        .portal-petal-three { left: 4%; animation-delay: 17s; }

        .portal-water-reflection {
          position: absolute;
          left: -15%;
          width: 130%;
          height: 90px;
          opacity: 0.12;
          filter: blur(10px);
          background: repeating-linear-gradient(
            100deg,
            transparent 0 28px,
            rgb(194 231 239 / 0.52) 32px 35px,
            transparent 39px 70px
          );
          animation: portal-water-shift 18s ease-in-out infinite alternate;
        }

        .portal-water-a { top: 0; }
        .portal-water-b { bottom: 0; transform: scaleY(-1); animation-delay: -8s; }

        .portal-amethyst {
          position: absolute;
          width: 28px;
          height: 28px;
          opacity: 0;
          clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
          background: linear-gradient(135deg, rgb(240 221 255 / 0.14), rgb(172 94 230 / 0.42), rgb(91 44 132 / 0.12));
          filter: drop-shadow(0 0 7px rgb(183 111 235 / 0.25));
          animation: portal-amethyst-glint 17s ease-in-out infinite;
        }

        .portal-amethyst-one { left: 5%; top: 18%; }
        .portal-amethyst-two { right: 6%; top: 52%; animation-delay: 6s; }
        .portal-amethyst-three { left: 47%; bottom: 3%; animation-delay: 11s; }

        .portal-emerald-speck {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgb(72 202 131);
          box-shadow: 0 0 7px rgb(72 202 131 / 0.48);
          animation: portal-emerald-pulse ease-in-out infinite;
        }

        .portal-ivory-shimmer {
          position: absolute;
          opacity: 0;
          background: linear-gradient(90deg, transparent, rgb(255 249 226 / 0.5), transparent);
          filter: blur(2px);
          animation: portal-ivory-sweep 20s ease-in-out infinite;
        }

        .portal-ivory-top { top: 0; left: -30%; width: 30%; height: 2px; }
        .portal-ivory-side {
          top: -30%;
          right: 0;
          width: 2px;
          height: 30%;
          background: linear-gradient(to bottom, transparent, rgb(255 249 226 / 0.45), transparent);
          animation-delay: 9s;
        }

        .portal-moon-glow {
          position: absolute;
          width: 36vw;
          height: 36vw;
          max-width: 520px;
          max-height: 520px;
          border-radius: 999px;
          filter: blur(58px);
          background: radial-gradient(circle, rgb(185 208 237 / 0.12), rgb(185 208 237 / 0.04) 45%, transparent 72%);
          animation: portal-moon-breathe 16s ease-in-out infinite alternate;
        }

        .portal-moon-glow-a { top: -18%; left: -12%; }
        .portal-moon-glow-b { right: -14%; bottom: -22%; animation-delay: -8s; }

        @keyframes portal-rise {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          15% { opacity: 0.27; }
          82% { opacity: 0.16; }
          100% { transform: translate3d(var(--portal-drift, 0px), -108vh, 0); opacity: 0; }
        }

        @keyframes portal-ash-rise {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.22; }
          55% { transform: translate3d(calc(var(--portal-drift, 0px) * -0.6), -55vh, 0) rotate(190deg); }
          100% { transform: translate3d(var(--portal-drift, 0px), -108vh, 0) rotate(420deg); opacity: 0; }
        }

        @keyframes portal-blood-fall {
          0% { transform: translate3d(0, -8px, 0); opacity: 0; }
          15% { opacity: 0.24; }
          84% { opacity: 0.13; }
          100% { transform: translate3d(var(--portal-drift, 0px), 108vh, 0); opacity: 0; }
        }

        @keyframes portal-twinkle {
          0%, 100% { opacity: 0.08; transform: scale(0.75); }
          48% { opacity: 0.42; transform: scale(1.25); }
          54% { opacity: 0.2; transform: scale(0.9); }
          62% { opacity: 0.48; transform: scale(1.15); }
        }

        @keyframes portal-shoot {
          0%, 91%, 100% { opacity: 0; transform: translate3d(0, 0, 0) rotate(-28deg); }
          93% { opacity: 0.45; }
          96% { opacity: 0; transform: translate3d(-170px, 95px, 0) rotate(-28deg); }
        }

        @keyframes portal-write {
          0%, 6% { clip-path: inset(0 100% 0 0); opacity: 0; }
          14% { opacity: 0.28; }
          22%, 42% { clip-path: inset(0 0 0 0); opacity: 0.28; }
          58%, 100% { clip-path: inset(0 0 0 0); opacity: 0; }
        }

        @keyframes portal-vine-breathe {
          from { opacity: 0.16; transform: translateY(0); }
          to { opacity: 0.28; transform: translateY(8px); }
        }

        @keyframes portal-petal-fall {
          0% { transform: translate3d(0, -15px, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.24; }
          100% { transform: translate3d(24px, 105vh, 0) rotate(320deg); opacity: 0; }
        }

        @keyframes portal-water-shift {
          from { transform: translate3d(-2%, 0, 0) skewX(-5deg); }
          to { transform: translate3d(4%, 0, 0) skewX(6deg); }
        }

        @keyframes portal-amethyst-glint {
          0%, 70%, 100% { opacity: 0; transform: rotate(0deg) scale(0.75); }
          77% { opacity: 0.18; transform: rotate(18deg) scale(1); }
          84% { opacity: 0.38; transform: rotate(36deg) scale(1.16); }
          91% { opacity: 0.1; transform: rotate(54deg) scale(0.9); }
        }

        @keyframes portal-emerald-pulse {
          0%, 100% { opacity: 0.05; transform: scale(0.75); }
          50% { opacity: 0.4; transform: scale(1.25); }
        }

        @keyframes portal-ivory-sweep {
          0%, 70%, 100% { opacity: 0; }
          77% { opacity: 0.26; }
          88% { opacity: 0.12; transform: translate3d(430%, 0, 0); }
        }

        @keyframes portal-moon-breathe {
          from { opacity: 0.45; transform: scale(0.94); }
          to { opacity: 0.8; transform: scale(1.06); }
        }

        @media (prefers-reduced-motion: reduce) {
          .portal-skin-atmosphere { display: none !important; }
        }
      `}</style>
    </>
  );
}
