"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader } from "@/shared/ui/Loader";
import EmailVerification from "@/widgets/auth/EmailVerification";
import fetcher from "@/shared/lib/fetcher";
import { auth } from "@/shared/services/authService";
import { signIn } from "next-auth/react";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function VerifyPage() {
    const searchParams = useSearchParams();
    const token = searchParams?.get('token');
    const router = useRouter();
    const [verificationStatus, setVerificationStatus] = useState<{ email?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token || !GUID_REGEX.test(token)) {
            router.replace('/');
            return;
        }

        async function verifyEmail() {
            try {
                const status = await fetcher.noexceptRequest(auth.confirmEmail(token!));
                setVerificationStatus(status!);

                if (status?.accessToken && status?.refreshToken) {
                    await signIn("token-auth", {
                        accessToken: status.accessToken,
                        refreshToken: status.refreshToken,
                        redirect: false,
                    });
                    // After a successful login, you can refresh the page to apply the session
                    router.refresh();
                }
            } catch (error) {
                console.error("Failed to verify email:", error);
                setVerificationStatus(null);
            } finally {
                setIsLoading(false);
            }
        }

        verifyEmail();
    }, [token, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader variant={"wave"} size="lg" color="primary" />
                    <p className="text-muted-foreground animate-pulse">Checking your token...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <EmailVerification verifiedEmail={verificationStatus?.email} />
        </div>
    );
}