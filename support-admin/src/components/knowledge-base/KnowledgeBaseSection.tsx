"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { useToast } from "@/components/ui/ToastProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type KnowledgeDocument = {
  content: string | null;
  created_at: string;
  id: number;
  is_active: boolean;
  source: string | null;
  title: string;
  updated_at: string;
};

type SaveResult = {
  chunkCount: number;
  documentId: number;
  embeddingModel: string | null;
  ok: boolean;
};

type SaveFeedback = {
  message: string;
  tone: "error" | "success";
} | null;

type FormState = {
  content: string;
  documentId: number | null;
  isActive: boolean;
  source: string;
  title: string;
};

const ARTICLES_PER_PAGE = 6;

const emptyFormState: FormState = {
  content: "",
  documentId: null,
  isActive: true,
  source: "",
  title: "",
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function buildPreview(content: string | null) {
  const normalized = (content ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "No content preview available.";
  }

  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
}

async function parseFunctionError(error: Error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const response = error.context;
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (typeof data === "string") {
          return data;
        }

        if (data && typeof data === "object" && "error" in data) {
          return String(data.error);
        }

        return JSON.stringify(data);
      }

      return await response.text();
    } catch {
      return "Edge Function returned a non-2xx status code.";
    }
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return error.message;
  }

  return error.message;
}

