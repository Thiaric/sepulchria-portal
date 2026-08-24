"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type SepulchriaHomepageProps = {
  enterHref: string;
  isAuthenticated: boolean;
  registrationsOpen: boolean;
};

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
    text: "Choose your Ancestry, Order and place within the living world of Sepulchria.",
  },
  {
    number: "III",
    title: "Shape the Story",
    text: "Enter a persistent world where choices, loyalties and consequences become part of its history.",
  },
] as const;

const EMBERS = [
  { left: 6, delay: 0.2, duration: 12, size: 2, drift: -12 },
  { left: 14, delay: 4.2, duration: 15, size: 3, drift: 18 },
  { left: 24, delay: 1.4, duration: 13, size: 2, drift: 9 },
  { left: 35, delay: 6.8, duration: 17, size: 3, drift: -15 },
  { left: 46, delay: 3.1, duration: 14, size: 2, drift: 12 },
  { left: 57, delay: 8.6, duration: 18, size: 3, drift: -8 },
  { left: 68, delay: 2.5, duration: 16, size: 2, drift: 17 },
  { left: 79, delay: 7.3, duration: 13, size: 3, drift: -13 },
  { left: 89, delay: 0.7, duration: 19, size: 2, drift: 10 },
  { left: 96, delay: 5.5, duration: 15, size: 3, drift: -17 },
] as const;

