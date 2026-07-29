import Link from "next/link";

import { getPortalContext } from "@/lib/portal/get-portal-context";

export default async function DashboardPage() {
  const { character, unreadMessageCount, onlineCharacterCount } =
    await getPortalContext();

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <header className="mb-8 border-b border-[#6e5535]/30 pb-7">
        <p className="text-xs uppercase tracking-[0.35em] text-[#987c55]">
          Welcome to the chronicle
        </p>

        <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight text-[#ead8b4] sm:text-5xl">
          Enter Sepulchria
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#aa9b87] sm:text-base">
          Create your character, enter the city and write your story alongside
          other players in a persistent gothic world.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <article className="group min-h-64 overflow-hidden border border-[#725735]/45 bg-[#1a1410]">
          <div className="flex h-full flex-col justify-end bg-[linear-gradient(to_top,_rgba(12,9,7,0.98),_rgba(20,15,11,0.3)),radial-gradient(circle_at_top_right,_rgba(150,105,50,0.22),_transparent_50%)] p-6">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#ad8a57]">
              Continue your story
            </p>

            <h2 className="mt-3 font-serif text-3xl text-[#ead7b1]">
              Enter the city
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-[#a89a86]">
              Return to your current location, read the latest actions and
              continue the scene.
            </p>

            <Link
              href={character ? "/game" : "/character/create"}
              className="mt-6 inline-flex w-fit border border-[#967342] bg-[#3b2b1b] px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#f1d9a7] transition hover:bg-[#513b25]"
            >
              {character ? "Play now" : "Create character"}
            </Link>
          </div>
        </article>

        <article className="min-h-64 border border-[#725735]/45 bg-[#17120f] p-6">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#90744f]">
            Your identity
          </p>

          <h2 className="mt-3 font-serif text-3xl text-[#e0cda7]">
            {character
              ? character.display_name
              : "Create a character"}
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#9e907d]">
            {character
              ? character.biography ||
                "Your character record has been created. More information can be added later."
              : "Build the person who will walk the streets of Sepulchria."}
          </p>

          <div className="mt-6 space-y-3 text-sm text-[#b4a58f]">
            <DashboardRow
              label="Character record"
              value={character ? "Created" : "Not created"}
            />

            <DashboardRow
              label="Approval"
              value={character?.status ?? "Unavailable"}
            />

            <DashboardRow
              label="Current location"
              value={character?.currentRoom?.name ?? "Not assigned"}
              last
            />
          </div>

          <Link
            href={character ? "/character" : "/character/create"}
            className="mt-7 inline-flex text-xs uppercase tracking-[0.22em] text-[#c59a5a] transition hover:text-[#ebcc91]"
          >
            {character ? "View character →" : "Begin creation →"}
          </Link>
        </article>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <DashboardCard
          symbol="✦"
          title="Latest chronicle"
          text="Read recent events, announcements and changes in the living world."
          href="#"
          disabled
        />

        <DashboardCard
          symbol="✉"
          title="Private messages"
          text={
            unreadMessageCount > 0
              ? `You have ${unreadMessageCount} unread message${
                  unreadMessageCount === 1 ? "" : "s"
                }.`
              : "Your private correspondence is fully read."
          }
          href="/messages"
        />

        <DashboardCard
          symbol="◉"
          title="City activity"
          text={`${onlineCharacterCount} active character${
            onlineCharacterCount === 1 ? "" : "s"
          } currently walk the city.`}
          href="/game"
        />
      </div>
    </div>
  );
}

function DashboardRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        last ? "" : "border-b border-[#5e4930]/30 pb-3"
      }`}
    >
      <span>{label}</span>
      <span className="text-right capitalize text-[#816a4b]">
        {value}
      </span>
    </div>
  );
}

function DashboardCard({
  symbol,
  title,
  text,
  href,
  disabled = false,
}: {
  symbol: string;
  title: string;
  text: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <article
      className={`h-full border border-[#604a31]/40 bg-[#15110e] p-5 transition ${
        disabled
          ? "opacity-70"
          : "hover:border-[#8d6d3e] hover:bg-[#1c1611]"
      }`}
    >
      <p className="text-2xl text-[#ae8750]">{symbol}</p>

      <h3 className="mt-4 font-serif text-xl text-[#d9c39c]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#948775]">{text}</p>

      <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-[#a48150]">
        {disabled ? "Coming soon" : "Open →"}
      </p>
    </article>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}