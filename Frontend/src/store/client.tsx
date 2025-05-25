"use client";

import {RxStore, useStoreState} from "@/shared/lib/rxStore";

export const isClientSide = typeof window !== "undefined";

export interface IUiMetadata {
    isSidebarOpen: boolean | null;
    breadcrumbs: string[];
}

export let uiStore: RxStore<IUiMetadata> = new RxStore<IUiMetadata>({
    breadcrumbs: [],
    isSidebarOpen: true
});


export const useUiStore = <T,>(key: keyof IUiMetadata) => {
    return useStoreState<IUiMetadata,T>(uiStore, key)
}
