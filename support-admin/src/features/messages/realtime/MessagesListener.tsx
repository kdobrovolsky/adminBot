"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type MessageRealtimeRow = Record<string, unknown>;
type MessageRealtimePayload = RealtimePostgresChangesPayload<MessageRealtimeRow>;

export function MessagesListener() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload: MessageRealtimePayload) => {
          console.log("Realtime payload:", payload);
          startTransition(() => router.refresh());
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, startTransition]);

  return null;
}
