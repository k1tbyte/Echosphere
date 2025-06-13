import {toast, ToastVariant} from "@/shared/ui/Toast";
import {isClientSide} from "@/store/uiMetaStore";
import {getSession} from "next-auth/react";


export const BACKEND_URL = isClientSide ?
    process.env.NEXT_PUBLIC_BACKEND_URL :
    process.env.INTERNAL_BACKEND_URL;

export const API_URL = BACKEND_URL + "/api/v2"

export const IMAGES_URL = "/images-proxy/api/v2"

type TypeFetcher = {
    postJson: (url: string, data: object, props?: RequestInit | null, authorized?: boolean) => Promise<Response>;
    getJson: (url: string, props?: RequestInit | null, authorized?: boolean) => Promise<Response>;
    patchJson: (url: string, data: object, props?: RequestInit | null, authorized?: boolean) => Promise<Response>;
    exceptJson: <T>(Promise: Promise<Response>) => Promise<T>;
}

export const enum ExceptionType {
    NoExcept = 0,
    Code = 2,
    Status
}

export const send = async (url: string, init: RequestInit, authorized?: boolean, noexcept?: ExceptionType | boolean): Promise<Response> => {
    let response;
    try {
        if(authorized) {
            const session = await getSession();
            if (!session || !session.accessToken) {
                throw new Error("Token is not available");
            }
            if (!init.headers) {
                init.headers = {};
            }
            // @ts-ignore
            init.headers['Authorization'] = `Bearer ${session.accessToken}`;
        }
        response = await fetch(url, init);
    } catch (e) {
        if(isClientSide) {
            toast.open({ variant: ToastVariant.Error, body: "Failed to send the request. The server is not responding" });
        }
        throw e;
    }

    if (!response.ok) {
        if(isClientSide) {
            if(response.status >= 500 && response.status < 600) {
                toast.open({ variant: ToastVariant.Error, body: "The server is unavailable" });
            } else if (response.status === 429) {
                toast.open({ variant: ToastVariant.Error, body: "Too many requests. Please try again later" });
            } else if (response.status === 401) {
                toast.open({ variant: ToastVariant.Error, body: "You are not authorized" });
            } else if (response.status === 403) {
                toast.open({ variant: ToastVariant.Error, body: "You don't have permission to access this resource" });
            } else if (response.status === 404) {
                toast.open({ variant: ToastVariant.Error, body: "Resource not found" });
            }
        }

        if(!noexcept || noexcept === ExceptionType.Code) {
            throw new Error(response.status.toString());
        }
        if(noexcept === ExceptionType.Status) {
            throw new Error(await response.text());
        }
    }
    return response;
}

const fetcher: TypeFetcher = {
    postJson: async (url: string, data: object, props?: RequestInit | null, authorized?: boolean) => {
        const headers = props?.headers || {};
        // @ts-ignore
        headers['Content-Type'] = 'application/json';
        return await send(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
            ...props
        }, authorized);
    },
    getJson: async (url: string, props?: RequestInit | null, authorized?: boolean) => {
        const headers = props?.headers || {};
        // @ts-ignore
        headers['Content-Type'] = 'application/json';
         return await send(url, {
            method: 'GET',
            headers: headers,
            ...props
        }, authorized);
    },
    patchJson: async (url: string, data: object, props?: RequestInit | null, authorized?: boolean) => {
        const headers = props?.headers || {};
        // @ts-ignore
        headers['Content-Type'] = 'application/json';
        return await send(url, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(data),
            ...props
        }, authorized, ExceptionType.Status);
    },
    exceptJson: async <T> (Promise: Promise<Response>) => {
        return await (await Promise).json() as T;
    },
};

export default fetcher;