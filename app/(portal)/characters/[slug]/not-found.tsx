import Link from "next/link";

export default function CharacterNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <section className="w-full max-w-xl border border-[#60482e]/50 bg-[#15100d] p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#886b48]">
          Character archive
        </p>

        <h1 className="mt-4 font-serif text-3xl text-[#dfc9a3]">
          Character not found
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#9f9282]">
          This character does not exist, is not
          currently approved, or is no longer
          publicly available.
        </p>

        <Link
          href="/game"
          className="mt-7 inline-flex border border-[#765937] bg-[#271c12] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[#dfc79c] transition hover:border-[#b28a52] hover:bg-[#342419]"
        >
          Return to the game
        </Link>
      </section>
    </div>
  );
}