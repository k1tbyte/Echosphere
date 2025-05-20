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