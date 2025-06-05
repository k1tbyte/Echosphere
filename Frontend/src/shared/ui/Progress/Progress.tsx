"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import {cn} from "@/shared/lib/utils";

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className,  value, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={cn(
            "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
            className
        )}
        {...props}
    >
        <ProgressPrimitive.Indicator
            className="relative h-full w-full flex-1 bg-primary transition-all"
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        >
            <div className="absolute left-0 w-6 h-full bg-primary-foreground blur-[10px] inset-y-0 progress" />
        </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
