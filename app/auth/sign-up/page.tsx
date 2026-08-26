import { AuthPageShell } from "@/components/auth-page-shell";
import { RegistrationClosedNotice } from "@/components/registration-closed-notice";
import { SignUpForm } from "@/components/sign-up-form";
import { getRegistrationsOpen } from "@/lib/registration/get-registrations-open";
import { getValidRegistrationInvitation } from "@/lib/registration/invitations";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    invite?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: Props) {
  const params = searchParams ? await searchParams : {};
  const registrationsOpen =
    await getRegistrationsOpen();

  const invitation =
    !registrationsOpen && params.invite
      ? await getValidRegistrationInvitation(params.invite)
      : null;

  if (!registrationsOpen && !invitation) {
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
      eyebrow={
        invitation
          ? "Your Invitation"
          : "Begin Your Chronicle"
      }
      title={
        invitation
          ? "The City Gates Open For You"
          : "Enter the Living World"
      }
      description={
        invitation
          ? "Your invitation allows you to create your Sepulchria account while public registrations remain closed."
          : "Create your account and take the first step toward forging a character, choosing an allegiance and shaping Sepulchria."
      }
    >
      <SignUpForm
        invitedEmail={invitation?.email ?? null}
        invitationToken={
          invitation ? params.invite ?? null : null
        }
      />
    </AuthPageShell>
  );
}
