import { create } from 'zustand';
import {IObservable} from "@/shared/lib/observer/IObservable";
import {ReactNode} from "react";

export interface AppNotification {
    id: string;
    title: string;
    message?: string | ReactNode;
    type: 'info' | 'success' | 'error';
    progressCallback?: IObservable<{ percent: number, msg?: string }>
    priority?: number; // Higher number means higher priority
    nonClosable?: boolean; // Whether the notification can be closed by the user
    timestamp: number;
}

export interface NotificationsStore {
    notifications: AppNotification[];
    clearNotifications: () => void;
    addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>, id?:string) => string;
    setNotifications: (notifications: AppNotification[]) => void;
    removeNotification: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
    notifications: [],

    clearNotifications: () => set((state) => ({
        notifications: [
            ...state.notifications.filter(n => n.nonClosable) // Keep non-closable notifications
        ]
    })),
    addNotification: (notification, id?: string) => {
        id = id ? id : notification.id ?? crypto.randomUUID();
        const timestamp = Date.now();
        set((state) => ({
            notifications: [
                ...state.notifications,
                { ...notification, id, timestamp }
            ].sort((a, b) => {
                // @ts-ignore
                return b.priority - a.priority || b.timestamp - a.timestamp;
            })
        }));
        return id;
    },
    setNotifications: (notifications) => {
        set({
            notifications: notifications.sort((a, b) => {
                // @ts-ignore
                return b.priority - a.priority || b.timestamp - a.timestamp;
            })
        });
    },

    removeNotification: (id) => {
        set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
        }));
    },
}));