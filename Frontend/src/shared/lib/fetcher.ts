import {toast, ToastVariant} from "@/shared/ui/Toast";
import {isClientSide} from "@/store/client";

type TypeFetcher = {
    postJson: (url: string, data: object) => Promise<Response>;
    noexceptRequest: <T>(Promise: Promise<T>, handleWithPopup?: boolean) => Promise<T | undefined>;
}

const fetcher: TypeFetcher = {
    postJson: async (url: string, data: object) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            if(response.status >= 500 && response.status < 600 && isClientSide) {
                toast.open({ variant: ToastVariant.Error, body: "The server is unavailable" });
            }
            throw new Error(response.status.toString());
        }

        return response;
    },
    noexceptRequest: async <T> (Promise: Promise<T>, handleWithPopup: boolean = false) => {
        try {
            return await Promise;
        } catch (e) {
            if(!isClientSide || !handleWithPopup) {
                return;
            }

            switch(e) {
                case "401":
                    toast.open({ variant: ToastVariant.Error, body: "You are not authorized" });
                    break;
                case "403":
                    toast.open({ variant: ToastVariant.Error, body: "You don't have permission to access this resource" });
                    break;
                case "404":
                    toast.open({ variant: ToastVariant.Error, body: "Resource not found" });
                    break;
                case "429":
                    toast.open({ variant: ToastVariant.Error, body: "Too many requests. Please try again later" });
                    break;
            }
            //ignore
        }
    }
};

export default fetcher;