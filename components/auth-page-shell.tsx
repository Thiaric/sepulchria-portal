import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const EMBERS = [
  ["7%", "1s", "12s", "2px"],
  ["16%", "5s", "15s", "3px"],
  ["29%", "2s", "11s", "2px"],
  ["41%", "8s", "16s", "3px"],
  ["54%", "4s", "13s", "2px"],
  ["67%", "9s", "17s", "3px"],
  ["79%", "3s", "12s", "2px"],
  ["92%", "6s", "15s", "3px"],
] as const;

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[rgb(var(--sep-colour-090706))] text-[rgb(var(--sep-colour-e8dcc4))]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(var(--sep-rgb-135-91-42),0.24),transparent_38%),radial-gradient(circle_at_15%_45%,rgba(var(--sep-rgb-78-42-25),0.14),transparent_28%),linear-gradient(to_bottom,#130e0b_0%,#0b0807_52%,#070605_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(var(--sep-rgb-255-255-255),.025)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--sep-rgb-255-255-255),.018)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(var(--sep-rgb-0-0-0),.42)_100%)]" />

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {EMBERS.map(([left, delay, duration, size], index) => (
          <span
            key={index}
            className="auth-ember absolute bottom-[-2rem] rounded-full bg-[rgb(var(--sep-colour-d89245))] shadow-[0_0_9px_rgba(var(--sep-rgb-216-146-69),.75)]"
            style={{
              left,
              width: size,
              height: size,
              animationDelay: delay,
              animationDuration: duration,
            }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="auth-fog pointer-events-none fixed -left-[15%] top-[12%] h-[38rem] w-[130%] bg-[radial-gradient(ellipse_at_center,rgba(var(--sep-rgb-194-171-136),.08),transparent_68%)] blur-3xl"
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between border-b border-[rgb(var(--sep-colour-5f472d))]/35 px-5 py-4 sm:px-8">
          <Link
            href="/homepage"
            className="font-serif text-xl tracking-[0.16em] text-[rgb(var(--sep-colour-ead8b4))] transition hover:text-[rgb(var(--sep-colour-f5dfb4))]"
          >
            SEPULCHRIA
          </Link>

          <Link
            href="/homepage"
            className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8e7b61))] transition hover:text-[rgb(var(--sep-colour-c8aa7a))]"
          >
            Return to the Homepage
          </Link>
        </header>

        <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 md:grid-cols-[minmax(0,1fr)_430px] md:px-8 lg:gap-20">
          <div className="hidden md:block">
            <p className="text-[9px] uppercase tracking-[0.42em] text-[rgb(var(--sep-colour-9a7547))]">
              Chronicle of the Living Body
            </p>

            <h1 className="mt-5 max-w-xl font-serif text-5xl leading-[1.04] tracking-[0.04em] text-[rgb(var(--sep-colour-ead8b4))] lg:text-6xl">
              {title}
            </h1>

            <div className="mt-6 flex max-w-md items-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-r from-[rgb(var(--sep-colour-8a663d))] to-transparent" />
              <span className="text-[rgb(var(--sep-colour-ad7d42))]">✦</span>
            </div>

            <p className="mt-6 max-w-lg font-serif text-lg leading-8 text-[rgb(var(--sep-colour-ad9e88))]">
              {description}
            </p>

            <p className="mt-10 max-w-md text-sm leading-7 text-[rgb(var(--sep-colour-776c5e))]">
              Beyond these gates waits a persistent world of alliances, consequences
              and stories shaped by its players.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-[-12%] bg-[radial-gradient(circle,rgba(var(--sep-rgb-164-105-46),.14),transparent_65%)] blur-2xl" />

            <div className="relative border border-[rgb(var(--sep-colour-755536))]/65 bg-[rgb(var(--sep-colour-110c09))]/92 p-1 shadow-[0_28px_90px_rgba(var(--sep-rgb-0-0-0),.62)]">
              <div className="border border-[rgb(var(--sep-colour-a37b49))]/16 px-5 py-7 sm:px-8 sm:py-8">
                <div className="mb-7 text-center">
                  <p className="text-[8px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-876c4c))]">
                    {eyebrow}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e5cfa6))]">
                    {title}
                  </h2>
                  <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[rgb(var(--sep-colour-9c7343))] to-transparent" />
                </div>

                {children}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[rgb(var(--sep-colour-5f472d))]/25 px-5 py-4 text-center font-serif text-sm italic text-[rgb(var(--sep-colour-817462))]">
          “The Current remembers every choice.”
        </footer>
      </div>

      <style>{`
        .auth-ember {
          opacity: 0;
          animation: auth-ember-rise linear infinite;
        }

        .auth-fog {
          animation: auth-fog-drift 18s ease-in-out infinite alternate;
        }

        @keyframes auth-ember-rise {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(.65);
          }
          18% {
            opacity: .55;
          }
          75% {
            opacity: .18;
          }
          100% {
            opacity: 0;
            transform: translate3d(18px, -110vh, 0) scale(1.15);
          }
        }

        @keyframes auth-fog-drift {
          from {
            transform: translate3d(-3%, 0, 0) scale(1);
            opacity: .48;
          }
          to {
            transform: translate3d(3%, 2%, 0) scale(1.08);
            opacity: .78;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-ember,
          .auth-fog {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
