import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Codex | Sepulchria" };

export default function CodexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0807] px-5 text-[#e8dcc4]">
      <section className="w-full max-w-3xl border border-[#654b30]/55 bg-[#15100c] p-8 text-center sm:p-12">
        <p className="text-[9px] uppercase tracking-[0.36em] text-[#8f704b]">Sepulchria</p>
        <h1 className="mt-4 font-serif text-5xl text-[#dfc89e]">Codex</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#9e907d]">The public Codex will gather the lore, peoples, associations and known history of Sepulchria.</p>
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-[#725f49]">Coming soon</p>
        <Link href="/homepage" className="mt-9 inline-flex border border-[#80603b] bg-[#24180f] px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-[#d9bd82] transition hover:border-[#b28650] hover:bg-[#332216]">← Return</Link>
      </section>
    </main>
  );
}
