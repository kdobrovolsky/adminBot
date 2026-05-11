"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/messages/DashboardHeader";
import { MessagesDashboard } from "@/components/messages/MessagesDashboard";
import { KnowledgeBaseSection } from "@/components/knowledge-base/KnowledgeBaseSection";
import type { DialogViewModel, ManagerSummary } from "@/types/message";

type AdminWorkspaceProps = {
  currentManagerId: number | null;
  currentUserId: string | null;
  dialogs: DialogViewModel[];
  managers?: ManagerSummary[];
};

type AdminTabId = "ai-integration" | "knowledge-base";

const tabs: Array<{ description: string; id: AdminTabId; label: string }> = [
  {
    id: "ai-integration",
    label: "AI Integration",
    description: "Dialogs, assignments and AI interaction priority.",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    description: "Articles used for retrieval, chunking and embeddings on the backend.",
  },
];

export function AdminWorkspace({
  currentManagerId,
  currentUserId,
  dialogs,
  managers,
}: AdminWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<AdminTabId>("ai-integration");
  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <>
      <DashboardHeader
        description={activeTabMeta.description}
        title={activeTabMeta.label}
      />

      <section className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.78))] p-2 shadow-[0_14px_36px_rgba(2,6,23,0.24)]">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "inline-flex items-center rounded-full border px-4 py-2 text-[12px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  isActive
                    ? "border-sky-400/45 bg-sky-400/15 text-sky-50 shadow-[0_10px_28px_rgba(14,165,233,0.16)]"
                    : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "ai-integration" ? (
        <MessagesDashboard
          currentManagerId={currentManagerId}
          currentUserId={currentUserId}
          dialogs={dialogs}
          managers={managers}
        />
      ) : (
        <KnowledgeBaseSection />
      )}
    </>
  );
}
