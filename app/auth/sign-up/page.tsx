import { AuthPageShell } from "@/components/auth-page-shell";
import { SignUpForm } from "@/components/sign-up-form";

export default function SignUpPage() {
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
