"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, WarningCircle, Info, Warning, X } from "@phosphor-icons/react";

type Tone = "success" | "error" | "info" | "warning";
type ToastData = { id: number; tone: Tone; message: string; duration: number };
type Opts = { duration?: number };
type ToastApi = {
  success: (message: string, opts?: Opts) => void;
  error: (message: string, opts?: Opts) => void;
  info: (message: string, opts?: Opts) => void;
  warning: (message: string, opts?: Opts) => void;
};

const DEFAULT_DURATION = 10_000; // 10 ثوانٍ للنجاح/المعلومة/التحذير (الخطأ لا يُجدوَل)
const MAX_TOASTS = 5;            // سقف المكدّس — عند التجاوز يُزال الأقدم كي لا تتراكم

const ToastCtx = createContext<ToastApi | null>(null);
export function useToast(): ToastApi {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast يجب أن يكون داخل <ToastProvider>");
  return c;
}

const ICON: Record<Tone, React.ReactNode> = {
  success: <Check aria-hidden />,
  error: <WarningCircle aria-hidden />,
  info: <Info aria-hidden />,
  warning: <Warning aria-hidden />,
};

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: (id: number) => void }) {
  return (
    <div className={"toast tt-" + toast.tone} role={toast.tone === "error" ? "alert" : "status"}>
      <span className="tic">{ICON[toast.tone]}</span>
      <span className="tmsg">{toast.message}</span>
      <button type="button" className="tx" onClick={() => onClose(toast.id)} aria-label="إغلاق"><X aria-hidden /></button>
      {toast.tone !== "error" && (
        <i className="tprog" style={{ animationDuration: toast.duration + "ms" }} onAnimationEnd={() => onClose(toast.id)} />
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);
  useEffect(() => setMounted(true), []);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((tone: Tone, message: string, opts?: Opts) => {
    const id = ++idRef.current;
    // إضافة التوست مع سقف المكدّس: الاحتفاظ بأحدث MAX_TOASTS فقط (يُزال الأقدم)
    setToasts((t) => [...t, { id, tone, message, duration: opts?.duration ?? DEFAULT_DURATION }].slice(-MAX_TOASTS));
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    info: (m, o) => push("info", m, o),
    warning: (m, o) => push("warning", m, o),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {mounted && createPortal(
        <div className="toast-stack">
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onClose={remove} />)}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}
