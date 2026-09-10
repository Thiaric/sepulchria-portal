import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 auth_update_password_page_div_container">
      <div className="w-full max-w-sm auth_update_password_page_div_container_2">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
