import { AuthPageShell } from "@/components/auth-page-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      eyebrow="Recover Your Passage"
      title="Restore Your Access"
      description="Enter the email bound to your account. A sealed link will be sent so you can choose a new password and return to Sepulchria."
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
