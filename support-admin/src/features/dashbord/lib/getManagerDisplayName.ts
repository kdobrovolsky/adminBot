import type { ManagerSummary } from "@/types/message";

export function getManagerDisplayName(manager: ManagerSummary | undefined): string | null {
    if (!manager) {
        return null;
    }

    const fullName = [manager.first_name?.trim(), manager.last_name?.trim()]
        .filter(Boolean)
        .join(" ");

    return fullName || manager.email?.trim() || `Manager #${manager.id}`;
}