export function SepulchriaHomepage({
  enterHref,
  isAuthenticated,
  registrationsOpen,
}: SepulchriaHomepageProps) {
  const [aboutOpen, setAboutOpen] =
    useState(false);

  useEffect(() => {
    if (!aboutOpen) return;

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

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[rgb(var(--sep-colour-090706))] text-[rgb(var(--sep-colour-e8dcc4))] lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">
      {/* Atmospheric background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(var(--sep-rgb-135-91-42),0.24),transparent_38%),radial-gradient(circle_at_15%_45%,rgba(var(--sep-rgb-78-42-25),0.14),transparent_28%),linear-gradient(to_bottom,#130e0b_0%,#0b0807_50%,#070605_100%)]" />

      <div className="pointer-events-none fixed inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(var(--sep-rgb-255-255-255),.025)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--sep-rgb-255-255-255),.018)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {EMBERS.map(
          (ember, index) => (
            <span
              key={`${ember.left}-${index}`}
              className="homepage-ember absolute bottom-[-2rem] rounded-full bg-[rgb(var(--sep-colour-d89245))] shadow-[0_0_8px_rgba(var(--sep-rgb-216-146-69),0.7)]"
              style={{
                left: `${ember.left}%`,
                width: ember.size,
                height: ember.size,
                animationDelay:
                  `${ember.delay}s`,
                animationDuration:
                  `${ember.duration}s`,
                ["--drift" as string]:
                  `${ember.drift}px`,
              }}
            />
          ),
        )}
      </div>

      <div
        aria-hidden="true"
        className="homepage-fog pointer-events-none fixed -left-[20%] top-[10%] h-[36rem] w-[140%] bg-[radial-gradient(ellipse_at_center,rgba(var(--sep-rgb-194-171-136),0.08),transparent_67%)] blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-3 py-4 sm:px-6 lg:h-full lg:min-h-0 lg:px-8">
        {/* Header */}
        <header className="shrink-0 text-center">
          <p className="text-[8px] uppercase tracking-[0.42em] text-[rgb(var(--sep-colour-896b45))]">
            The Living World of Aureth
          </p>

          <h1 className="mt-1 font-serif text-4xl tracking-[0.13em] text-[rgb(var(--sep-colour-ead8b4))] drop-shadow-[0_8px_30px_rgba(var(--sep-rgb-0-0-0),0.9)] sm:text-5xl lg:text-6xl">
            SEPULCHRIA
          </h1>

          <div className="mx-auto mt-2 flex max-w-sm items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgb(var(--sep-colour-765a36))]" />
            <span className="text-[10px] text-[rgb(var(--sep-colour-a47a43))]">
              ✦
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgb(var(--sep-colour-765a36))]" />
          </div>

          <p className="mx-auto mt-2 max-w-2xl font-serif text-sm italic text-[rgb(var(--sep-colour-b7a78f))] sm:text-base">
            A living world forged from the remains of fallen gods.
          </p>
        </header>

        {/* Main grid
            MOBILE ORDER:
            1 Video
            2 Navigation
            3 First Pages

            DESKTOP:
            Navigation | Video | First Pages
        */}
        <section className="grid flex-1 items-center gap-4 py-5 lg:min-h-0 lg:grid-cols-[230px_auto_285px] lg:justify-center lg:gap-6 lg:py-3 xl:grid-cols-[245px_auto_305px] xl:gap-7">
          {/* VIDEO — first on mobile; centred and fully contained on desktop */}
          <section className="order-1 flex min-h-0 min-w-0 items-center justify-center lg:order-2 lg:h-full">
            <div className="relative flex min-h-0 max-h-[72dvh] w-full items-center justify-center lg:h-full lg:max-h-full">
              <div className="pointer-events-none absolute inset-x-[20%] inset-y-[2%] bg-[radial-gradient(ellipse_at_center,rgba(var(--sep-rgb-169-112-49),0.20),transparent_70%)] blur-3xl" />

              <div className="relative flex aspect-[9/16] max-h-[72dvh] max-w-full items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-6b5032))]/45 bg-[rgb(var(--sep-colour-110c09))]/84 p-[3px] shadow-[0_18px_60px_rgba(var(--sep-rgb-0-0-0),0.38)] lg:h-[90%] lg:max-h-[90%] lg:w-auto">
                <div className="pointer-events-none absolute inset-1 z-20 border border-[rgb(var(--sep-colour-9a7547))]/10" />

                <video
                  className="block h-full max-h-full w-full max-w-full object-contain"
                  src="/videos/Sepulchria_Promo.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  aria-label="Sepulchria promotional video"
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>
            </div>
          </section>

          {/* Navigation — second on mobile */}
          <aside className="order-2 min-w-0 lg:order-1">
            <div className="relative border border-[rgb(var(--sep-colour-6b5032))]/45 bg-[rgb(var(--sep-colour-110c09))]/84 p-3 shadow-[0_18px_60px_rgba(var(--sep-rgb-0-0-0),0.38)] backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-1 border border-[rgb(var(--sep-colour-9a7547))]/10" />

              <div className="relative mb-3 text-center">
                <p className="text-[8px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-80684c))]">
                  Navigation
                </p>

                <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[rgb(var(--sep-colour-89653b))] to-transparent" />
              </div>

              <nav
                aria-label="Public navigation"
                className="relative grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
              >
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
                      label={
                        item.label ===
                          "Register" &&
                        !registrationsOpen
                          ? "Info about Registration"
                          : item.label
                      }
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

          {/* First Pages */}
          <aside className="order-3 min-w-0">
            <div className="relative border border-[rgb(var(--sep-colour-6b5032))]/45 bg-[rgb(var(--sep-colour-110c09))]/84 px-5 py-4 shadow-[0_18px_60px_rgba(var(--sep-rgb-0-0-0),0.38)] backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-1 border border-[rgb(var(--sep-colour-9a7547))]/10" />

              <div className="relative text-center">
                <p className="text-[8px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-80684c))]">
                  The First Pages
                </p>

                <div className="mx-auto mt-2 h-px w-20 bg-gradient-to-r from-transparent via-[rgb(var(--sep-colour-89653b))] to-transparent" />
              </div>

              <div className="relative mt-4 divide-y divide-[rgb(var(--sep-colour-5d472e))]/45">
                {CHAPTERS.map(
                  (chapter) => (
                    <article
                      key={chapter.number}
                      className="group py-4 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-serif text-2xl text-[rgb(var(--sep-colour-8e6737))]/65 transition group-hover:text-[rgb(var(--sep-colour-c18d4c))]">
                          {chapter.number}
                        </span>

                        <div className="min-w-0">
                          <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-8f704b))]">
                            Chapter{" "}
                            {chapter.number}
                          </p>

                          <h2 className="mt-1 font-serif text-lg leading-tight text-[rgb(var(--sep-colour-dfc89e))] transition group-hover:text-[rgb(var(--sep-colour-efd8aa))]">
                            {chapter.title}
                          </h2>

                          <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-968875))]">
                            {chapter.text}
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

        {/* Footer */}
        <footer className="shrink-0 border-t border-[rgb(var(--sep-colour-57412a))]/35 pt-3">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="font-serif text-sm italic text-[rgb(var(--sep-colour-a9987d))] sm:text-base">
              “The Current remembers every choice.”
            </p>

            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-796d5f))] sm:justify-end"
            >
              <Link href="#" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Discord
              </Link>
              <Link href="#" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Credits
              </Link>
              <Link href="/community-rules" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Community Rules
              </Link>
              <Link href="/safety" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Safety
              </Link>
              <Link href="/age-policy" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                18+ Policy
              </Link>
              <Link href="/privacy" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Privacy
              </Link>
              <Link href="/cookies" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Cookies
              </Link>
              <Link href="/terms" className="transition hover:text-[rgb(var(--sep-colour-cdb487))]">
                Terms
              </Link>
            </nav>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-57412a))]/20 pt-2 pb-2 text-center">
            <p className="mx-auto max-w-4xl text-[8px] leading-4 text-[rgb(var(--sep-colour-706659))]">
              <span className="uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8b7659))]">
                AI Content Disclosure —
              </span>{" "}
              Generative artificial intelligence tools have been used in the development of Sepulchria to assist with certain visual assets, written content, and technical development. All creative direction, worldbuilding, editorial decisions and final published content are reviewed and curated by the Sepulchria team.
            </p>
          </div>
        </footer>
      </div>

      {/* About modal */}
      {aboutOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-sepulchria-title"
        >
          <button
            type="button"
            aria-label="Close About Sepulchria"
            onClick={() =>
              setAboutOpen(false)
            }
            className="absolute inset-0 cursor-default bg-[rgb(var(--sep-colour-050403))]/88 backdrop-blur-[4px]"
          />

          <section className="relative z-10 max-h-[90dvh] w-full max-w-[720px] overflow-y-auto border border-[rgb(var(--sep-colour-765937))]/80 bg-[rgb(var(--sep-colour-100c09))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.92)]">
            <div className="pointer-events-none absolute inset-1 border border-[rgb(var(--sep-colour-a27a49))]/10" />

            <header className="relative border-b border-[rgb(var(--sep-colour-60482e))]/45 px-6 py-5 text-center sm:px-9">
              <button
                type="button"
                onClick={() =>
                  setAboutOpen(false)
                }
                aria-label="Close"
                title="Close"
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-17120f))] text-sm text-[rgb(var(--sep-colour-a98c67))] transition hover:border-[rgb(var(--sep-colour-987044))] hover:text-[rgb(var(--sep-colour-efd3a1))]"
              >
                ×
              </button>

              <p className="text-[7px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-987344))]">
                Welcome to Aureth
              </p>

              <h2
                id="about-sepulchria-title"
                className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e5cda2))] sm:text-4xl"
              >
                What is Sepulchria?
              </h2>

              <div className="mx-auto mt-3 h-px w-28 bg-gradient-to-r from-transparent via-[rgb(var(--sep-colour-89653b))] to-transparent" />
            </header>

            <div className="relative px-6 py-6 sm:px-10 sm:py-8">
              <p className="text-center font-serif text-base leading-7 text-[rgb(var(--sep-colour-c6b294))] sm:text-lg">
                Sepulchria is an English-language fantasy play-by-chat roleplaying game set in Aureth, a world forever changed by the fall of its gods.
              </p>

              <div className="mx-auto my-5 flex max-w-xs items-center gap-3">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgb(var(--sep-colour-60482e))]" />
                <span className="text-[8px] text-[rgb(var(--sep-colour-9e7443))]">
                  ✦
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgb(var(--sep-colour-60482e))]" />
              </div>

              <div className="space-y-4 text-[12px] leading-6 text-[rgb(var(--sep-colour-9f907b))] sm:text-[13px]">
                <p>
                  You create a character and enter the city of Sepulchria, where their relationships, ambitions, loyalties and choices are played out through written roleplay with other players.
                </p>

                <p>
                  There is no predetermined protagonist. Your character is one of the people who inhabits this world. They can form relationships, pursue a profession, explore the city, become involved in its conflicts and mysteries, and leave their own mark on its history.
                </p>

                <p>
                  Sepulchria is a persistent shared setting. Stories grow through interaction between characters, events and the consequences of what happens in play.
                </p>
              </div>

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

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/codex"
                  onClick={() =>
                    setAboutOpen(false)
                  }
                  className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-1a120d))] px-4 py-3 text-center transition hover:border-[rgb(var(--sep-colour-a17a48))] hover:bg-[rgb(var(--sep-colour-25180f))]"
                >
                  <span className="block text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806d55))]">
                    Explore the setting
                  </span>
                  <span className="mt-1 block font-serif text-sm text-[rgb(var(--sep-colour-d9bd91))]">
                    Read the Codex →
                  </span>
                </Link>

                <Link
                  href="/rules"
                  onClick={() =>
                    setAboutOpen(false)
                  }
                  className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-1a120d))] px-4 py-3 text-center transition hover:border-[rgb(var(--sep-colour-a17a48))] hover:bg-[rgb(var(--sep-colour-25180f))]"
                >
                  <span className="block text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806d55))]">
                    Learn the game
                  </span>
                  <span className="mt-1 block font-serif text-sm text-[rgb(var(--sep-colour-d9bd91))]">
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

        @keyframes ember-rise {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0)
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
            transform: translate3d(-3%, 0, 0)
              scale(1);
            opacity: 0.5;
          }

          to {
            transform: translate3d(3%, 2%, 0)
              scale(1.08);
            opacity: 0.78;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .homepage-ember,
          .homepage-fog {
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
      className={`group relative min-h-[64px] overflow-hidden border px-4 py-3 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sep-colour-d4a460))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--sep-colour-090706))] ${
        featured
          ? "border-[rgb(var(--sep-colour-a77a42))]/90 bg-[rgb(var(--sep-colour-382313))] shadow-[0_0_24px_rgba(var(--sep-rgb-159-105-46),0.16)] hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
          : "border-[rgb(var(--sep-colour-654b30))]/55 bg-[rgb(var(--sep-colour-15100c))]/92 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-987044))] hover:bg-[rgb(var(--sep-colour-21170f))]"
      }`}
    >
      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-serif text-3xl text-[rgb(var(--sep-colour-a87c43))]/15 transition duration-500 group-hover:scale-125 group-hover:text-[rgb(var(--sep-colour-c99a58))]/25">
        {symbol}
      </span>

      <span className="relative block text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-836c50))]">
        {eyebrow}
      </span>

      <span className="relative mt-1 block font-serif text-base text-[rgb(var(--sep-colour-dfc89d))] transition group-hover:text-[rgb(var(--sep-colour-f0d7a6))]">
        {label}
      </span>

      <span className="absolute bottom-0 left-0 h-px w-0 bg-[rgb(var(--sep-colour-c18d4c))] transition-all duration-500 group-hover:w-full" />
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
      className="group relative min-h-[64px] overflow-hidden border border-[rgb(var(--sep-colour-654b30))]/55 bg-[rgb(var(--sep-colour-15100c))]/92 px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-987044))] hover:bg-[rgb(var(--sep-colour-21170f))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sep-colour-d4a460))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--sep-colour-090706))]"
    >
      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-serif text-3xl text-[rgb(var(--sep-colour-a87c43))]/15 transition duration-500 group-hover:scale-125 group-hover:text-[rgb(var(--sep-colour-c99a58))]/25">
        {symbol}
      </span>

      <span className="relative block text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-836c50))]">
        {eyebrow}
      </span>

      <span className="relative mt-1 block font-serif text-base text-[rgb(var(--sep-colour-dfc89d))] transition group-hover:text-[rgb(var(--sep-colour-f0d7a6))]">
        {label}
      </span>

      <span className="absolute bottom-0 left-0 h-px w-0 bg-[rgb(var(--sep-colour-c18d4c))] transition-all duration-500 group-hover:w-full" />
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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] px-3 py-3 text-center">
      <span className="font-serif text-lg text-[rgb(var(--sep-colour-9d7443))]">
        {symbol}
      </span>

      <p className="mt-1 font-serif text-sm text-[rgb(var(--sep-colour-d6bd91))]">
        {title}
      </p>

      <p className="mt-1.5 text-[9px] leading-4 text-[rgb(var(--sep-colour-827564))]">
        {text}
      </p>
    </div>
  );
}