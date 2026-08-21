"use client";

export function ShapeDeleteSubmit({ shapeName }: { shapeName: string }) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(`Delete "${shapeName}"?\n\nThis cannot be undone.`)) {
          event.preventDefault();
        }
      }}
      className="border border-red-900/60 bg-red-950/15 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-400 transition hover:border-red-700 hover:bg-red-950/30"
    >
      Delete Shape
    </button>
  );
}
