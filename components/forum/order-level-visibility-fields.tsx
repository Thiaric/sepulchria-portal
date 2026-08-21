import {
  ORDER_LEVELS,
  type OrderLevel,
} from "@/lib/forum/order-levels";

export function OrderLevelVisibilityFields({
  actorLevel,
  unrestricted,
  defaultLevels = [...ORDER_LEVELS],
}: {
  actorLevel: OrderLevel | null;
  unrestricted: boolean;
  defaultLevels?: number[];
}) {
  const selected = new Set(defaultLevels);

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        Order visibility
      </p>

      <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">
        Visible to Levels
      </h3>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Choose which Order Levels may see and open this discussion.
        Higher Levels that are mandatory for your rank cannot be removed.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ORDER_LEVELS.map((level) => {
          const forced =
            !unrestricted &&
            actorLevel !== null &&
            level >= actorLevel;

          const defaultChecked =
            forced || selected.has(level);

          return (
            <label
              key={level}
              className={`flex items-center gap-2 border px-3 py-2 ${
                forced
                  ? "border-[rgb(var(--sep-colour-8b673d))]/65 bg-[rgb(var(--sep-colour-2a1d12))]"
                  : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
              }`}
            >
              <input
                type="checkbox"
                name="visibleOrderLevels"
                value={level}
                defaultChecked={defaultChecked}
                disabled={forced}
                className="h-4 w-4 accent-[rgb(var(--sep-colour-9b7446))]"
              />

              {forced ? (
                <input
                  type="hidden"
                  name="visibleOrderLevels"
                  value={level}
                />
              ) : null}

              <span className="text-[9px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-b49a75))]">
                Level {level}
              </span>
            </label>
          );
        })}
      </div>

      {!unrestricted && actorLevel !== null ? (
        <p className="mt-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-756957))]">
          As Level {actorLevel}, Levels {actorLevel}–6 are always included.
        </p>
      ) : (
        <p className="mt-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-756957))]">
          You may choose any non-empty combination of Levels 1–6.
        </p>
      )}
    </section>
  );
}
