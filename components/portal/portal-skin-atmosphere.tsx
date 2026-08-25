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
  if (value === "wolfs-moon") return "wolf-moon";

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

        {(kind === "starfall" || kind === "aelari-dawn") &&
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

        {(kind === "starfall" || kind === "aelari-dawn") ? (
          <span className="portal-shooting-star" />
        ) : null}

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

        {kind === "kareshi-night" ? (
          <>
            <span className="portal-kareshi-haze portal-kareshi-haze-a" />
            <span className="portal-kareshi-haze portal-kareshi-haze-b" />
            <span className="portal-kareshi-shadow-band portal-kareshi-shadow-one" />
            <span className="portal-kareshi-shadow-band portal-kareshi-shadow-two" />
          </>
        ) : null}

        {kind === "wolf-moon" ? (
          <>
            <span className="portal-moon-glow portal-moon-glow-a" />
            <span className="portal-moon-glow portal-moon-glow-b" />
            <span className="portal-wolf-mist" />
          </>
        ) : null}

        {kind === "bird-sky" ? (
          <>
            <span className="portal-bird-sky portal-bird-sky-a" />
            <span className="portal-bird-sky portal-bird-sky-b" />
          </>
        ) : null}

        {kind === "dwarven-forge" ? (
          <>
            {FLOATERS.slice(0, 7).map((particle, index) => (
              <span
                key={`dwarven-${index}`}
                className="portal-dwarven-spark"
                style={{
                  left: `${particle.left}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${Math.max(9, particle.duration - 5)}s`,
                  ["--portal-drift" as string]: `${particle.drift}px`,
                }}
              />
            ))}
            <span className="portal-dwarven-heat" />
          </>
        ) : null}

        {kind === "mortal-hearth" &&
          FLOATERS.slice(0, 5).map((particle, index) => (
            <span
              key={`mortal-${index}`}
              className="portal-mortal-ember"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay + 2}s`,
                animationDuration: `${particle.duration + 5}s`,
                ["--portal-drift" as string]: `${particle.drift * 0.45}px`,
              }}
            />
          ))}
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

        .portal-kareshi-haze {
          position: absolute;
          left: -12%;
          width: 124%;
          height: 150px;
          pointer-events: none;
          opacity: 0.11;
          filter: blur(24px);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgb(171 124 67 / 0.23) 30%,
              rgb(105 76 43 / 0.16) 58%,
              transparent
            );
          animation:
            portal-kareshi-haze-drift
            28s ease-in-out infinite alternate;
        }

        .portal-kareshi-haze-a {
          top: 4%;
        }

        .portal-kareshi-haze-b {
          bottom: 7%;
          opacity: 0.075;
          transform: scaleX(-1);
          animation-delay: -11s;
        }

        .portal-kareshi-shadow-band {
          position: absolute;
          left: -20%;
          width: 140%;
          height: 32vh;
          min-height: 180px;
          pointer-events: none;
          opacity: 0.12;
          filter: blur(36px);
          background:
            radial-gradient(
              ellipse at center,
              rgb(0 0 0 / 0.78) 0%,
              rgb(20 15 11 / 0.46) 42%,
              transparent 72%
            );
          animation:
            portal-kareshi-shadow-drift
            34s ease-in-out infinite alternate;
        }

        .portal-kareshi-shadow-one {
          top: 18%;
          transform: translateX(-7%) rotate(-3deg);
        }

        .portal-kareshi-shadow-two {
          bottom: 10%;
          transform: translateX(8%) rotate(2deg);
          animation-delay: -17s;
        }

        @keyframes portal-kareshi-haze-drift {
          from {
            transform: translate3d(-3%, 0, 0);
          }

          to {
            transform: translate3d(4%, 8px, 0);
          }
        }

        @keyframes portal-kareshi-shadow-drift {
          from {
            margin-left: -4%;
            opacity: 0.09;
          }

          to {
            margin-left: 5%;
            opacity: 0.15;
          }
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

        .portal-bird-sky {
          position: absolute;
          left: -18%;
          width: 136%;
          height: 115px;
          opacity: .09;
          filter: blur(18px);
          background: repeating-linear-gradient(
            98deg,
            transparent 0 52px,
            rgb(209 235 249 / .38) 64px 83px,
            transparent 95px 150px
          );
          animation: portal-bird-sky-drift 32s linear infinite;
        }
        .portal-bird-sky-a { top: 8%; }
        .portal-bird-sky-b {
          bottom: 11%;
          opacity: .055;
          animation-delay: -16s;
          animation-direction: reverse;
        }
        .portal-dwarven-spark {
          position: absolute;
          bottom: -10px;
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: rgb(221 132 59);
          box-shadow: 0 0 5px rgb(221 132 59 / .72);
          animation: portal-dwarven-spark-rise linear infinite;
        }
        .portal-dwarven-heat {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 50px;
          opacity: .08;
          filter: blur(17px);
          background: linear-gradient(to top, rgb(147 69 29 / .45), transparent);
          animation: portal-dwarven-heat 8s ease-in-out infinite alternate;
        }
        .portal-mortal-ember {
          position: absolute;
          bottom: -8px;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgb(184 155 111);
          box-shadow: 0 0 4px rgb(184 155 111 / .28);
          animation: portal-mortal-ember-rise linear infinite;
        }

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

        @keyframes portal-bird-sky-drift {
          from { transform: translate3d(-4%, 0, 0); }
          to { transform: translate3d(9%, 0, 0); }
        }
        @keyframes portal-dwarven-spark-rise {
          0% { transform: translate3d(0,0,0) scale(.7); opacity: 0; }
          15% { opacity: .5; }
          72% { opacity: .2; }
          100% {
            transform: translate3d(var(--portal-drift,0px),-66vh,0) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes portal-dwarven-heat {
          from { opacity: .045; transform: scaleY(.9); }
          to { opacity: .11; transform: scaleY(1.08); }
        }
        @keyframes portal-mortal-ember-rise {
          0% { transform: translate3d(0,0,0); opacity: 0; }
          18% { opacity: .18; }
          80% { opacity: .07; }
          100% {
            transform: translate3d(var(--portal-drift,0px),-72vh,0);
            opacity: 0;
          }
        }


        /* Visibility pass for ancestry atmospheres. */

        .portal-skin-atmosphere[data-atmosphere="ivory"] .portal-ivory-shimmer {
          opacity: 0.22;
          filter: blur(1px);
          animation-duration: 12s;
        }

        .portal-skin-atmosphere[data-atmosphere="amethyst"] .portal-amethyst {
          width: 34px;
          height: 34px;
          filter: drop-shadow(0 0 10px rgb(183 111 235 / 0.42));
          animation-duration: 11s;
        }

        .portal-skin-atmosphere[data-atmosphere="bird-sky"] .portal-bird-sky {
          opacity: 0.16;
          filter: blur(14px);
        }

        .portal-skin-atmosphere[data-atmosphere="aelari-dawn"] .portal-star {
          width: 2px !important;
          height: 2px !important;
          opacity: 0.38;
          box-shadow:
            0 0 6px rgb(236 244 255 / 0.82),
            0 0 14px rgb(214 191 123 / 0.34);
        }

        .portal-skin-atmosphere[data-atmosphere="aelari-dawn"] .portal-shooting-star {
          opacity: 0;
          width: 92px;
          background: linear-gradient(
            to left,
            rgb(255 244 206 / 0.92),
            rgb(196 225 248 / 0.32),
            transparent
          );
          animation-duration: 24s;
        }

        .portal-skin-atmosphere[data-atmosphere="dwarven-forge"] .portal-dwarven-spark {
          width: 4px;
          height: 4px;
          box-shadow:
            0 0 6px rgb(225 137 65 / 0.8),
            0 0 13px rgb(157 74 31 / 0.38);
        }

        .portal-skin-atmosphere[data-atmosphere="dwarven-forge"] .portal-dwarven-heat {
          opacity: 0.15;
        }

        .portal-skin-atmosphere[data-atmosphere="mortal-hearth"] .portal-mortal-ember {
          width: 3px;
          height: 3px;
          box-shadow: 0 0 7px rgb(184 155 111 / 0.42);
        }

        .portal-skin-atmosphere[data-atmosphere="wolf-moon"] .portal-moon-glow {
          opacity: 0.7;
        }

        .portal-wolf-mist {
          position: absolute;
          left: -15%;
          right: -15%;
          bottom: 7%;
          height: 120px;
          opacity: 0.11;
          filter: blur(18px);
          background: repeating-linear-gradient(
            96deg,
            transparent 0 48px,
            rgb(204 215 220 / 0.28) 60px 80px,
            transparent 92px 145px
          );
          animation: portal-wolf-mist-drift 26s linear infinite;
        }

        @keyframes portal-wolf-mist-drift {
          from { transform: translate3d(-4%, 0, 0); }
          to { transform: translate3d(8%, 0, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .portal-skin-atmosphere { display: none !important; }
        }
      `}</style>
    </>
  );
}
