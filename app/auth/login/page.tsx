import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <AuthPageShell
      eyebrow="The Gates Await"
      title="Return to Sepulchria"
      description="Present your credentials and step once more into the city built from divine remains."
    >
      <LoginForm />
    </AuthPageShell>
  );
}
