"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

type SepulchriaHomepageProps = {
  enterHref: string;
  isAuthenticated: boolean;
};

const EMBERS = [
  { left: 4, delay: 0.2, duration: 10, size: 2, drift: -12 },
  { left: 9, delay: 4.2, duration: 13, size: 3, drift: 18 },
  { left: 15, delay: 1.4, duration: 11, size: 2, drift: 9 },
  { left: 21, delay: 6.8, duration: 15, size: 4, drift: -15 },
  { left: 28, delay: 3.1, duration: 12, size: 2, drift: 12 },
  { left: 34, delay: 8.6, duration: 16, size: 3, drift: -8 },
  { left: 41, delay: 2.5, duration: 14, size: 2, drift: 17 },
  { left: 47, delay: 7.3, duration: 11, size: 4, drift: -13 },
  { left: 53, delay: 0.7, duration: 17, size: 2, drift: 10 },
  { left: 59, delay: 5.5, duration: 13, size: 3, drift: -17 },
  { left: 65, delay: 2.9, duration: 15, size: 2, drift: 14 },
  { left: 71, delay: 9.2, duration: 12, size: 4, drift: -9 },
  { left: 77, delay: 1.8, duration: 16, size: 2, drift: 11 },
  { left: 83, delay: 6.1, duration: 14, size: 3, drift: -16 },
  { left: 89, delay: 3.8, duration: 11, size: 2, drift: 8 },
  { left: 95, delay: 8.1, duration: 15, size: 3, drift: -11 },
] as const;

const PRIMARY_LINKS = [
  {
    label: "Codex",
    eyebrow: "Discover",
    href: "/codex",
    symbol: "⌘",
  },
  {
    label: "Rules",
    eyebrow: "Understand",
    href: "/rules",
    symbol: "◇",
  },
  {
    label: "Register",
    eyebrow: "Begin",
    href: "/auth/sign-up",
    symbol: "✦",
  },
] as const;

const CHAPTERS = [
  {
    number: "I",
    title: "Discover the World",
    text: "Explore a city raised from divine remains, where every district carries the legacy of a fallen god.",
  },
  {
    number: "II",
    title: "Forge Your Character",
    text: "Choose your ancestry, allegiance and place within the living body of Sepulchria.",
  },
  {
    number: "III",
    title: "Shape the Story",
    text: "Enter a persistent world where choices, loyalties and consequences become part of its history.",
  },
] as const;

