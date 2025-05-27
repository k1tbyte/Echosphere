"use client"

import React, { ComponentProps, FC, useContext, useEffect, useState } from "react";
import { ChevronLeft, Clapperboard, House, Library, Users } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";
import { cn } from "@/shared/lib/utils";
import { signOut, useSession } from "next-auth/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/shared/ui/DropdownMenu";
import { Loader, Spinner } from "@/shared/ui/Loader";
import { openAccountModal } from "@/widgets/account/AccountModal";
import dynamic from "next/dynamic";
import {Label} from "@/shared/ui/Label";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {useSidebar} from "@/store/uiMetaStore";

const SidebarContext = React.createContext<boolean | null>(false);

interface ISidebarItemProps extends ComponentProps<'div'> {
    children: React.ReactElement;
    text: string;
    href: string;
}

const SidebarItem: FC<ISidebarItemProps> = ({
                                                       children,
                                                       text,
                                                       href,
                                                       className,
                                                       ...props
                                                   }) => {
    const pathname = usePathname();
    const isOpen = useContext(SidebarContext);
    const isActive = pathname?.startsWith(href);

    return (
        <Link href={href} className={cn("flex shrink-0 gap-5 items-center relative px-3 py-2.5 cursor-pointer", className)}>
            {isActive && isOpen !== null &&
                <motion.div layoutId="active-sidebar-item" className="absolute inset-0 bg-foreground rounded-sm mix-blend-exclusion" />
            }
            {children}
            {isOpen &&
                <Label className="pointer-events-none text-[15px]">{text}</Label>
            }
        </Link>
    );
};

// Основной компонент сайдбара
const SidebarComponent: FC<ComponentProps<'div'>> = ({ className, ...props }) => {
    const { data: session, status } = useSession({ required: true });
    const [isLoading, setIsLoading] = useState(false);

    const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();

    const [isPhone, setIsPhone] = useState(false);
    const [isSmall, setIsSmall] = useState(false);

    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsPhone(window.matchMedia("(max-width: 639px)").matches);
            setIsSmall(window.matchMedia("(max-width: 1023px)").matches);
        };

        checkScreenSize();

        window.addEventListener("resize", checkScreenSize);

        if (window.matchMedia("(max-width: 639px)").matches) {
            setSidebarOpen(null); // Hidden on phones
        } else if (window.matchMedia("(max-width: 1023px)").matches) {
            setSidebarOpen(false); // Rolled up on tablets
        } else if (isSidebarOpen === null) {
            // If it was null (from phone), but now desktop is open
            setSidebarOpen(true);
        }

        setTimeout(() => {
            setIsInitialized(true);
        }, 0);

        return () => {
            window.removeEventListener("resize", checkScreenSize);
        };
    }, []);

    useEffect(() => {
        if (isPhone) {
            setSidebarOpen(null); // Hidden on phones
        } else if (isSmall && isSidebarOpen === null) {
            // If it was hidden (on the phone), but now we are on a tablet
            setSidebarOpen(false);
        } else if (!isSmall && !isPhone && isSidebarOpen === null) {
            // If it was hidden, but is now on the desktop
            setSidebarOpen(true);
        }
    }, [isPhone, isSmall]);

    return (
        <div
            className={cn(
                "fixed sm:static left-0 top-0 transition-transform duration-300 z-40",
                {
                    "inset-0": isSidebarOpen && isPhone,
                },
                className
            )}
            {...props}
        >
            {isSidebarOpen && isPhone && (
                <div
                    className="fixed inset-0 bg-background/50 z-0"
                    onClick={() => setSidebarOpen(null)}
                />
            )}

            <div
                className={cn(
                    "overflow-clip sm:overflow-visible flex justify-between flex-col h-full bg-background md:bg-background/75 border border-border rounded-sm relative transition-all",
                    isSidebarOpen ? "w-56" : "w-[70px]",
                    { "w-0 p-0 border-0": isSidebarOpen === null || !isInitialized },
                )}
            >
                <button
                    className={clsx(
                        "hidden sm:block rounded-full p-1 border border-border absolute right-0 top-6 translate-x-1/2 z-10 bg-background cursor-pointer hover:bg-white hover:text-background transition-all",
                        {"rotate-180": !isSidebarOpen}
                    )}
                    onClick={toggleSidebar}
                >
                    <ChevronLeft size={15} />
                </button>

                <div className="gap-3 flex flex-col p-3">
                    <Image
                        draggable={false}
                        src="/images/logo.svg"
                        alt="test"
                        width={120} height={120}
                        className="mx-auto"
                    />

                    <hr className="bg-border -mt-1 mb-1" />
                    <SidebarContext.Provider value={isSidebarOpen}>
                        <SidebarItem text="Home" href="/home">
                            <House />
                        </SidebarItem>
                        <SidebarItem text="Profile" href="/test">
                            <Users />
                        </SidebarItem>
                        <SidebarItem text="Movies" href="/movies">
                            <Clapperboard />
                        </SidebarItem>
                        <SidebarItem text="Libraries" href="/library">
                            <Library />
                        </SidebarItem>
                    </SidebarContext.Provider>
                </div>

                {status === "loading" ? (
                    <div className="flex justify-center items-center h-16 w-full">
                        <Spinner className="mx-auto" />
                    </div>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="p-3 flex gap-3 items-center hover:bg-accent/30 transition-colors rounded-xs cursor-pointer border-t-border border-t overflow-clip">
                                <div className="flex shrink-0 gap-3 items-center">
                                    <Image
                                        src={`https://ui-avatars.com/api/?name=${session?.user.username}.svg`}
                                        alt="Avatar"
                                        width={45}
                                        height={45}
                                        className="rounded border border-border"
                                    />
                                </div>
                                {isSidebarOpen && (
                                    <div className="flex flex-col justify-start min-w-0 flex-1 gap-1">
                                        <Label
                                            variant="filled"
                                            className="p-0.5 px-1 w-fit max-w-full text-ellipsis overflow-hidden whitespace-nowrap cursor-pointer"
                                            size="sm"
                                        >
                                            {session?.user.username}
                                        </Label>
                                        <Label
                                            size={"sm"}
                                            className="text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap max-w-full cursor-pointer"
                                        >
                                            {session?.user.email}
                                        </Label>
                                    </div>
                                )}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={openAccountModal}>
                                    Account
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    Lobby
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    Settings
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={async () => {
                                setIsLoading(true);
                                await signOut({ redirect: true, callbackUrl: "/" });
                            }}>
                                {isLoading ? <Loader className="w-full mx-auto" variant={"dots"} size={"sm"} /> : "Log out"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
};

// Export the component using dynamic to disable SSR
const Sidebar = dynamic(() => Promise.resolve(SidebarComponent), {
    ssr: false
});

export default Sidebar;