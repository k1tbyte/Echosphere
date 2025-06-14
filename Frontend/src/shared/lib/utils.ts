import {ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export const debounce = <T extends (...args: any[]) => any>(func: T, delay: number) => {
    let timerId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>): void => {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function toBase64(str: string): string {
    return btoa(new TextEncoder().encode(str).reduce(
        (data, byte) => data + String.fromCharCode(byte), ''
    ));
}

export function isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}