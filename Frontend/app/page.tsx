"use client"

import Loader from "@/shared/ui/Loader/Loader";
import { useSession } from "next-auth/react";
import LogoutButton from "@/widgets/auth/LogoutButton";

export default function Home() {
    const { data: session, status } = useSession();
    if (status === "loading") {
        return <div>Loading...</div>;
    }

    if (status === "unauthenticated") {
        return <div>You are not authorized</div>;
    }

    return (
        <div>
            <h1>Profile</h1>
            <p>Hello, {session?.user?.name || 'user'}!</p>
            {session?.user?.avatar && (
                <img
                    src={session.user.avatar}
                    alt="Avatar"
                    width={50}
                    height={50}
                    style={{ borderRadius: '50%' }}
                />
            )}
            <p>ID: {session?.user?.id}</p>
            <LogoutButton/>
        </div>
    );
}
