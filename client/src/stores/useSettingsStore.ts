import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  isDark: boolean
  soundEnabled: boolean
  setDark: (value: boolean) => void
  toggleDark: () => void
  setSoundEnabled: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isDark: false,
      soundEnabled: true,
      setDark: (value) => set({ isDark: value }),
      toggleDark: () => set((s) => ({ isDark: !s.isDark })),
      setSoundEnabled: (value) => set({ soundEnabled: value }),
    }),
    { name: 'air-settings' }
  )
)
