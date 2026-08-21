import Link from "next/link";

import { AuthPageShell } from "@/components/auth-page-shell";

export default function SignUpSuccessPage() {
  return (
    <AuthPageShell
      eyebrow="A Message Has Been Sent"
      title="Confirm Your Email"
      description="Your passage into Sepulchria has been prepared. One final seal must be broken before you may enter."
    >
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-8e693e))]/70 bg-[rgb(var(--sep-colour-2a1b10))]/70 font-serif text-2xl text-[rgb(var(--sep-colour-d9b478))] shadow-[0_0_28px_rgba(var(--sep-rgb-173-125-66),0.15)]">
          ✉
        </div>

        <p className="mt-6 text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-a08259))]">
          Confirmation required
        </p>

        <h3 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-e5cfa6))]">
          Check your inbox
        </h3>

        <p className="mt-4 text-sm leading-7 text-[rgb(var(--sep-colour-9f927f))]">
          Your account has been created successfully. We have sent you a
          confirmation link by email.
        </p>

        <div className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]/65 p-4 text-left">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8d704d))]">
            What happens next
          </p>

          <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
            Open the message from Sepulchria and follow the confirmation link (please check your spam or junk folder).
            Once your email has been verified, return here and sign in.
          </p>
        </div>

        <p className="mt-5 text-xs leading-6 text-[rgb(var(--sep-colour-776c5e))]">
          The message may take a few minutes to arrive. Check your spam or junk
          folder if you cannot see it.
        </p>

        <Link
          href="/auth/login"
          className="mt-7 inline-flex h-12 w-full items-center justify-center border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
        >
          Return to Login
        </Link>

        <Link
          href="/homepage"
          className="mt-4 inline-flex text-sm text-[rgb(var(--sep-colour-a78962))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
        >
          Return to the Chronicle
        </Link>
      </div>
    </AuthPageShell>
  );
}