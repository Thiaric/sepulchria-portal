"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead } from "../../actions";

export default function ConversationRealtime({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    void markConversationRead(conversationId);
    const channel = supabase
      .channel(`direct-conversation-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, () => {
        void markConversationRead(conversationId);
        router.refresh();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, router]);

  return null;
}
