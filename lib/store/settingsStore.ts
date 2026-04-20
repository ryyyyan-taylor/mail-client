import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SettingsStore {
  demoMode: boolean
  setDemoMode: (v: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      demoMode: false,
      setDemoMode: (demoMode) => set({ demoMode }),
    }),
    { name: "vimmail-settings" }
  )
)
