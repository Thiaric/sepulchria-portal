import { Suspense, type ReactNode } from "react";

import { PortalHeader } from "@/components/portal/portal-header";
import { PortalPresenceHeartbeat } from "@/components/portal/portal-presence-heartbeat";
import { PortalResponsiveRightSidebar } from "@/components/portal/portal-responsive-right-sidebar";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { createClient } from "@/lib/supabase/server";

type PortalLayoutProps = {
  children: ReactNode;
};

export default function PortalLayout({
  children,
}: PortalLayoutProps) {
  return (
    <Suspense fallback={<PortalLoadingShell />}>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </Suspense>
  );
}

async function PortalLayoutContent({
  children,
}: PortalLayoutProps) {
  const context = await getPortalContext();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadForumCount = 0;
  if (user) {
    const {
      data: unreadForumResult,
      error: unreadForumError,
    } = await supabase.rpc(
      "get_unread_forum_topic_count",
    );

    if (!unreadForumError) {
      if (
        typeof unreadForumResult === "number" &&
        Number.isFinite(unreadForumResult)
      ) {
        unreadForumCount = unreadForumResult;
      } else if (
        typeof unreadForumResult === "string"
      ) {
        const parsedCount = Number.parseInt(
          unreadForumResult,
          10,
        );

        if (Number.isFinite(parsedCount)) {
          unreadForumCount = parsedCount;
        }
      }
    }
  }

  const presenceEnabled =
    context.character?.status === "approved";

  return (
    <div className="min-h-screen bg-[#120f0d] text-[#e8dcc4]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(116,82,42,0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
        <PortalPresenceHeartbeat
          enabled={presenceEnabled}
        />

        <PortalHeader context={context} />

        <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_300px]">
          <PortalSidebar
            unreadMessageCount={
              context.unreadMessageCount
            }
            unreadForumCount={
              unreadForumCount
            }
          />

          <main className="min-w-0">
            {children}
          </main>

          <PortalResponsiveRightSidebar
            context={context}
          />
        </div>
      </div>
    </div>
  );
}

function PortalLoadingShell() {
  return (
    <div className="min-h-screen bg-[#120f0d] text-[#e8dcc4]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(116,82,42,0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
        <header className="h-20 animate-pulse border-b border-[#6e5535]/40 bg-[#0d0b0a]" />

        <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_300px]">
          <aside className="hidden min-h-[calc(100vh-5rem)] animate-pulse border-r border-[#6e5535]/30 bg-[#100d0b] lg:block" />

          <main className="p-5 sm:p-7 lg:p-9">
            <div className="h-4 w-52 animate-pulse bg-[#2c2118]" />
            <div className="mt-5 h-12 max-w-xl animate-pulse bg-[#2c2118]" />
            <div className="mt-5 h-5 max-w-2xl animate-pulse bg-[#211914]" />

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="h-64 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
              <div className="h-64 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="h-44 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
              <div className="h-44 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
              <div className="h-44 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
            </div>
          </main>

          <aside className="hidden min-h-[calc(100vh-5rem)] animate-pulse border-l border-[#6e5535]/30 bg-[#100d0b] xl:block" />
        </div>
      </div>
    </div>
  );
}
