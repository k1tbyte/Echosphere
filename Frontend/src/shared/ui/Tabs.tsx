import {AnimatePresence, motion} from "framer-motion";
import React, {ComponentProps, FC, forwardRef, Key, ReactNode, useEffect, useState} from "react";
import {cn} from "@/shared/lib/utils";
import {clsx} from "clsx";

interface ITabProps {
    children: ReactNode,
    title: ReactNode | ((active: boolean) => ReactNode),
}

interface ITabPanelProps {
    children: React.ReactElement<ITabProps> | React.ReactElement<ITabProps>[];
    activeKey: Key;
    className?: string;
    indicator?: ReactNode;
    onTabChange?: (key: Key) => void;
}

interface ITabTitleProps extends ComponentProps<'span'> {

}

export const TabTitle: FC<ITabTitleProps> = ({ children, className }) => {
    return <span className={cn("mx-3", className)}>{children}</span>
}

export const TabPanel: FC<ITabPanelProps> = forwardRef<HTMLDivElement,ITabPanelProps> (
    ({ children, activeKey, className, indicator, onTabChange }, ref) => {
        const [active, setActive] = useState(activeKey);
        const [indicatorId] = useState<string>(`tab-indicator-${Math.random().toString(36).substring(2, 15)}`);
        let renderContent: ReactNode;

        useEffect(() => {
            setActive(activeKey);
        }, [activeKey]);

        const handleTabChange = (key: Key) => {
            setActive(key);
            if (onTabChange) {
                onTabChange(key);
            }
        };

        return (
            <div className="flex-x-center flex-col" ref={ref}>
                <div className="flex-x-center w-full">
                    <div className={cn("border-border border flex-x-center gap-3 mb-5 bg-background p-1 rounded-lg font-medium relative", className)}>
                        {
                            React.Children.map(children, (child) => {
                                let isActive: boolean = false;
                                if (child.key == active) {
                                    renderContent = child;
                                    isActive = true;
                                }
                                return (
                                    <button
                                        key={child.key}
                                        onClick={() => handleTabChange(child.key!)}
                                        className={clsx(
                                            "relative py-1.5  text-sm text-foreground cursor-pointer transition-opacity duration-500 z-10",
                                            { "opacity-50": !isActive }
                                        )}
                                    >
                                        {isActive && (indicator === undefined) && (
                                            <motion.div
                                                layoutId={indicatorId}
                                                style={{borderRadius: 8}}
                                                transition={{type: "spring", duration: 0.4, bounce: 0.3}}
                                                className="absolute inset-0 bg-secondary z-0"
                                            />
                                        )}
                                        <span className="relative z-10">
                                            {typeof child.props.title === 'function' ?
                                                child.props.title(isActive) : child.props.title}
                                        </span>
                                    </button>
                                );
                            })
                        }
                    </div>
                </div>

                <div className="w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active}
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            transition={{duration: 0.2}}
                        >
                            {renderContent}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    });

export const Tab: FC<ITabProps> = ({ children}) => children;