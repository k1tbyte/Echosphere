import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ISettingsState {
    autoVideoRedirect: boolean;
}

export const useSettingsStore = create<ISettingsState>()(
    persist(
        (set) => ({
            autoVideoRedirect: true,
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                autoVideoRedirect: state.autoVideoRedirect,
            }),
        }
    )
)