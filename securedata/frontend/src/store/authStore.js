import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      pendingOTPUserId: null,
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      
      login: (userData, token) => {
        set({
          user: userData,
          token: token,
          isAuthenticated: true,
          pendingOTPUserId: null
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          pendingOTPUserId: null
        });
      },
      
      setPendingOTP: (userId) => {
        set({ pendingOTPUserId: userId });
      },
      
      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },
      
      setTheme: (theme) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, theme } });
        }
      }
    }),
    {
      name: 'securedata-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        pendingOTPUserId: state.pendingOTPUserId
      })
    }
  )
);

export default useAuthStore;