export function KnowledgeBaseSection() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [toggleDocumentId, setToggleDocumentId] = useState<number | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("id, title, source, is_active, created_at, updated_at, content")
      .order("updated_at", { ascending: false });

    if (error) {
      setDocuments([]);
      setLoadError(error.message);
      setIsLoading(false);
      return [] as KnowledgeDocument[];
    }

    const nextDocuments = (data ?? []) as KnowledgeDocument[];
    setDocuments(nextDocuments);
    setIsLoading(false);
    return nextDocuments;
  }, [supabase]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(documents.length / ARTICLES_PER_PAGE));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, documents.length]);

  const totalPages = Math.max(1, Math.ceil(documents.length / ARTICLES_PER_PAGE));
  const pageStart = (currentPage - 1) * ARTICLES_PER_PAGE;
  const pageDocuments = documents.slice(pageStart, pageStart + ARTICLES_PER_PAGE);
  const isEditMode = formState.documentId !== null;

  const resetForm = () => {
    setFormState(emptyFormState);
    setSaveFeedback(null);
  };

  const clearFormFields = () => {
    setFormState(emptyFormState);
  };

  const applyDocumentToForm = (document: KnowledgeDocument) => {
    setFormState({
      content: document.content ?? "",
      documentId: document.id,
      isActive: document.is_active,
      source: document.source ?? "",
      title: document.title,
    });
    setSaveFeedback(null);
  };

  const persistDocument = async ({
    content,
    documentId,
    isActive,
    source,
    title,
  }: FormState) => {
    const { data, error } = await supabase.functions.invoke("upsert-knowledge-document", {
      body: {
        ...(documentId ? { documentId } : {}),
        content,
        isActive,
        source: source.trim() || null,
        title,
      },
    });

    if (error) {
      throw new Error(await parseFunctionError(error));
    }

    return (data ?? null) as SaveResult | null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = formState.title.trim();
    const content = formState.content.trim();

    if (!title || !content || isSaving) {
      if (!title || !content) {
        const message = "Title and content are required.";
        setSaveFeedback({ message, tone: "error" });
        showToast(message, "error");
      }

      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const result = await persistDocument({
        ...formState,
        content,
        source: formState.source.trim(),
        title,
      });

      const savedId = result?.documentId ?? formState.documentId;
      const successMessage = isEditMode
        ? `Article updated. Chunks rebuilt: ${result?.chunkCount ?? 0}.`
        : `Article created. Chunks built: ${result?.chunkCount ?? 0}.`;

      setSaveFeedback({ message: successMessage, tone: "success" });
      showToast(successMessage);

      const nextDocuments = await loadDocuments();

      if (isEditMode && savedId) {
        const refreshedDocument = nextDocuments.find((document) => document.id === savedId);

        if (refreshedDocument) {
          applyDocumentToForm(refreshedDocument);
        }
      } else {
        clearFormFields();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save article.";
      setSaveFeedback({ message, tone: "error" });
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (document: KnowledgeDocument) => {
    if (toggleDocumentId || deleteDocumentId || isSaving) {
      return;
    }

    setToggleDocumentId(document.id);
    setSaveFeedback(null);

    try {
      const nextIsActive = !document.is_active;
      const result = await persistDocument({
        content: document.content ?? "",
        documentId: document.id,
        isActive: nextIsActive,
        source: document.source ?? "",
        title: document.title,
      });

      showToast(
        nextIsActive
          ? `Article activated. Chunks rebuilt: ${result?.chunkCount ?? 0}.`
          : `Article deactivated. Chunks rebuilt: ${result?.chunkCount ?? 0}.`,
      );

      await loadDocuments();

      if (formState.documentId === document.id) {
        setFormState((current) => ({
          ...current,
          isActive: nextIsActive,
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update article status.";
      setSaveFeedback({ message, tone: "error" });
      showToast(message, "error");
    } finally {
      setToggleDocumentId(null);
    }
  };

  const handleDeleteDocument = async (document: KnowledgeDocument) => {
    if (deleteDocumentId || toggleDocumentId || isSaving) {
      return;
    }

    const confirmed = window.confirm(
      `Delete article "${document.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteDocumentId(document.id);
    setSaveFeedback(null);

    try {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", document.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Article was not deleted.");
      }

      showToast("Article deleted.");

      const nextDocuments = await loadDocuments();

      if (formState.documentId === document.id) {
        resetForm();
      }

      if (nextDocuments.length === 0) {
        setCurrentPage(1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete article.";
      setSaveFeedback({ message, tone: "error" });
      showToast(message, "error");
    } finally {
      setDeleteDocumentId(null);
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_24rem]">
      <section className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.78))] p-4 shadow-[0_16px_44px_rgba(2,6,23,0.34)] backdrop-blur sm:p-5">
        <div className="flex flex-col gap-2 border-b border-slate-900/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Retrieval Source
            </p>
            <h2 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-100 sm:text-[1.15rem]">
              Knowledge Base Articles
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Articles are chunked and embedded on the backend by the save function.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1">
              {documents.length} article{documents.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[1rem] border border-slate-800/80 bg-slate-950/55 p-4"
                >
                  <div className="h-4 w-40 rounded bg-slate-800" />
                  <div className="mt-3 h-3 w-28 rounded bg-slate-900" />
                  <div className="mt-4 h-3 w-full rounded bg-slate-900" />
                  <div className="mt-2 h-3 w-[82%] rounded bg-slate-900" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-[1rem] border border-red-500/20 bg-[linear-gradient(180deg,rgba(69,10,10,0.48),rgba(127,29,29,0.18))] px-4 py-4 shadow-[0_12px_34px_rgba(69,10,10,0.14)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-300">
                Load Error
              </p>
              <p className="mt-2 text-sm leading-6 text-red-100">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadDocuments()}
                className="mt-4 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-50 transition hover:bg-red-500/20"
              >
                Retry
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-sm font-medium text-slate-300">Knowledge base is empty.</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Create the first article so managers can maintain retrieval content from the admin panel.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {pageDocuments.map((document) => {
                  const isTogglePending = toggleDocumentId === document.id;
                  const isDeletePending = deleteDocumentId === document.id;

                  return (
                    <article
                      key={document.id}
                      className={[
                        "rounded-[1rem] border p-4 shadow-[0_12px_30px_rgba(2,6,23,0.24)] transition",
                        document.is_active
                          ? "border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.7),rgba(15,23,42,0.68))]"
                          : "border-slate-900 bg-[linear-gradient(180deg,rgba(2,6,23,0.45),rgba(15,23,42,0.42))] opacity-70",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-100">
                              {document.title}
                            </h3>
                            <span
                              className={[
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                                document.is_active
                                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                                  : "border-slate-700 bg-slate-900/80 text-slate-400",
                              ].join(" ")}
                            >
                              {document.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span>Source: {document.source || "—"}</span>
                            <span>Created: {dateFormatter.format(new Date(document.created_at))}</span>
                            <span>Updated: {dateFormatter.format(new Date(document.updated_at))}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(document)}
                            disabled={isTogglePending || isDeletePending || isSaving}
                            className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[12px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-500"
                          >
                            {isTogglePending
                              ? "Saving..."
                              : document.is_active
                                ? "Set inactive"
                                : "Set active"}
                          </button>
                          <button
                            type="button"
                            onClick={() => applyDocumentToForm(document)}
                            disabled={isDeletePending || isSaving}
                            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[12px] font-semibold text-sky-100 transition hover:bg-sky-500/20"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(document)}
                            disabled={isDeletePending || isTogglePending || isSaving}
                            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500"
                          >
                            {isDeletePending ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 rounded-[0.9rem] border border-white/5 bg-black/10 px-3.5 py-3 text-[13px] leading-6 text-slate-300">
                        {buildPreview(document.content)}
                      </p>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[0.9rem] border border-slate-800 bg-slate-950/55 px-3 py-2">
                <p className="text-[12px] text-slate-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[12px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[12px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <aside className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.86),rgba(15,23,42,0.76))] p-4 shadow-[0_16px_44px_rgba(2,6,23,0.3)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Editor
            </p>
            <h2 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-100">
              {isEditMode ? "Edit Article" : "Create Article"}
            </h2>
          </div>

          {isEditMode ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[12px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
            >
              New article
            </button>
          ) : null}
        </div>

        {saveFeedback ? (
          <div
            className={[
              "mt-4 rounded-[0.95rem] border px-3.5 py-3 text-sm",
              saveFeedback.tone === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-50"
                : "border-red-500/20 bg-red-500/10 text-red-50",
            ].join(" ")}
          >
            {saveFeedback.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-200">Title</span>
            <input
              type="text"
              value={formState.title}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              disabled={isSaving}
              required
              className="mt-2 w-full rounded-[0.9rem] border border-slate-800 bg-slate-950/75 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
              placeholder="How training works"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-slate-200">Source</span>
            <input
              type="text"
              value={formState.source}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
              disabled={isSaving}
              className="mt-2 w-full rounded-[0.9rem] border border-slate-800 bg-slate-950/75 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
              placeholder="internal_manual"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-slate-200">Content</span>
            <textarea
              value={formState.content}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              disabled={isSaving}
              required
              rows={14}
              className="mt-2 w-full resize-y rounded-[0.9rem] border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
              placeholder="Full article text..."
            />
          </label>

          <label className="flex items-center gap-3 rounded-[0.9rem] border border-slate-800 bg-slate-950/55 px-3 py-3">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              disabled={isSaving}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400"
            />
            <div>
              <p className="text-[12px] font-semibold text-slate-100">Active article</p>
              <p className="mt-0.5 text-[12px] text-slate-400">
                Only active articles participate in retrieval.
              </p>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isSaving || deleteDocumentId !== null}
              className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-[12px] font-semibold text-sky-50 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500"
            >
              {isSaving ? "Saving..." : isEditMode ? "Save changes" : "Create article"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving || deleteDocumentId !== null}
              className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-[12px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              Clear form
            </button>
          </div>
        </form>
      </aside>
    </section>
  );
}
