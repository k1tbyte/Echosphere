"use client";

import {RxStore, useStoreState} from "@/shared/lib/rxStore";

export const isClientSide = typeof window !== "undefined";

export interface IBreadcrumbData {
    href: string;
    label: string;
}

export interface IUiMetadata {
    isSidebarOpen: boolean | null;
    breadcrumbs: IBreadcrumbData[];
}


export let uiStore: RxStore<IUiMetadata> = new RxStore<IUiMetadata>({
    breadcrumbs: [],
    isSidebarOpen: true
});


export const useUiStore = <T,>(key: keyof IUiMetadata) => {
    return useStoreState<IUiMetadata,T>(uiStore, key)
}
