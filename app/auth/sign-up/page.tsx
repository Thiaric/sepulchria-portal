import { AuthPageShell } from "@/components/auth-page-shell";
import { RegistrationClosedNotice } from "@/components/registration-closed-notice";
import { SignUpForm } from "@/components/sign-up-form";
import { getRegistrationsOpen } from "@/lib/registration/get-registrations-open";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const registrationsOpen =
    await getRegistrationsOpen();

  if (!registrationsOpen) {
    return (
      <AuthPageShell
        eyebrow="The City Gates"
        title="Registrations are currently closed"
        description="Sepulchria is accepting applications for its closed Alpha."
      >
        <RegistrationClosedNotice />
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      eyebrow="Begin Your Chronicle"
      title="Enter the Living World"
      description="Create your account and take the first step toward forging a character, choosing an allegiance and shaping Sepulchria."
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
