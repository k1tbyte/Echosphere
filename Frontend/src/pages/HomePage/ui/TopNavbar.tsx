"use client"

import {FC} from "react";
import {Button} from "@/shared/ui/Button/Button";
import {AlignJustify} from "lucide-react";
import {useUiStore} from "@/store/client";
import Image from "next/image";
import {useSession} from "next-auth/react";

export const TopNavbar: FC = () => {
    const [isOpen , setIsOpen] = useUiStore<boolean | null>("isSidebarOpen")
    const { data: session, status } = useSession();

    console.log()
    return (
        <div className="bg-background/75 border-border border rounded-sm px-3 py-2 h-10 flex items-center justify-between">
            <div>
                <AlignJustify className="sm:hidden block hover:text-foreground text-foreground/85 transition-colors" onClick={() => {
                    setIsOpen(prev => prev === null);
                }}/>
            </div>
        </div>
    )
}