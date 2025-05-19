"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";

import React, {ComponentProps, FC, useContext, useEffect, useState} from "react";
import {ChevronLeft, Clapperboard, House, Library, Users} from "lucide-react";
import {Label} from "@/shared/ui/Label";
import { motion } from "motion/react";
import Image from "next/image";
import {clsx} from "clsx";
import {useUiStore} from "@/store/client";
import useMediaQuery from "@/shared/hooks/useMediaQuery";
import {cn} from "@/shared/lib/utils";

interface ISidebarItemProps extends ComponentProps<'div'> {
    children: React.ReactElement;
    text: string;
    href: string;
}

const SidebarContext = React.createContext(false);

export const SidebarItem: FC<ISidebarItemProps> = ({children, text, href, className, ...props}) => {
    const pathname = usePathname();
    const isOpen = useContext(SidebarContext);
    const isActive = pathname?.startsWith(href);

    return (
        <Link href={href} className={cn("flex shrink-0 gap-5 items-center relative px-3 py-2.5 cursor-pointer",className)}>
            {isActive && isOpen !== null &&
                <motion.div layoutId="active-sidebar-item" className="absolute inset-0 bg-foreground rounded-sm mix-blend-exclusion"/>
            }
            {children}
            { isOpen &&
                <Label className="pointer-events-none text-[15px]">{text}</Label>
            }
        </Link>
    )
}

export const Sidebar: FC<ComponentProps<'div'>> = ({ className, ...props}) => {
    const [isOpen , setIsOpen] = useUiStore<boolean | null>("isSidebarOpen")
    const isPhone = useMediaQuery(640);
    const isSmall = useMediaQuery(1023);
    useEffect(() => {
        setIsOpen(isPhone ? null : !isSmall);
    },[isPhone, isSmall])


    return (
        <div className={cn("fixed sm:static left-0 top-0", { "inset-0": isOpen && isPhone }, className)} {...props}>

            {
                isOpen && isPhone &&
                <div className="fixed inset-0 bg-background/50 z-0" onClick={() => setIsOpen(null)}></div>
            }

            <div className={cn("overflow-clip sm:overflow-visible flex flex-col gap-3 h-full bg-background md:bg-background/75 p-3 border border-border rounded-sm relative transition-all",
                isOpen ? "w-56" : "w-[70px]", { "w-0 p-0": isOpen === null})} {...props}>

                <button className={clsx("hidden sm:block rounded-full p-1 border border-border absolute right-0 top-6 translate-x-1/2 z-10 bg-background cursor-pointer hover:bg-white hover:text-background transition-all", {"rotate-180": !isOpen  }  )} onClick={() => setIsOpen(prev => !prev)}>
                    <ChevronLeft size={15}/>
                </button>

                <Image
                    draggable={false}
                    src="/logo.svg"
                    alt="test"
                    width={120} height={120}
                    className="mx-auto"
                />

                <hr className="bg-border -mt-1 mb-1"/>
                {/*// @ts-ignore*/}
                <SidebarContext.Provider value={isOpen}>
                    <SidebarItem text="Home" href="/home" className="">
                        <House/>
                    </SidebarItem>
                    <SidebarItem text="Profile" href="/home/test" className="">
                        <Users/>
                    </SidebarItem>
                    <SidebarItem text="Movies" href="/home/movies">
                        <Clapperboard/>
                    </SidebarItem>
                    <SidebarItem text="Libraries" href="/home/library">
                        <Library/>
                    </SidebarItem>
                </SidebarContext.Provider>
            </div>
        </div>
    );
}