import Link from "next/link";

export function RegistrationClosedNotice() {
  return (
    <div className="space-y-6">
      <div className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))]/70 p-6 text-center sm:p-8">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-a88658))]">
          The City Gates Are Closed
        </p>

        <h2 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-e6cfa3))] sm:text-3xl">
          Beta access is coming soon
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[rgb(var(--sep-colour-b8aa95))]">
          We will soon open the City Gates to 50 Beta testers. Stay tuned.
        </p>

        <div className="mx-auto mt-6 h-px w-28 bg-gradient-to-r from-transparent via-[rgb(var(--sep-colour-987344))] to-transparent" />

        <p className="mx-auto mt-5 max-w-lg text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
          Registrations are temporarily closed while Sepulchria prepares
          for its first limited Beta.
        </p>
      </div>

      <p className="text-center text-sm text-[rgb(var(--sep-colour-897d6c))]">
        Already registered?{" "}
        <Link
          href="/auth/login"
          className="text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
