import type { ManagerSummary } from "@/types/message";

export function resolveCurrentManagerId(
    managers: ManagerSummary[],
    user: { email?: string | null; id: string },
): number | null {
    const byAuthUserId = managers.find((manager) => manager.auth_user_id === user.id);

    if (byAuthUserId) {
        return byAuthUserId.id;
    }

    const normalizedEmail = user.email?.trim().toLowerCase();

    if (!normalizedEmail) {
        return null;
    }

    const byEmail = managers.find(
        (manager) => manager.email?.trim().toLowerCase() === normalizedEmail,
    );

    return byEmail?.id ?? null;
}