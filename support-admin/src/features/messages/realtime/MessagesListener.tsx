"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useTransition } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { dashboardQueryKey } from "@/features/dashbord/queryKeys";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type MessageRealtimeRow = Record<string, unknown>;
type MessageRealtimePayload = RealtimePostgresChangesPayload<MessageRealtimeRow>;

export function MessagesListener() {
  const queryClient = useQueryClient();
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
          startTransition(() => {
            void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, startTransition]);

  return null;
}
