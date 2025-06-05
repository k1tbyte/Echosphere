"use client"

import {FC, useEffect, useMemo, useRef, useState} from "react";
import {AlignJustify, ChevronRight, ChevronsRight, ChevronDown} from "lucide-react";
import Link from 'next/link';
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator} from "@/shared/ui/Breadcrumb";
import {usePathname, useRouter} from 'next/navigation';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/shared/ui/DropdownMenu";
import {EIcon } from "@/shared/ui/Icon";
import {IconButton} from "@/shared/ui/Icon/SvgIcon";
import {openSettingsModal} from "@/widgets/settings/SettingsModal";
import {useBreadcrumbs, useSidebar} from "@/store/uiMetaStore";
import {Notifications} from "@/widgets/Notifications";
import {LobbyPanel} from "@/widgets/LobbyPanel";

const MIN_ITEM_WIDTH = 100;
const MIN_VISIBLE_ITEMS = 2;

const formatSegment = (segment: string): string => {
    const withSpaces = segment.replace(/[-_]/g, ' ');
    return withSpaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const TopNavbar: FC = () => {
    const { isSidebarOpen, setSidebarOpen } = useSidebar();
    const { breadcrumbs: breadcrumbsFromStore } = useBreadcrumbs();

    const pathname = usePathname();
    const router = useRouter();

    const containerRef = useRef<HTMLDivElement>(null);
    const [availableWidth, setAvailableWidth] = useState(0);
    const [maxVisibleItems, setMaxVisibleItems] = useState(Infinity);

    const handleToggleMobileMenu = () => {
        setSidebarOpen(isSidebarOpen === null ? true : null);
    };

    const breadcrumbs = useMemo(() => {
        if (!pathname) return [];

        const segments = pathname.split('/').filter(Boolean);
        
        // If this is a video page, don't show URL breadcrumbs
        if (segments[0] === 'video') {
            return breadcrumbsFromStore || [];
        }

        const urlBreadcrumbs = segments.map((segment, index) => {
            const url = `/${segments.slice(0, index + 1).join('/')}`;
            return {
                label: formatSegment(segment),
                href: url,
                active: index === segments.length - 1
            };
        });

        if (urlBreadcrumbs.length === 0) {
            urlBreadcrumbs.push({ label: 'Home', href: '/', active: true });
        }

        const lastUrlIsActive = urlBreadcrumbs.length > 0 && urlBreadcrumbs[urlBreadcrumbs.length - 1].active;
        const combinedBreadcrumbs = [...urlBreadcrumbs];

        if (breadcrumbsFromStore && breadcrumbsFromStore.length > 0) {
            if (lastUrlIsActive) {
                combinedBreadcrumbs[combinedBreadcrumbs.length - 1].active = false;
            }

            breadcrumbsFromStore.forEach((item, i) => {
                combinedBreadcrumbs.push({
                    label: item.label,
                    href: item.href,
                    active: i === breadcrumbsFromStore.length - 1
                });
            });
        }

        return combinedBreadcrumbs;
    }, [pathname, breadcrumbsFromStore]);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries.length) return;

            const containerWidth = entries[0].contentRect.width;
            const menuIconWidth = window.innerWidth < 640 ? 40 : 0;
            const breadcrumbsWidth = containerWidth - menuIconWidth - 20;
            const dropdownWidth = 50;
            const availableForItems = breadcrumbsWidth - (breadcrumbs.length > MIN_VISIBLE_ITEMS ? dropdownWidth : 0);

            const maxItems = Math.max(
                MIN_VISIBLE_ITEMS,
                Math.floor(availableForItems / MIN_ITEM_WIDTH)
            );

            setAvailableWidth(breadcrumbsWidth);
            setMaxVisibleItems(maxItems);
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [breadcrumbs.length]);

    const { visibleItems, hiddenItems } = useMemo(() => {
        if (breadcrumbs.length <= maxVisibleItems) {
            return { visibleItems: breadcrumbs, hiddenItems: [] };
        }

        const firstItem = breadcrumbs[0];
        const lastItem = breadcrumbs[breadcrumbs.length - 1];
        const middleItems = breadcrumbs.slice(1, -1);

        if (maxVisibleItems === MIN_VISIBLE_ITEMS) {
            return {
                visibleItems: [firstItem, lastItem],
                hiddenItems: middleItems
            };
        }

        const additionalVisible = maxVisibleItems - MIN_VISIBLE_ITEMS;
        const visibleMiddleItems = middleItems.slice(-additionalVisible);
        const hiddenMiddleItems = middleItems.slice(0, middleItems.length - additionalVisible);

        return {
            visibleItems: [firstItem, ...visibleMiddleItems, lastItem],
            hiddenItems: hiddenMiddleItems
        };
    }, [breadcrumbs, maxVisibleItems]);

    const handleNavigation = (href: string, e: React.MouseEvent) => {
        e.preventDefault();
        router.push(href);
    };

    const breadcrumbElements = useMemo(() => {
        const elements = [];

        if (hiddenItems.length > 0) {
            elements.push(
                <BreadcrumbItem key="dropdown" className="flex-shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            ...
                            <ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                            {hiddenItems.map((hiddenItem) => (
                                <DropdownMenuItem key={hiddenItem.href} onClick={(e) => handleNavigation(hiddenItem.href, e)}>
                                    {hiddenItem.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </BreadcrumbItem>
            );

            elements.push(
                <BreadcrumbSeparator key="dropdown-separator">
                    <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
            );
        }

        visibleItems.forEach((item, index) => {
            elements.push(
                <BreadcrumbItem key={item.href || `item-${index}`} className="overflow-hidden text-nowrap flex-shrink-0">
                    {item.active ? (
                        <BreadcrumbPage className="truncate max-w-[200px]">
                            {item.label}
                        </BreadcrumbPage>
                    ) : (
                        <Link href={item.href} className="truncate max-w-[200px] text-primary hover:text-primary/80" onClick={(e) => handleNavigation(item.href, e)}>
                            {item.label}
                        </Link>
                    )}
                </BreadcrumbItem>
            );

            if (index < visibleItems.length - 1) {
                elements.push(
                    <BreadcrumbSeparator key={`separator-${index}`}>
                        <ChevronsRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                );
            }
        });

        return elements;
    }, [visibleItems, hiddenItems, handleNavigation]);

    return (
        <div className="bg-background/75 border-border border rounded-sm px-3 py-2 h-10 flex items-center justify-between shrink-0">
            <div
                ref={containerRef}
                className="flex gap-3 items-center overflow-hidden w-full"
            >
                <AlignJustify
                    className="sm:hidden block hover:text-foreground text-foreground/85 transition-colors cursor-pointer flex-shrink-0"
                    onClick={handleToggleMobileMenu}
                />

                <Breadcrumb className="overflow-hidden">
                    <BreadcrumbList className="flex-nowrap overflow-hidden">
                        {breadcrumbElements}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <LobbyPanel/>
            <Notifications/>
            <IconButton className="ml-4" icon={EIcon.Cog} size={18} onClick={openSettingsModal}/>
        </div>
    );
};