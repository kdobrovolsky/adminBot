"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ManagerSummary } from "@/types/message";

async function getCurrentManager(): Promise<ManagerSummary | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("manager_details")
    .select("id, auth_user_id, email, first_name, last_name, company_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    auth_user_id: data.auth_user_id,
    company_role: data.company_role,
    email: data.email ?? user.email ?? null,
    first_name: data.first_name,
    id: data.id,
    last_name: data.last_name,
  };
}

export async function assignClientToManagerAction({
  clientId,
  newManagerId,
  reassignmentReason,
}: {
  clientId: string;
  newManagerId: string;
  reassignmentReason?: string;
}): Promise<ActionResult> {
  if (!clientId || !newManagerId) {
    return {
      error: "Client and manager are required.",
      success: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const currentManager = await getCurrentManager();

  if (!currentManager) {
    return {
      error: "Current user is not linked to public.manager_details.",
      success: null,
    };
  }

  const { error } = await supabase.functions.invoke("assign-client-to-manager", {
    body: {
      changedByManagerId: currentManager.id,
      clientId,
      newManagerId,
      reassignmentReason: reassignmentReason?.trim() || undefined,
    },
  });

  if (error) {
    return {
      error: `Failed to assign client: ${error.message}`,
      success: null,
    };
  }

  revalidatePath("/");

  return {
    error: null,
    success: "Client assignment updated.",
  };
}

export async function sendManagerMessageAction({
  clientId,
  text,
}: {
  clientId: string;
  text: string;
}): Promise<ActionResult> {
  if (!clientId || !text.trim()) {
    return {
      error: "Client and message text are required.",
      success: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const currentManager = await getCurrentManager();

  if (!currentManager) {
    return {
      error: "Current user is not linked to public.manager_details.",
      success: null,
    };
  }

  const { error } = await supabase.functions.invoke("manager-send-message", {
    body: {
      clientId,
      managerId: currentManager.id,
      text: text.trim(),
    },
  });

  if (error) {
    return {
      error: `Failed to send message: ${error.message}`,
      success: null,
    };
  }

  revalidatePath("/");

  return {
    error: null,
    success: "Message sent.",
  };
}

export async function sendManagerMessageFormAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  return sendManagerMessageAction({
    clientId,
    text,
  });
}
