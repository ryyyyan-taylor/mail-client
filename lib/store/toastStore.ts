import { create } from "zustand"

export interface Toast {
  id: string
  message: string
  type: "success" | "error"
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: "success" | "error") => void
  removeToast: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "success") => {
    const id = String(++nextId)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
