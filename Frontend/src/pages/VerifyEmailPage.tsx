import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import {Loader} from "@/shared/ui/Loader";
import EmailVerification from "@/widgets/auth/EmailVerification";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function VerifyPage({
                                       searchParams,
                                   }: {
    searchParams: { token?: string };
}) {
    const { token } = searchParams;

    if (!token || !GUID_REGEX.test(token)) {
        redirect('/');
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Suspense fallback={<LoadingState />}>
                <EmailVerification token={token} />
            </Suspense>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <Loader variant={"wave"} size="lg" color="primary" />
            <p className="text-gray-500 animate-pulse">Checking your token...</p>
        </div>
    );
}