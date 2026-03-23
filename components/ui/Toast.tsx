"use client"

import { useToastStore } from "@/lib/store/toastStore"

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 rounded px-4 py-2 text-sm shadow-lg ${
            toast.type === "error"
              ? "bg-red-900 text-red-100"
              : "bg-neutral-800 text-neutral-100"
          }`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
