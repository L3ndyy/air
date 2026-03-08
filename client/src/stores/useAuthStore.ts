import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  _id: string
  username: string
}

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User | null, token?: string | null) => void
  logout: () => void
}

const STORAGE_KEY = 'air-auth'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token = null) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: STORAGE_KEY }
  )
)
