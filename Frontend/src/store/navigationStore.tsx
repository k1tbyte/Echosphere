import { create } from 'zustand';

interface NavigationState {
    data: any;
    setData: (data: any) => void;
    clearData: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    data: null,
    setData: (data) => set({ data }),
    clearData: () => set({ data: null }),
}));