import Link from "next/link";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const staff = await requireStaff();
  const supabase = await createClient();

  const [
    charactersResult,
    submittedResult,
    approvedResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("characters")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "submitted"),

    supabase
      .from("characters")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "approved"),
  ]);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="max-w-5xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
          Staff control centre
        </p>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#a99b89]">
          Manage characters, approvals, ancestries,
          associations and other game data from
          this protected area.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatisticCard
            label="All characters"
            value={charactersResult.count ?? 0}
          />

          <StatisticCard
            label="Awaiting review"
            value={submittedResult.count ?? 0}
          />

          <StatisticCard
            label="Approved"
            value={approvedResult.count ?? 0}
          />
        </div>

        <section className="mt-8 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[#876a46]">
            Character administration
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#dec89f]">
            Manage the population of Sepulchria
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a99b89]">
            Assign ancestries and associations, change
            approval status and update public
            character titles.
          </p>

          <Link
            href="/admin/characters"
            className="mt-6 inline-flex items-center gap-3 border border-[#987344] bg-[#3b2919] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
          >
            Manage characters
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <p className="mt-6 text-[10px] text-[#756957]">
          Signed in with staff role:{" "}
          <span className="uppercase text-[#b79c73]">
            {staff.role}
          </span>
        </p>
      </div>
    </main>
  );
}

function StatisticCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[#60482e]/45 bg-[#15100d] p-5">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        {label}
      </p>

      <p className="mt-3 font-serif text-4xl text-[#e1cba3]">
        {value}
      </p>
    </div>
  );
}