export function SepulchriaHomepage({
  enterHref,
  isAuthenticated,
}: SepulchriaHomepageProps) {
  const mapRef =
    useRef<HTMLDivElement | null>(null);

  const [parallax, setParallax] =
    useState({
      x: 0,
      y: 0,
    });

  const [
    reducedMotion,
    setReducedMotion,
  ] = useState(false);

  const [
    aboutOpen,
    setAboutOpen,
  ] = useState(false);

  const [
  isNight,
  setIsNight,
] = useState(false);

useEffect(() => {
  function updateTimeOfDay() {
    const londonHour =
      Number(
        new Intl.DateTimeFormat(
          "en-GB",
          {
            timeZone:
              "Europe/London",
            hour: "2-digit",
            hour12: false,
          },
        ).format(
          new Date(),
        ),
      );

    setIsNight(
      londonHour >= 20 ||
        londonHour < 5,
    );
  }

  updateTimeOfDay();

  const interval =
    window.setInterval(
      updateTimeOfDay,
      60_000,
    );

  return () => {
    window.clearInterval(
      interval,
    );
  };
}, []);

  useEffect(() => {
    const media =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    const update = () =>
      setReducedMotion(
        media.matches,
      );

    update();

    media.addEventListener(
      "change",
      update,
    );

    return () =>
      media.removeEventListener(
        "change",
        update,
      );
  }, []);

  useEffect(() => {
    if (!aboutOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setAboutOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [aboutOpen]);

  function handleMapMove(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      reducedMotion ||
      !mapRef.current
    ) {
      return;
    }

    const bounds =
      mapRef.current.getBoundingClientRect();

    const x =
      (event.clientX -
        bounds.left) /
        bounds.width -
      0.5;

    const y =
      (event.clientY -
        bounds.top) /
        bounds.height -
      0.5;

    setParallax({
      x: x * 9,
      y: y * 6,
    });
  }

  function resetParallax() {
    setParallax({
      x: 0,
      y: 0,
    });
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090706] text-[#e8dcc4] lg:h-[100dvh] lg:min-h-[680px] lg:overflow-hidden">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(135,91,42,0.22),transparent_38%),radial-gradient(circle_at_15%_45%,rgba(78,42,25,0.13),transparent_28%),linear-gradient(to_bottom,#130e0b_0%,#0b0807_50%,#070605_100%)]" />

      <div className="pointer-events-none fixed inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:72px_72px]" />

      {/* EMBERS */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {EMBERS.map(
          (ember, index) => (
            <span
              key={`${ember.left}-${index}`}
              className="homepage-ember absolute bottom-[-2rem] rounded-full bg-[#d89245] shadow-[0_0_8px_rgba(216,146,69,0.7)]"
              style={{
                left: `${ember.left}%`,
                width: ember.size,
                height: ember.size,
                animationDelay: `${ember.delay}s`,
                animationDuration: `${ember.duration}s`,
                ["--drift" as string]:
                  `${ember.drift}px`,
              }}
            />
          ),
        )}
      </div>

      {/* FOG */}
      <div
        aria-hidden="true"
        className="homepage-fog pointer-events-none fixed -left-[20%] top-[10%] h-[36rem] w-[140%] bg-[radial-gradient(ellipse_at_center,rgba(194,171,136,0.08),transparent_67%)] blur-3xl"
      />

      <div className="relative z-10 grid min-h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] px-4 py-4 sm:px-6 lg:h-full lg:min-h-0 lg:px-8">
        {/* HEADER */}
        <header className="mx-auto w-full max-w-[1500px] text-center">
          <h1 className="mt-1 font-serif text-4xl tracking-[0.12em] text-[#ead8b4] drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
            SEPULCHRIA
          </h1>

          <div className="mx-auto mt-2 flex max-w-sm items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#765a36]" />
            <span className="text-[10px] text-[#a47a43]">
              ✦
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#765a36]" />
          </div>

          <p className="mx-auto mt-2 max-w-2xl font-serif text-sm italic text-[#b7a78f] sm:text-base">
            A living world forged
            from the remains of
            fallen gods.
          </p>
        </header>

        {/* MAIN CONTENT */}
        <section className="mx-auto grid min-h-0 w-full max-w-[1500px] gap-5 py-4 lg:grid-cols-[220px_minmax(0,1fr)_270px] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          {/* LEFT NAVIGATION */}
          <aside className="order-2 flex min-h-0 flex-col justify-center lg:order-1">
            <div className="relative border border-[#6b5032]/55 bg-[#120d0a]/86 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">
              <div className="pointer-events-none absolute inset-1 border border-[#9a7547]/12" />

              <div className="relative mb-3 text-center">
                <p className="text-[8px] uppercase tracking-[0.34em] text-[#80684c]">
                  Navigation
                </p>

                <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[#89653b] to-transparent" />
              </div>

              <nav
                aria-label="Public navigation"
                className="relative grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
              >
                {/* ABOUT SEPULCHRIA */}
                <HomepageActionButton
                  eyebrow="Introduction"
                  label="About Sepulchria"
                  symbol="◉"
                  onClick={() =>
                    setAboutOpen(true)
                  }
                />

                {PRIMARY_LINKS.map(
                  (item) => (
                    <HomepageButton
                      key={item.label}
                      {...item}
                    />
                  ),
                )}

                <HomepageButton
                  href={enterHref}
                  eyebrow={
                    isAuthenticated
                      ? "Return"
                      : "Enter"
                  }
                  label="Enter Sepulchria"
                  symbol="◆"
                  featured
                />
              </nav>
            </div>
          </aside>

          {/* CENTRE MAP */}
          <div
            ref={mapRef}
            onMouseMove={
              handleMapMove
            }
            onMouseLeave={
              resetParallax
            }
            className="group relative order-1 flex min-h-0 items-center lg:order-2"
          >
            <div className="absolute inset-[-7%] bg-[radial-gradient(ellipse_at_center,rgba(169,112,49,0.18),transparent_64%)] opacity-70 blur-2xl transition duration-1000 group-hover:opacity-100" />

            <div className="relative aspect-[1000/667] w-full overflow-hidden">
              <div
                className="absolute inset-0 transition-transform duration-300 ease-out"
                style={{
                  transform:
                    reducedMotion
                      ? undefined
                      : `translate3d(${parallax.x}px, ${parallax.y}px, 0) scale(1.015)`,
                }}
              >
                <Image
  src={
    isNight
      ? "/maps/land-of-the-fallenv2-n.png"
      : "/maps/land-of-the-fallenv2.png"
  }
  alt="Illustrated map of The Godscar"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-contain object-center brightness-[0.8] contrast-[1.08] saturate-[0.88] drop-shadow-[0_28px_40px_rgba(0,0,0,0.58)] transition duration-1000 group-hover:brightness-[0.9] group-hover:saturate-100"
                />
              </div>

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(9,7,6,0.35)_80%,#090706_100%)]" />

              <div className="homepage-map-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(192,121,48,0.12),transparent_25%)] mix-blend-screen" />
            </div>
          </div>

          {/* RIGHT PANEL */}
          <aside className="order-3 flex min-h-0 flex-col justify-center">
            <div className="relative border border-[#6b5032]/45 bg-[#110c09]/82 px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
              <div className="pointer-events-none absolute inset-1 border border-[#9a7547]/10" />

              <div className="relative text-center">
                <p className="text-[8px] uppercase tracking-[0.34em] text-[#80684c]">
                  The First Pages
                </p>

                <div className="mx-auto mt-2 h-px w-20 bg-gradient-to-r from-transparent via-[#89653b] to-transparent" />
              </div>

              <div className="relative mt-4 divide-y divide-[#5d472e]/45">
                {CHAPTERS.map(
                  (chapter) => (
                    <article
                      key={
                        chapter.number
                      }
                      className="group py-4 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-serif text-2xl text-[#8e6737]/65 transition group-hover:text-[#c18d4c]">
                          {
                            chapter.number
                          }
                        </span>

                        <div className="min-w-0">
                          <p className="text-[8px] uppercase tracking-[0.26em] text-[#8f704b]">
                            Chapter{" "}
                            {
                              chapter.number
                            }
                          </p>

                          <h2 className="mt-1 font-serif text-lg leading-tight text-[#dfc89e] transition group-hover:text-[#efd8aa]">
                            {
                              chapter.title
                            }
                          </h2>

                          <p className="mt-2 text-[11px] leading-5 text-[#968875]">
                            {
                              chapter.text
                            }
                          </p>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* FOOTER */}
        {/* FOOTER */}
<footer className="mx-auto w-full max-w-[1500px] border-t border-[#57412a]/35 pt-3">
  <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
    <p className="font-serif text-sm italic text-[#a9987d] sm:text-base">
      “The Current remembers
      every choice.”
    </p>

    <nav
      aria-label="Footer navigation"
      className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[8px] uppercase tracking-[0.18em] text-[#796d5f] sm:justify-end"
    >
      <Link
        href="#"
        className="transition hover:text-[#cdb487]"
      >
        Discord
      </Link>

      <Link
        href="#"
        className="transition hover:text-[#cdb487]"
      >
        Credits
      </Link>

      <Link
        href="/privacy"
        className="transition hover:text-[#cdb487]"
      >
        Privacy
      </Link>

      <Link
        href="/terms"
        className="transition hover:text-[#cdb487]"
      >
        Terms
      </Link>
    </nav>
  </div>

  <div className="mt-3 border-t border-[#57412a]/20 pt-2 text-center">
    <p className="mx-auto max-w-4xl text-[8px] leading-4 text-[#706659]">
      <span className="uppercase tracking-[0.16em] text-[#8b7659]">
        AI Content Disclosure —
      </span>{" "}
      Generative artificial intelligence tools have been used in the development of Sepulchria to assist with certain visual assets, written content, and technical development. All creative direction, worldbuilding, editorial decisions and final published content are reviewed and curated by the Sepulchria team.
    </p>
  </div>
</footer>
      </div>

      {/* ABOUT SEPULCHRIA MODAL */}
      {aboutOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-sepulchria-title"
        >
          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close About Sepulchria"
            onClick={() =>
              setAboutOpen(false)
            }
            className="absolute inset-0 cursor-default bg-[#050403]/88 backdrop-blur-[4px]"
          />

          {/* MODAL PANEL */}
          <section className="relative z-10 max-h-[90dvh] w-full max-w-[680px] overflow-y-auto border border-[#765937]/80 bg-[#100c09] shadow-[0_30px_100px_rgba(0,0,0,0.92)]">
            <div className="pointer-events-none absolute inset-1 border border-[#a27a49]/10" />

            {/* MODAL HEADER */}
            <header className="relative border-b border-[#60482e]/45 px-6 py-5 text-center sm:px-9">
              <button
                type="button"
                onClick={() =>
                  setAboutOpen(false)
                }
                aria-label="Close"
                title="Close"
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center border border-[#60482e]/55 bg-[#17120f] text-sm text-[#a98c67] transition hover:border-[#987044] hover:text-[#efd3a1]"
              >
                ×
              </button>

              <p className="text-[7px] uppercase tracking-[0.34em] text-[#987344]">
                Welcome to Aureth
              </p>

              <h2
                id="about-sepulchria-title"
                className="mt-2 font-serif text-3xl text-[#e5cda2] sm:text-4xl"
              >
                What is Sepulchria?
              </h2>

              <div className="mx-auto mt-3 h-px w-28 bg-gradient-to-r from-transparent via-[#89653b] to-transparent" />
            </header>

            {/* MODAL CONTENT */}
            <div className="relative px-6 py-6 sm:px-10 sm:py-8">
              <p className="text-center font-serif text-base leading-7 text-[#c6b294] sm:text-lg">
                Sepulchria is an
                English-language fantasy
                play-by-chat roleplaying
                game set in Aureth, a
                world forever changed by
                the fall of its gods.
              </p>

              <div className="mx-auto my-5 flex max-w-xs items-center gap-3">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#60482e]" />

                <span className="text-[8px] text-[#9e7443]">
                  ✦
                </span>

                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#60482e]" />
              </div>

              <div className="space-y-4 text-[12px] leading-6 text-[#9f907b] sm:text-[13px]">
                <p>
                  You create a character
                  and enter the city of
                  Sepulchria, where their
                  relationships,
                  ambitions, loyalties
                  and choices are played
                  out through written
                  roleplay with other
                  players.
                </p>

                <p>
                  There is no
                  predetermined
                  protagonist. Your
                  character is one of
                  the people who
                  inhabits this world.
                  They can form
                  relationships, pursue
                  a profession, explore
                  the city, become
                  involved in its
                  conflicts and
                  mysteries, and leave
                  their own mark on its
                  history.
                </p>

                <p>
                  Sepulchria is a
                  persistent shared
                  setting. Stories grow
                  through interaction
                  between characters,
                  events and the
                  consequences of what
                  happens in play.
                </p>
              </div>

              {/* QUICK EXPLANATION */}
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                <AboutFeature
                  symbol="I"
                  title="Create"
                  text="Build a character and choose who they are within Aureth."
                />

                <AboutFeature
                  symbol="II"
                  title="Roleplay"
                  text="Write their actions and interact live with other characters."
                />

                <AboutFeature
                  symbol="III"
                  title="Shape"
                  text="Let their decisions and relationships become part of the story."
                />
              </div>

              {/* LINKS */}
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/codex"
                  onClick={() =>
                    setAboutOpen(
                      false,
                    )
                  }
                  className="border border-[#765937]/65 bg-[#1a120d] px-4 py-3 text-center transition hover:border-[#a17a48] hover:bg-[#25180f]"
                >
                  <span className="block text-[7px] uppercase tracking-[0.22em] text-[#806d55]">
                    Explore the
                    setting
                  </span>

                  <span className="mt-1 block font-serif text-sm text-[#d9bd91]">
                    Read the Codex →
                  </span>
                </Link>

                <Link
                  href="/rules"
                  onClick={() =>
                    setAboutOpen(
                      false,
                    )
                  }
                  className="border border-[#765937]/65 bg-[#1a120d] px-4 py-3 text-center transition hover:border-[#a17a48] hover:bg-[#25180f]"
                >
                  <span className="block text-[7px] uppercase tracking-[0.22em] text-[#806d55]">
                    Learn the game
                  </span>

                  <span className="mt-1 block font-serif text-sm text-[#d9bd91]">
                    Read the Rules →
                  </span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .homepage-ember {
          opacity: 0;
          animation-name: ember-rise;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .homepage-fog {
          animation: fog-drift 18s
            ease-in-out infinite
            alternate;
        }

        .homepage-map-glow {
          animation: map-breathe 5s
            ease-in-out infinite;
        }

        @keyframes ember-rise {
          0% {
            opacity: 0;
            transform: translate3d(
                0,
                0,
                0
              )
              scale(0.6);
          }

          15% {
            opacity: 0.55;
          }

          70% {
            opacity: 0.24;
          }

          100% {
            opacity: 0;
            transform: translate3d(
                var(--drift),
                -110vh,
                0
              )
              scale(1.15);
          }
        }

        @keyframes fog-drift {
          from {
            transform: translate3d(
                -3%,
                0,
                0
              )
              scale(1);
            opacity: 0.5;
          }

          to {
            transform: translate3d(
                3%,
                2%,
                0
              )
              scale(1.08);
            opacity: 0.78;
          }
        }

        @keyframes map-breathe {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 0.9;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .homepage-ember,
          .homepage-fog,
          .homepage-map-glow {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function HomepageButton({
  href,
  eyebrow,
  label,
  symbol,
  featured = false,
}: {
  href: string;
  eyebrow: string;
  label: string;
  symbol: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative min-h-[68px] overflow-hidden border px-4 py-3 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a460] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090706] ${
        featured
          ? "border-[#a77a42]/80 bg-[#332113] shadow-[0_0_24px_rgba(159,105,46,0.13)] hover:-translate-y-0.5 hover:border-[#d4a460] hover:bg-[#422a16]"
          : "border-[#654b30]/55 bg-[#15100c]/92 hover:-translate-y-0.5 hover:border-[#987044] hover:bg-[#21170f]"
      }`}
    >
      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-serif text-3xl text-[#a87c43]/15 transition duration-500 group-hover:scale-125 group-hover:text-[#c99a58]/25">
        {symbol}
      </span>

      <span className="relative block text-[7px] uppercase tracking-[0.28em] text-[#836c50]">
        {eyebrow}
      </span>

      <span className="relative mt-1 block font-serif text-base text-[#dfc89d] transition group-hover:text-[#f0d7a6]">
        {label}
      </span>

      <span className="absolute bottom-0 left-0 h-px w-0 bg-[#c18d4c] transition-all duration-500 group-hover:w-full" />
    </Link>
  );
}

function HomepageActionButton({
  eyebrow,
  label,
  symbol,
  onClick,
}: {
  eyebrow: string;
  label: string;
  symbol: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[68px] overflow-hidden border border-[#654b30]/55 bg-[#15100c]/92 px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[#987044] hover:bg-[#21170f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a460] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090706]"
    >
      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-serif text-3xl text-[#a87c43]/15 transition duration-500 group-hover:scale-125 group-hover:text-[#c99a58]/25">
        {symbol}
      </span>

      <span className="relative block text-[7px] uppercase tracking-[0.28em] text-[#836c50]">
        {eyebrow}
      </span>

      <span className="relative mt-1 block font-serif text-base text-[#dfc89d] transition group-hover:text-[#f0d7a6]">
        {label}
      </span>

      <span className="absolute bottom-0 left-0 h-px w-0 bg-[#c18d4c] transition-all duration-500 group-hover:w-full" />
    </button>
  );
}

function AboutFeature({
  symbol,
  title,
  text,
}: {
  symbol: string;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-[#60482e]/40 bg-[#15100d] px-3 py-3 text-center">
      <span className="font-serif text-lg text-[#9d7443]">
        {symbol}
      </span>

      <p className="mt-1 font-serif text-sm text-[#d6bd91]">
        {title}
      </p>

      <p className="mt-1.5 text-[9px] leading-4 text-[#827564]">
        {text}
      </p>
    </div>
  );
}