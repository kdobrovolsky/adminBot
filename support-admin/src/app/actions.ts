"use server";

import { revalidatePath } from "next/cache";
import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";
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

async function buildFunctionsHttpErrorResult(
  prefix: string,
  error: FunctionsHttpError,
): Promise<ActionResult> {
  let details = "";

  try {
    const response = error.context;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      details = typeof data === "string" ? data : JSON.stringify(data);
    } else {
      details = await response.text();
    }
  } catch {}

  return {
    error: details
      ? `${prefix}: ${details}`
      : `${prefix}: Edge Function returned a non-2xx status code.`,
    success: null,
  };
}

async function assignClientToManagerInternal({
  changedByManagerId,
  clientId,
  newManagerId,
  reassignmentReason,
}: {
  changedByManagerId: number;
  clientId: number;
  newManagerId: number;
  reassignmentReason?: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.functions.invoke("assign-client-to-manager", {
    body: {
      changedByManagerId,
      clientId,
      newManagerId,
      reassignmentReason: reassignmentReason?.trim() || undefined,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      return buildFunctionsHttpErrorResult("Failed to assign client", error);
    }

    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      return {
        error: `Failed to assign client: ${error.message}`,
        success: null,
      };
    }

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

export async function assignClientToManagerAction({
  clientId,
  newManagerId,
  reassignmentReason,
}: {
  clientId: string;
  newManagerId: string;
  reassignmentReason?: string;
}): Promise<ActionResult> {
  const parsedClientId = Number(clientId);
  const parsedManagerId = Number(newManagerId);

  if (!Number.isInteger(parsedClientId) || !Number.isInteger(parsedManagerId)) {
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

  return assignClientToManagerInternal({
    changedByManagerId: currentManager.id,
    clientId: parsedClientId,
    newManagerId: parsedManagerId,
    reassignmentReason,
  });
}

export async function sendManagerMessageAction({
  clientId,
  text,
}: {
  clientId: string;
  text: string;
}): Promise<ActionResult> {
  const parsedClientId = Number(clientId);

  if (!Number.isInteger(parsedClientId) || !text.trim()) {
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
      clientId: parsedClientId,
      managerId: currentManager.id,
      text: text.trim(),
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      return buildFunctionsHttpErrorResult("Failed to send message", error);
    }

    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      return {
        error: `Failed to send message: ${error.message}`,
        success: null,
      };
    }

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

export async function takeClientInWorkFormAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientId = Number(String(formData.get("clientId") ?? "").trim());

  if (!Number.isInteger(clientId)) {
    return {
      error: "Client is required.",
      success: null,
    };
  }

  const currentManager = await getCurrentManager();

  if (!currentManager) {
    return {
      error: "Current user is not linked to public.manager_details.",
      success: null,
    };
  }

  return assignClientToManagerInternal({
    changedByManagerId: currentManager.id,
    clientId,
    newManagerId: currentManager.id,
  });
}
