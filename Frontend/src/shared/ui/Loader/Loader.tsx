import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import styles from './Loader.module.css';
import {cn} from "@/shared/lib/utils";

const loaderVariants = cva(
    'inline-flex',
    {
        variants: {
            variant: {
                dots: 'flex justify-center items-center space-x-2',
                spinner: 'border-4 rounded-full border-t-current border-r-transparent border-b-transparent border-l-transparent',
                pulse: 'rounded-full',
                wave: 'flex justify-center items-end space-x-1',
                circle: 'relative'
            },
            size: {
                none: "",
                sm: 'h-5 w-5',
                md: 'h-8 w-8',
                lg: 'h-12 w-12',
            },
            color: {
                primary: 'text-foreground',
                gray: 'text-gray-400',
            },
        },
        defaultVariants: {
            variant: 'dots',
            size: 'none',
            color: 'primary',
        },
    }
);

export interface LoaderProps extends VariantProps<typeof loaderVariants> {
    className?: string;
}

const DotsLoader = ({ className }: { className?: string }) => (
    <>
        <div className={cn("bg-current rounded-full", styles.dotPulse, className)}></div>
        <div className={cn("bg-current rounded-full", styles.dotPulse, styles.delay200, className)}></div>
        <div className={cn("bg-current rounded-full", styles.dotPulse, styles.delay400, className)}></div>
    </>
);

const WaveLoader = ({ className }: { className?: string }) => (
    <>
        <div className={cn("h-full w-1 bg-current rounded-full", styles.wave, className)}></div>
        <div className={cn("h-full w-1 bg-current rounded-full", styles.wave, styles.delay200, className)}></div>
        <div className={cn("h-full w-1 bg-current rounded-full", styles.wave, styles.delay400, className)}></div>
        <div className={cn("h-full w-1 bg-current rounded-full", styles.wave, styles.delay600, className)}></div>
        <div className={cn("h-full w-1 bg-current rounded-full", styles.wave, styles.delay800, className)}></div>
    </>
);

const CircleLoader = ({ className }: { className?: string }) => (
    <svg className="w-full h-full" viewBox="0 0 50 50">
        <circle
            className="stroke-current opacity-25"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
        />
        <circle
            className={cn("stroke-current", styles.circleLoader, className)}
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
            strokeDasharray="125"
            strokeDashoffset="125"
        />
    </svg>
);

export const Loader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & LoaderProps
>(({ variant, size, color, className, ...props }, ref) => {

    const renderLoader = () => {
        switch (variant) {
            case 'dots':
                return <DotsLoader className={size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'} />;
            case 'pulse':
                return <div className={styles.pulse}></div>;
            case 'spinner':
                return <div className={styles.spinner}></div>;
            case 'wave':
                return <WaveLoader />;
            case 'circle':
                return <CircleLoader />;
            default:
                return <DotsLoader className={size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'} />;
        }
    };

    const loaderClass = loaderVariants({ variant, size, color });
    return (
        <div className={cn(loaderClass, className)} ref={ref} {...props}>
            {renderLoader()}
        </div>
    );
});

Loader.displayName = 'Loader';

export default Loader;