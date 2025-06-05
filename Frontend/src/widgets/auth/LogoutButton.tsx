"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import {Button} from "@/shared/ui/Button";

export default function LogoutButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        setIsLoading(true);
        await signOut({ redirect: true, callbackUrl: "/" });
    };

    return (
        <Button variant="default"
            onClick={handleLogout}
            loading={isLoading}
        >
            Logout
        </Button>
    );
}