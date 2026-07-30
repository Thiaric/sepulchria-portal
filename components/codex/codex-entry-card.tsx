import Link from "next/link";

type CodexEntryCardProps = {
  name: string;
  slug: string;
  summary: string;
  hrefBase: string;
  imageUrl: string | null;
  iconUrl: string | null;
  colour: string | null;
  categoryLabel: string;
};

export function CodexEntryCard({
  name,
  slug,
  summary,
  hrefBase,
  imageUrl,
  iconUrl,
  colour,
  categoryLabel,
}: CodexEntryCardProps) {
  const accentColour = colour ?? "#8a6840";

  return (
    <article
      className="group relative flex min-h-[360px] flex-col overflow-hidden border border-[#60482e]/50 bg-[#15100d] transition duration-300 hover:-translate-y-1 hover:border-[#9a7344]/80 hover:shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
      style={{
        boxShadow: `inset 0 3px 0 ${accentColour}`,
      }}
    >
      <div className="relative h-44 overflow-hidden border-b border-[#60482e]/40 bg-[#0d0a08]">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-transparent to-black/20" />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(circle at top, ${accentColour}55 0%, #17100c 45%, #0d0907 100%)`,
            }}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#d0b58a]">
              {categoryLabel}
            </p>

            <h2 className="mt-2 font-serif text-2xl text-[#ead6ad]">
              {name}
            </h2>
          </div>

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-[#100c09]/90"
            style={{
              borderColor: `${accentColour}aa`,
            }}
          >
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="font-serif text-2xl"
                style={{ color: accentColour }}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex-1 text-sm leading-7 text-[#a99b89]">
          {summary || "No summary is currently available."}
        </p>

        <Link
          href={`${hrefBase}/${slug}`}
          className="mt-6 inline-flex items-center justify-between border border-[#765937] bg-[#271c12] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#dfc79c] transition hover:border-[#a17a45] hover:bg-[#3b2919]"
        >
          <span>Read entry</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}