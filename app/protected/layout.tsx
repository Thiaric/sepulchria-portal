import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center protected_layout_main_main">
      <div className="flex-1 w-full flex flex-col gap-20 items-center protected_layout_div_container">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 protected_layout_nav_navigation">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm protected_layout_div_container_2">
            <div className="flex gap-5 items-center font-semibold protected_layout_div_container_3">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2 protected_layout_div_container_4">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5 protected_layout_div_container_5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16 protected_layout_footer_footer">
          <p className="protected_layout_p_text">
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline protected_layout_a_supabase"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
