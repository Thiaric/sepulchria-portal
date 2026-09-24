"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type RaceAgeOption = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
};

export function NpcAdminAgeField({
  initialAge,
  initialRaceId,
  races,
}: {
  initialAge: number | null;
  initialRaceId: string;
  races: RaceAgeOption[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [raceId, setRaceId] = useState(initialRaceId);
  const [age, setAge] = useState(
    initialAge === null ? "" : String(initialAge),
  );

  useEffect(() => {
    const form = rootRef.current?.closest("form");

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const raceField = form.elements.namedItem("raceId");

    if (!(raceField instanceof HTMLSelectElement)) {
      return;
    }

    setRaceId(raceField.value);

    const onChange = () => {
      setRaceId(raceField.value);
    };

    raceField.addEventListener("change", onChange);

    return () => {
      raceField.removeEventListener("change", onChange);
    };
  }, []);

  const selectedRace = useMemo(
    () => races.find((race) => race.id === raceId) ?? null,
    [raceId, races],
  );

  return (
    <div
      ref={rootRef}
      data-admin-full-row="true"
      className="mb-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
    >
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        Age
      </p>

      <input
        type="number"
        name="age"
        value={age}
        onChange={(event) => setAge(event.target.value)}
        min={selectedRace?.min_age ?? undefined}
        max={selectedRace?.max_age ?? undefined}
        step={1}
        className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
      />

      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        {!selectedRace
          ? "Choose an ancestry below."
          : selectedRace.min_age === null
            ? `${selectedRace.name}: no configured age range`
            : selectedRace.max_age === null
              ? `${selectedRace.name}: ${selectedRace.min_age}+ years`
              : `${selectedRace.name}: ${selectedRace.min_age} - ${selectedRace.max_age} years`}
      </p>
    </div>
  );
}
