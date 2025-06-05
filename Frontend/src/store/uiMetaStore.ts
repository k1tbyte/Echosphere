import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const isClientSide = typeof window !== 'undefined';

export interface IBreadcrumbData {
    href: string;
    label: string;
    active?: boolean;
}

export interface IUiMetadataState {
    // Sidebar state: true = open, false = collapsed, null = hidden on mobiles
    isSidebarOpen: boolean | null;
    breadcrumbs: IBreadcrumbData[];
    setSidebarOpen: (isOpen: boolean | null) => void;
    toggleSidebar: () => void;
    setBreadcrumbs: (breadcrumbs: IBreadcrumbData[]) => void;
    addBreadcrumb: (breadcrumb: IBreadcrumbData) => void;
    clearBreadcrumbs: () => void;
}

export const useUiMetaStore = create<IUiMetadataState>()(
    persist(
        (set) => ({
            isSidebarOpen: true,
            breadcrumbs: [],

            setSidebarOpen: (isOpen: boolean | null) => set({ isSidebarOpen: isOpen }),

            toggleSidebar: () => set((state) => ({
                isSidebarOpen: state.isSidebarOpen === null ? true : !state.isSidebarOpen
            })),

            setBreadcrumbs: (breadcrumbs: IBreadcrumbData[]) => set({ breadcrumbs }),

            addBreadcrumb: (breadcrumb: IBreadcrumbData) => set((state) => ({
                breadcrumbs: [...state.breadcrumbs, breadcrumb]
            })),

            clearBreadcrumbs: () => set({ breadcrumbs: [] }),
        }),
        {
            name: 'ui-metadata-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                isSidebarOpen: state.isSidebarOpen !== null ? state.isSidebarOpen : undefined
            }),
        }
    )
);

export const useSidebar = () => {
    const isSidebarOpen = useUiMetaStore((state) => state.isSidebarOpen);
    const setSidebarOpen = useUiMetaStore((state) => state.setSidebarOpen);
    const toggleSidebar = useUiMetaStore((state) => state.toggleSidebar);

    return { isSidebarOpen, setSidebarOpen, toggleSidebar };
};

export const useBreadcrumbs = () => {
    const breadcrumbs = useUiMetaStore((state) => state.breadcrumbs);
    const setBreadcrumbs = useUiMetaStore((state) => state.setBreadcrumbs);
    const addBreadcrumb = useUiMetaStore((state) => state.addBreadcrumb);
    const clearBreadcrumbs = useUiMetaStore((state) => state.clearBreadcrumbs);

    return { breadcrumbs, setBreadcrumbs, addBreadcrumb, clearBreadcrumbs };
};