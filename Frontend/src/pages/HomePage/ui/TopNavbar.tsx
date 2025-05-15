"use client"

import {FC} from "react";
import {Button} from "@/shared/ui/Button/Button";
import {AlignJustify} from "lucide-react";
import {useUiStore} from "@/store/client";

export const TopNavbar: FC = () => {
    const [isOpen , setIsOpen] = useUiStore<boolean | null>("isSidebarOpen")

    return (
        <div className="bg-background/75 border-border border rounded-sm px-3 py-2 h-10 flex items-center">
            <AlignJustify className="sm:hidden block hover:text-foreground text-foreground/85 transition-colors" onClick={() => {
                setIsOpen(prev => prev === null);
            }}/>
        </div>
    )
}