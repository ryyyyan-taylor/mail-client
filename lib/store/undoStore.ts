import { create } from "zustand"

export interface UndoEntry {
  description: string
  threadIds: string[]
  addLabelIds: string[]
  removeLabelIds: string[]
  trashed: boolean // if true, undo needs untrash API
  label: string // which label view to invalidate
}

const MAX_UNDO = 5

interface UndoStore {
  stack: UndoEntry[]
  push: (entry: UndoEntry) => void
  pop: () => UndoEntry | undefined
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  stack: [],
  push: (entry) =>
    set({ stack: [entry, ...get().stack].slice(0, MAX_UNDO) }),
  pop: () => {
    const [top, ...rest] = get().stack
    if (!top) return undefined
    set({ stack: rest })
    return top
  },
}))
