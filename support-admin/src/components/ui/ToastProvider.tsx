"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastTone = "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const TOAST_TIMEOUT_MS = 2200;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastIdRef = useRef(1);

  const removeToast = useCallback((toastId: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const toastId = nextToastIdRef.current++;

      setToasts((currentToasts) => [...currentToasts, { id: toastId, message, tone }]);

      window.setTimeout(() => {
        removeToast(toastId);
      }, TOAST_TIMEOUT_MS);
    },
    [removeToast],
  );

  const contextValue = useMemo(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-[0_18px_40px_rgba(2,6,23,0.34)] backdrop-blur",
              toast.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-50"
                : "border-red-500/30 bg-red-500/12 text-red-50",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md px-1 text-base leading-none text-white/65 transition hover:text-white"
                aria-label="Закрыть уведомление"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
