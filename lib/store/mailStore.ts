import { create } from "zustand"

interface MailStore {
  cursorIndex: number
  selectionAnchor: number | null
  selectedIds: Set<string>
  activeThreadId: string | null

  setCursor: (index: number) => void
  setActiveThread: (id: string | null) => void
  enterVisualMode: () => void
  extendSelection: (ids: string[], cursorIndex: number) => void
  clearSelection: () => void
}

export const useMailStore = create<MailStore>((set, get) => ({
  cursorIndex: 0,
  selectionAnchor: null,
  selectedIds: new Set(),
  activeThreadId: null,

  setCursor: (index) => set({ cursorIndex: index }),

  setActiveThread: (id) => set({ activeThreadId: id }),

  enterVisualMode: () => {
    const { cursorIndex } = get()
    set({ selectionAnchor: cursorIndex })
  },

  extendSelection: (ids, cursorIndex) =>
    set({ selectedIds: new Set(ids), cursorIndex }),

  clearSelection: () =>
    set({ selectionAnchor: null, selectedIds: new Set() }),
}))
